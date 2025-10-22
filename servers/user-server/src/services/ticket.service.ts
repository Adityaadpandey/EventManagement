import { prisma } from "../config/db";
import logger from "../config/logger";
import { razorpay } from "../lib/razorpay";

export class TicketService {
  async buyTicket(
    userId: string,
    ticketTypeId: string,
    quantity = 1,
    attendeeData?: any[],
    discountCode?: string,
  ) {
    try {
      // Fetch ticket type and event details
      const ticketType = await prisma.ticketType.findUnique({
        where: { ticketTypeId },
        include: {
          event: {
            include: {
              CustomField: true,
            },
          },
        },
      });

      if (!ticketType) {
        return { error: "Ticket type not found" };
      }

      // Ensure event is approved
      // if (ticketType.event.status !== "APPROVED") {
      //   return { error: "Event is not available for ticket purchase" };
      // }

      // Check availability
      const availableQuantity = ticketType.quantity - ticketType.soldCount;
      if (availableQuantity < quantity) {
        return { error: `Only ${availableQuantity} tickets available` };
      }

      // Check sales cutoff
      if (ticketType.salesCutoff && new Date() > ticketType.salesCutoff) {
        return { error: "Ticket sales have ended" };
      }

      // Use discounted price if available, otherwise use regular price
      const effectivePrice = ticketType.discountedPrice ?? ticketType.price;
      const originalPrice = ticketType.price;
      const hasTicketTypeDiscount = ticketType.discountedPrice !== null;

      // Calculate base price using effective price
      let basePrice = effectivePrice * quantity;
      let finalPrice = basePrice;
      let discountCodeId: string | null = null;
      let discountAmount = 0;
      let discountDetails: any = null;

      // Validate and apply discount code if provided
      if (discountCode && discountCode.trim() !== "") {
        const discount = await prisma.discountCode.findFirst({
          where: {
            code: discountCode.toUpperCase(),
            eventId: ticketType.eventId,
          },
        });

        if (!discount) {
          return { error: "Invalid discount code" };
        }

        const now = new Date();

        // Check if discount is active
        if (discount.validFrom && now < discount.validFrom) {
          return { error: "This discount code is not yet active" };
        }

        if (discount.validTo && now > discount.validTo) {
          return { error: "This discount code has expired" };
        }

        // Check max uses
        if (
          discount.maxUses !== null &&
          discount.usesCount >= discount.maxUses
        ) {
          return {
            error: "This discount code has reached its maximum usage limit",
          };
        }

        // Check minimum order amount
        if (discount.minOrderAmt && basePrice < discount.minOrderAmt) {
          return {
            error: `Minimum order amount of ₹${discount.minOrderAmt} required to use this discount code`,
          };
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
        finalPrice = Math.max(0, basePrice - discountAmount);

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

      const qrCode = this.generateQRCode();

      // Determine payment status
      const isFree = finalPrice === 0;
      const ticketStatus = isFree ? "SUCCESS" : "PENDING";

      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Create ticket
        const ticket = await tx.ticket.create({
          data: {
            ticketTypeId,
            userId,
            quantity,
            totalPrice: finalPrice,
            qrCode,
            status: ticketStatus,
            eventEventId: ticketType.eventId,
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
        await tx.ticketType.update({
          where: { ticketTypeId },
          data: {
            soldCount: { increment: quantity },
          },
        });

        // If free ticket, also update event analytics
        if (isFree) {
          await tx.event.update({
            where: { eventId: ticketType.eventId },
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
        finalPrice,
        savings: originalPrice * quantity - finalPrice,
      };

      // If ticket is free, return success directly
      if (isFree) {
        return {
          data: {
            ticket: result,
            event: ticketType.event,
            message: "Free ticket issued successfully",
            pricing: pricingBreakdown,
          },
        };
      }

      // Create Razorpay order for paid tickets
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(finalPrice * 100), // in paise, rounded to avoid decimal issues
        currency: "INR",
        receipt: result.ticketId,
        notes: {
          ticketId: result.ticketId,
          eventId: ticketType.eventId,
          userId,
          discountCode: discountCode || null,
          discountAmount: discountAmount.toString(),
          hasTicketTypeDiscount: hasTicketTypeDiscount.toString(),
        },
      });

      return {
        data: {
          ticket: result,
          razorpayOrder,
          event: ticketType.event,
          pricing: pricingBreakdown,
        },
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

      return { data: tickets };
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
          return { error: "Event not found or access denied" };
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

      return { data: tickets };
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

      return { data: tickets };
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
        return { error: "Ticket not found" };
      }

      return { data: ticket };
    } catch (error) {
      logger.error("Error fetching ticket details:", error);
      throw error;
    }
  }

  private generateQRCode(): string {
    // Generate a unique QR code string
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 15);
    return `TICKET_${timestamp}_${random}`;
  }
}
