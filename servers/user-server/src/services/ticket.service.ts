import { prisma } from "../config/db";
import logger from "../config/logger";
import { razorpay } from "../lib/razorpay";
import { trackCTAClickWithEventId } from "../middlewares/analytics.middleware";

export class TicketService {
  async buyTicket(
    userId: string,
    ticketTypeId: string,
    quantity = 1,
    attendeeData?: any[],
    discountCode?: string,
  ) {
    try {
      // Fetch only essential ticket type data (ultra-minimal query)
      const ticketType = await prisma.ticketType.findUnique({
        where: { ticketTypeId },
      });

      if (!ticketType) {
        throw new Error("Ticket type not found");
      }

      // Fetch event data separately
      const event = await prisma.event.findUnique({
        where: { eventId: ticketType.eventId },
        select: {
          eventId: true,
          title: true,
          date: true,
          time: true,
          location: true,
        },
      });

      if (!event) {
        throw new Error("Event not found");
      }

      // Combine the data
      const ticketTypeWithEvent = {
        ...ticketType,
        event,
      };

      // Track CTA click (fire and forget - completely non-blocking)
      setImmediate(() => {
        trackCTAClickWithEventId(ticketType.eventId, userId, {
          ticketTypeId,
          quantity,
        });
      });

      // Check availability
      const availableQuantity =
        ticketTypeWithEvent.quantity - ticketTypeWithEvent.soldCount;
      if (availableQuantity < quantity) {
        throw new Error(`Only ${availableQuantity} tickets available`);
      }
      const now = new Date();

      if (event.date && event.time) {
        const eventStart = new Date(event.time);

        if (now >= eventStart) {
          throw new Error(
            "Ticket sales have closed because the event has already started",
          );
        }
      } else if (event.date) {
        const eventDate = new Date(event.date);
        if (now >= eventDate) {
          throw new Error(
            "Ticket sales have closed because the event has already started",
          );
        }
      }

      // Check sales cutoff
      if (
        ticketTypeWithEvent.salesCutoff &&
        new Date() > ticketTypeWithEvent.salesCutoff
      ) {
        throw new Error("Ticket sales have ended");
      }

      // Use discounted price if available, otherwise use regular price
      const effectivePrice =
        ticketTypeWithEvent.discountedPrice ?? ticketTypeWithEvent.price;
      const originalPrice = ticketTypeWithEvent.price;
      const hasTicketTypeDiscount =
        ticketTypeWithEvent.discountedPrice !== null;

      // Calculate base price using effective price
      let basePrice = effectivePrice * quantity;
      let ticketSubtotal = basePrice;
      let discountCodeId: string | null = null;
      let discountAmount = 0;
      let discountDetails: any = null;

      // Validate and apply discount code if provided
      if (discountCode && discountCode.trim() !== "") {
        const discount = await prisma.discountCode.findFirst({
          where: {
            code: discountCode.toUpperCase(),
            eventId: ticketTypeWithEvent.eventId,
          },
        });

        if (!discount) {
          throw new Error("Invalid discount code");
        }

        const now = new Date();

        // Check if discount is active
        if (discount.validFrom && now < discount.validFrom) {
          throw new Error("This discount code is not yet active");
        }

        if (discount.validTo && now > discount.validTo) {
          throw new Error("This discount code has expired");
        }

        // Check max uses
        if (
          discount.maxUses !== null &&
          discount.usesCount >= discount.maxUses
        ) {
          throw new Error(
            "This discount code has reached its maximum usage limit",
          );
        }

        // Check minimum order amount
        if (discount.minOrderAmt && basePrice < discount.minOrderAmt) {
          throw new Error(
            `Minimum order amount of ₹${discount.minOrderAmt} required to use this discount code`,
          );
        }

        // Calculate discount based on type
        if (discount.discountType === "PERCENTAGE" && discount.discountPct) {
          discountAmount = (basePrice * discount.discountPct) / 100;

          // Apply max discount cap if specified
          if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
            discountAmount = discount.maxDiscount;
          }
        } else if (discount.discountType === "FLAT" && discount.discountAmt) {
          discountAmount = discount.discountAmt;
        }

        // Ensure discount doesn't exceed base price
        discountAmount = Math.min(discountAmount, basePrice);
        ticketSubtotal = Math.max(0, basePrice - discountAmount);

        discountCodeId = discount.codeId;
        discountDetails = {
          code: discount.code,
          type: discount.discountType,
          value:
            discount.discountType === "PERCENTAGE"
              ? discount.discountPct
              : discount.discountAmt,
          maxDiscount: discount.maxDiscount,
          amountSaved: discountAmount,
        };
      }

      // Get platform fee from ticket type (applied once to the total order)
      const platformFee = ticketTypeWithEvent.platformfee * quantity;

      // Calculate final price including platform fee
      const finalPrice = ticketSubtotal + platformFee;

      // Determine payment status
      const isFree = finalPrice === 0;
      const ticketStatus = isFree ? "SUCCESS" : "PENDING";

      // Use transaction to ensure atomicity (including ticket ID generation)
      const result = await prisma.$transaction(async (tx) => {
        // Generate ticket ID inside transaction for better performance
        const qrCode = await this.generateTicketIdInTransaction(
          tx,
          ticketTypeWithEvent,
        );
        // Create ticket
        const ticket = await tx.ticket.create({
          data: {
            ticketTypeId,
            userId,
            quantity,
            totalPrice: finalPrice,
            qrCode,
            status: ticketStatus,
            eventEventId: ticketTypeWithEvent.eventId,
          },
        });

        // Store attendee custom field responses if provided
        if (attendeeData && attendeeData.length > 0) {
          const responses = attendeeData.map((response) => ({
            ticketId: ticket.ticketId,
            fieldId: response.fieldId,
            value: response.value,
          }));
          await tx.attendeeFieldResponse.createMany({
            data: responses,
          });
        }

        // Increment discount code usage if applied
        if (discountCodeId) {
          await tx.discountCode.update({
            where: { codeId: discountCodeId },
            data: {
              usesCount: { increment: 1 },
            },
          });
        }

        // Update ticket type sold count
        // If free ticket, also update event analytics
        if (isFree) {
          await tx.ticketType.update({
            where: { ticketTypeId },
            data: { soldCount: { increment: quantity } },
          });
          await tx.eventAnalytics.update({
            where: { eventId: ticketTypeWithEvent.eventId },
            data: {
              ticketsSold: { increment: quantity },
              revenue: { increment: 0 },
            },
          });
        }

        return ticket;
      });

      // Prepare pricing breakdown
      const pricingBreakdown = {
        originalPrice: originalPrice * quantity,
        ticketTypeDiscount: hasTicketTypeDiscount
          ? {
              reason: ticketType.discountReason || "Special discount",
              amountSaved: (originalPrice - effectivePrice) * quantity,
            }
          : null,
        basePrice,
        discountCode: discountDetails,
        discountCodeAmount: discountAmount,
        ticketSubtotal,
        platformFee,
        finalPrice,
        savings: originalPrice * quantity - finalPrice,
      };

      // If ticket is free, return success directly
      if (isFree) {
        return {
          ticket: result,
          event: event,
          message: "Free ticket issued successfully",
          pricing: pricingBreakdown,
        };
      }

      // Create Razorpay order for paid tickets
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(finalPrice * 100), // in paise, rounded to avoid decimal issues
        currency: "INR",
        receipt: result.ticketId,
        notes: {
          ticketId: result.ticketId,
          eventId: ticketTypeWithEvent.eventId,
          userId,
          discountCode: discountCode || null,
          discountAmount: discountAmount.toString(),
          hasTicketTypeDiscount: hasTicketTypeDiscount.toString(),
          platformFee: platformFee.toString(),
        },
      });

      return {
        ticket: result,
        razorpayOrder,
        event: event,
        pricing: pricingBreakdown,
      };
    } catch (error) {
      logger.error("Error buying ticket:", error);
      throw error;
    }
  }

  async getUserTickets(userId: string) {
    try {
      const tickets = await prisma.ticket.findMany({
        where: {
          userId,
          status: "SUCCESS", // Only show successful tickets
        },
        include: {
          ticketType: {
            include: {
              event: {
                select: {
                  title: true,
                  description: true,
                  date: true,
                  time: true,
                  location: true,
                  banner_square: true,
                },
              },
            },
          },
          AttendeeFieldResponse: {
            include: {
              field: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return tickets;
    } catch (error) {
      logger.error("Error fetching user tickets:", error);
      throw error;
    }
  }

  async getTicketBuyersForEvent(eventId: string, userId: string) {
    try {
      const lister = await prisma.lister.findUnique({
        where: { userId },
      });

      if (!lister) {
        throw new Error("Lister profile not found");
      }

      const listerId = lister.listerId;

      // If listerId provided, verify the lister owns this event
      if (listerId) {
        const event = await prisma.event.findFirst({
          where: {
            eventId,
            listerId,
          },
        });

        if (!event) {
          throw new Error("Event not found or access denied");
        }
      }

      const tickets = await prisma.ticket.findMany({
        where: {
          Event: {
            eventId,
          },
          status: "SUCCESS",
        },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          ticketType: {
            select: {
              name: true,
              price: true,
            },
          },
          AttendeeFieldResponse: {
            include: {
              field: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return tickets;
    } catch (error) {
      logger.error("Error fetching ticket buyers:", error);
      throw error;
    }
  }

  async getAllTicketBuyers() {
    try {
      const tickets = await prisma.ticket.findMany({
        where: {
          status: "SUCCESS",
        },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          ticketType: {
            select: {
              name: true,
              price: true,
            },
          },
          Event: {
            select: {
              eventId: true,
              title: true,
              date: true,
              location: true,
            },
          },
          AttendeeFieldResponse: {
            include: {
              field: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return tickets;
    } catch (error) {
      logger.error("Error fetching all ticket buyers:", error);
      throw error;
    }
  }

  async getTicketDetails(ticketId: string, userId?: string) {
    try {
      const whereClause: any = { ticketId };

      // If userId provided, ensure user owns the ticket
      if (userId) {
        whereClause.userId = userId;
      }

      const ticket = await prisma.ticket.findUnique({
        where: whereClause,
        include: {
          ticketType: {
            include: {
              event: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          AttendeeFieldResponse: {
            include: {
              field: true,
            },
          },
          TicketScanLog: {
            orderBy: { scannedAt: "desc" },
            take: 5,
          },
        },
      });

      if (!ticket) {
        throw new Error("Ticket not found");
      }

      return ticket;
    } catch (error) {
      logger.error("Error fetching ticket details:", error);
      throw error;
    }
  }

  private async generateTicketIdInTransaction(
    tx: any,
    ticketType: any,
  ): Promise<string> {
    // Use custom prefix if available, otherwise generate from event title
    let prefix = ticketType.ticketPrefix;

    if (!prefix) {
      // Use event title from ticketType.event (already loaded in the main query)
      if (ticketType.event?.title) {
        // Extract initials from event title (e.g., "Code Caravan 3.0" -> "CC30")
        prefix = ticketType.event.title
          .split(" ")
          .map((word: string) => word.charAt(0).toUpperCase())
          .join("")
          .replace(/[^A-Z0-9]/g, "") // Remove non-alphanumeric characters
          .substring(0, 6); // Limit to 6 characters
      }

      // Fallback if no event found or title is empty
      if (!prefix || prefix.length < 2) {
        prefix = "TKT";
      }
    }

    // Ultra-fast sequential numbering using Event table counter
    const updatedEvent = await tx.event.update({
      where: { eventId: ticketType.eventId },
      data: {
        ticketCounter: { increment: 1 },
      },
      select: { ticketCounter: true },
    });

    const ticketNumber = updatedEvent.ticketCounter;
    const formattedNumber = ticketNumber.toString().padStart(3, "0");
    const ticketId = `${prefix}${formattedNumber}`;

    // Format: PREFIX + SEQUENTIAL_NUMBER
    // Examples: CC3001, CC3002, CC3003, HDN001, HDN002
    return ticketId;
  }
}
