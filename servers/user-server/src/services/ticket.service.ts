import { prisma } from "../config/db";
import logger from "../config/logger";
import {
  getDiscountCache,
  getTicketCache,
  setDiscountCache,
  setTicketCache,
} from "../lib/cache";
import { sendEmail } from "../lib/mail";
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
      // Fetch ticket type with event in a single query (optimized)
      const ticketType = await prisma.ticketType.findUnique({
        where: { ticketTypeId },
        include: {
          event: {
            select: {
              eventId: true,
              title: true,
              date: true,
              time: true,
              location: true,
              listerId: true,
            },
          },
        },
      });

      if (!ticketType || !ticketType.event) {
        throw new Error("Ticket type or event not found");
      }

      const event = ticketType.event;

      setImmediate(() => {
        trackCTAClickWithEventId(ticketType.eventId, userId, {
          ticketTypeId,
          quantity,
        });
      });

      // Check availability
      const availableQuantity = ticketType.quantity - ticketType.soldCount;
      if (availableQuantity < quantity) {
        throw new Error(`Only ${availableQuantity} tickets available`);
      }

      // Validate event timing
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
      if (ticketType.salesCutoff && now > ticketType.salesCutoff) {
        throw new Error("Ticket sales have ended");
      }

      // Calculate pricing
      const effectivePrice = ticketType.discountedPrice ?? ticketType.price;
      const originalPrice = ticketType.price;
      const hasTicketTypeDiscount = ticketType.discountedPrice !== null;
      let basePrice = effectivePrice * quantity;
      let ticketSubtotal = basePrice;
      let discountCodeId: string | null = null;
      let discountAmount = 0;
      let discountDetails: any = null;
      let appliedDiscount: any = null;

      // Validate and apply discount code if provided (optimized with parallel cache)
      if (discountCode && discountCode.trim() !== "") {
        const discountCodeUpper = discountCode.toUpperCase();

        // Try cache first
        let discount: any = await getDiscountCache(
          discountCodeUpper,
          event.eventId,
        );

        // If not in cache, fetch from DB
        if (!discount) {
          discount = await prisma.discountCode.findFirst({
            where: {
              code: discountCodeUpper,
              eventId: ticketType.eventId,
            },
          });

          // Cache asynchronously (fire and forget)
          if (discount) {
            setDiscountCache(discountCodeUpper, event.eventId, discount).catch(
              () => {
                logger.warn(
                  `Failed to cache discount code: ${discountCodeUpper}`,
                );
              },
            );
          }
        }

        if (!discount) {
          throw new Error("Invalid discount code");
        }

        // Validate discount
        if (discount.validFrom && now < discount.validFrom) {
          throw new Error("This discount code is not yet active");
        }
        if (discount.validTo && now > discount.validTo) {
          throw new Error("This discount code has expired");
        }
        if (
          discount.maxUses !== null &&
          discount.usesCount >= discount.maxUses
        ) {
          throw new Error(
            "This discount code has reached its maximum usage limit",
          );
        }
        if (discount.minOrderAmt && basePrice < discount.minOrderAmt) {
          throw new Error(
            `Minimum order amount of ₹${discount.minOrderAmt} required to use this discount code`,
          );
        }

        // Calculate discount
        if (discount.discountType === "PERCENTAGE" && discount.discountPct) {
          discountAmount = (basePrice * discount.discountPct) / 100;
          if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
            discountAmount = discount.maxDiscount;
          }
        } else if (discount.discountType === "FLAT" && discount.discountAmt) {
          discountAmount = discount.discountAmt;
        }

        discountAmount = Math.min(discountAmount, basePrice);
        ticketSubtotal = Math.max(0, basePrice - discountAmount);
        discountCodeId = discount.codeId;
        appliedDiscount = discount;
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

      // Calculate final pricing
      const platformFee = ticketType.platformfee * quantity;
      const finalPrice = ticketSubtotal + platformFee;
      const isFree = finalPrice === 0;
      const ticketStatus = isFree ? "SUCCESS" : "PENDING";

      // Prepare pricing breakdown early
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

      // Use transaction for atomic operations
      const ticket = await prisma.$transaction(async (tx) => {
        // Generate ticket ID inside transaction
        const qrCode = await this.generateTicketIdInTransaction(tx, ticketType);

        // Create ticket
        const newTicket = await tx.ticket.create({
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

        // Create attendee responses if provided
        if (attendeeData && attendeeData.length > 0) {
          await tx.attendeeFieldResponse.createMany({
            data: attendeeData.map((response) => ({
              ticketId: newTicket.ticketId,
              fieldId: response.fieldId,
              value: response.value,
            })),
          });
        }

        // Update discount code usage if applied
        if (discountCodeId && appliedDiscount) {
          const updatedDiscount = await tx.discountCode.update({
            where: { codeId: discountCodeId },
            data: { usesCount: { increment: 1 } },
          });

          // Update cache asynchronously (fire and forget)
          setDiscountCache(
            appliedDiscount.code.toUpperCase(),
            event.eventId,
            updatedDiscount,
          ).catch(() => {
            logger.warn(
              `Discount cache update failed for ticket: ${newTicket.ticketId}`,
            );
          });
        }

        // Update sold count and analytics for free tickets
        if (isFree) {
          await Promise.all([
            tx.ticketType.update({
              where: { ticketTypeId },
              data: { soldCount: { increment: quantity } },
            }),
            tx.eventAnalytics.update({
              where: { eventId: ticketType.eventId },
              data: {
                ticketsSold: { increment: quantity },
                revenue: { increment: 0 },
              },
            }),
          ]);
        }

        return newTicket;
      });

      // Handle free ticket email AFTER transaction (non-blocking)
      if (isFree) {
        // Send email asynchronously without waiting
        setImmediate(async () => {
          try {
            const [userData, listerData] = await Promise.all([
              prisma.user.findUnique({
                where: { userId },
                select: { email: true, name: true },
              }),
              prisma.lister.findUnique({
                where: { listerId: event.listerId },
                select: {
                  InstagramLink: true,
                  FacebookLink: true,
                  XLink: true,
                  website: true,
                  user: { select: { email: true } },
                },
              }),
            ]);

            if (userData?.email) {
              await sendEmail(
                userData.email,
                `Your Ticket for ${event.title}`,
                {
                  type: "ticket",
                  content: {
                    ticket: {
                      ticketQR: ticket.qrCode,
                      ticketId: ticket.ticketId,
                      eventName: event.title,
                      seatNumber: ticket.qrCode,
                      date: event.date.toISOString().split("T")[0],
                      venue: event.location,
                      InstagramLink: listerData?.InstagramLink,
                      FacebookLink: listerData?.FacebookLink,
                      XLink: listerData?.XLink,
                      website: listerData?.website,
                      email: listerData?.user?.email,
                    },
                  },
                },
                userData.name || "Valued Customer",
              );
              logger.info(
                `Ticket email sent to ${userData.email} for ticket ${ticket.ticketId}`,
              );
            }
          } catch (emailError) {
            logger.error(
              "Error sending ticket confirmation email:",
              emailError,
            );
          }
        });

        return {
          ticket,
          event,
          message: "Free ticket issued successfully",
          pricing: pricingBreakdown,
        };
      }

      // Create Razorpay order for paid tickets
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(finalPrice * 100),
        currency: "INR",
        receipt: ticket.ticketId,
        notes: {
          ticketId: ticket.ticketId,
          eventId: ticketType.eventId,
          userId,
          discountCode: discountCode || null,
          discountAmount: discountAmount.toString(),
          hasTicketTypeDiscount: hasTicketTypeDiscount.toString(),
          platformFee: platformFee.toString(),
        },
      });

      return {
        ticket,
        razorpayOrder,
        event,
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
      const Cachedticket = await getTicketCache(ticketId);
      if (Cachedticket) {
        return Cachedticket;
      }

      const ticket = await prisma.ticket.findUnique({
        where: { ticketId },
        select: {
          ticketId: true,
          ticketTypeId: true,
          userId: true,
          quantity: true,
          totalPrice: true,
          qrCode: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          eventEventId: true,
        },
      });

      if (!ticket) {
        throw new Error("Ticket not found");
      }

      // Check ownership before fetching additional data
      if (userId && ticket.userId !== userId) {
        throw new Error("Unauthorized access to ticket");
      }

      // Step 2: Fire all related queries in parallel
      const [ticketType, user, attendeeResponses, scanLogs] = await Promise.all(
        [
          // Query 1: Ticket type with event
          prisma.ticketType.findUnique({
            where: { ticketTypeId: ticket.ticketTypeId },
            select: {
              ticketTypeId: true,
              name: true,
              description: true,
              price: true,
              discountedPrice: true,
              event: {
                select: {
                  eventId: true,
                  title: true,
                  description: true,
                  date: true,
                  time: true,
                  location: true,
                  banner_square: true,
                  banner_horizontal: true,
                  banner_vertical: true,
                  listerId: true,
                  status: true,
                },
              },
            },
          }),

          // Query 2: User info
          prisma.user.findUnique({
            where: { userId: ticket.userId },
            select: {
              name: true,
              email: true,
              phone: true,
            },
          }),

          // Query 3: Attendee field responses
          prisma.attendeeFieldResponse.findMany({
            where: { ticketId: ticket.ticketId },
            select: {
              responseId: true,
              value: true,
              createdAt: true,
              field: {
                select: {
                  fieldId: true,
                  label: true,
                  fieldType: true,
                  required: true,
                  options: true,
                },
              },
            },
          }),

          // Query 4: Recent scan logs
          prisma.ticketScanLog.findMany({
            where: { ticketId: ticket.ticketId },
            select: {
              scanId: true,
              scannedAt: true,
              deviceInfo: true,
            },
            orderBy: { scannedAt: "desc" },
            take: 5,
          }),
        ],
      );

      setTicketCache(ticketId, {
        ...ticket,
        ticketType,
        user,
        AttendeeFieldResponse: attendeeResponses,
        TicketScanLog: scanLogs,
      }).catch(() => logger.warn(`Error caching the Ticket:${ticketId}`));

      // Step 3: Combine all data into final response
      return {
        ...ticket,
        ticketType,
        user,
        AttendeeFieldResponse: attendeeResponses,
        TicketScanLog: scanLogs,
      };
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
