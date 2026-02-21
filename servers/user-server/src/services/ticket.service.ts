import { prisma } from "../config/db";
import logger from "../config/logger";
import {
  getDiscountCache,
  getTicketCache,
  setDiscountCache,
  setTicketCache,
} from "../lib/cache";
import { sendEmail } from "../lib/mail";
import { notificationQueue } from "../lib/queues";
import { razorpay } from "../lib/razorpay";
import { trackCTAClickWithEventId } from "../middlewares/analytics.middleware";
import {
  BadRequestError,
  ExternalServiceError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors";

export class TicketService {
  async buyTicket(
    userId: string,
    ticketTypeId: string,
    quantity = 1,
    attendeeData?: any[],
    discountCode?: string,
  ) {
    try {
      // OPTIMIZED: Fetch ticket type with event in a single query
      const ticketType = await prisma.ticketType.findUnique({
        where: { ticketTypeId },
        select: {
          ticketTypeId: true,
          eventId: true,
          name: true,
          price: true,
          discountedPrice: true,
          discountReason: true,
          quantity: true,
          soldCount: true,
          salesCutoff: true,
          platformfee: true,
          platformfeePerc: true,
          event: {
            select: {
              eventId: true,
              title: true,
              date: true,
              time: true,
              location: true,
              listerId: true,
              canBuy: true,
            },
          },
        },
      });

      if (!ticketType || !ticketType.event) {
        throw new NotFoundError("Ticket type or event not found");
      }

      if (!ticketType.event.canBuy) {
        throw new ForbiddenError(
          "Ticket sales are currently disabled for this event",
        );
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
        throw new BadRequestError(
          `Only ${availableQuantity} tickets available`,
        );
      }

      // Validate event timing
      const now = new Date();

      if (event.date && event.time) {
        const eventStart = new Date(`${event.date}T${event.time}:00`);

        const cutoff = new Date(eventStart.getTime() + 24 * 60 * 60 * 1000);

        if (now >= cutoff) {
          throw new BadRequestError(
            "Ticket sales close 1 day after the event starts",
          );
        }
      } else if (event.date) {
        const eventDate = new Date(event.date);

        const cutoff = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);

        if (now >= cutoff) {
          throw new BadRequestError(
            "Ticket sales close 1 day after the event date",
          );
        }
      }

      if (ticketType.salesCutoff && now > new Date(ticketType.salesCutoff)) {
        throw new BadRequestError("Ticket sales have ended");
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
          throw new BadRequestError("Invalid discount code");
        }

        // Validate discount
        if (discount.validFrom && now < discount.validFrom) {
          throw new BadRequestError("This discount code is not yet active");
        }
        if (discount.validTo && now > discount.validTo) {
          throw new BadRequestError("This discount code has expired");
        }
        if (
          discount.maxUses !== null &&
          discount.usesCount >= discount.maxUses
        ) {
          throw new BadRequestError(
            "This discount code has reached its maximum usage limit",
          );
        }
        if (discount.minOrderAmt && basePrice < discount.minOrderAmt) {
          throw new BadRequestError(
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

      // Handle free ticket email and notification AFTER transaction (non-blocking)
      if (isFree) {
        // Send push notification for free ticket
        await notificationQueue.add("send-notification", {
          userId,
          type: "TICKET_PURCHASED",
          title: "Ticket Confirmed!",
          body: `Your free ticket for ${event.title} has been confirmed.`,
          link: `/tickets/${ticket.ticketId}`,
          metadata: {
            eventId: ticketType.eventId,
            ticketId: ticket.ticketId,
          },
        });

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
                  companyName: true,
                  InstagramLink: true,
                  FacebookLink: true,
                  XLink: true,
                  website: true,
                  contactEmail: true,
                  contactPhone: true,
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
                      CompanyName: listerData?.companyName,
                      instagramLink: listerData?.InstagramLink,
                      facebookLink: listerData?.FacebookLink,
                      xLink: listerData?.XLink,
                      website: listerData?.website,
                      contactPhone: listerData?.contactPhone || null,
                      contactEmail: listerData?.contactEmail || null,
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
        throw new NotFoundError("Lister profile not found");
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
          throw new ForbiddenError("Event not found or access denied");
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

      // OPTIMIZED: Single query with all relations instead of 4 separate queries
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
          ticketType: {
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
          },
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          AttendeeFieldResponse: {
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
          },
          TicketScanLog: {
            select: {
              scanId: true,
              scannedAt: true,
              deviceInfo: true,
            },
            orderBy: { scannedAt: "desc" },
            take: 5,
          },
        },
      });

      if (!ticket) {
        throw new NotFoundError("Ticket not found");
      }

      // Check ownership
      if (userId && ticket.userId !== userId) {
        throw new ForbiddenError("Unauthorized access to ticket");
      }

      // Cache the result
      setTicketCache(ticketId, ticket).catch(() =>
        logger.warn(`Error caching the Ticket:${ticketId}`),
      );

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
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Use custom prefix if available, otherwise generate from event title
        let prefix = ticketType.ticketPrefix;

        if (!prefix) {
          // Use event title from ticketType.event (already loaded in the main query)
          if (ticketType.event?.title) {
            const title = ticketType.event.title.trim();

            // Extract initials from event title
            const initials = title
              .split(" ")
              .map((word: string) => word.charAt(0).toUpperCase())
              .join("")
              .replace(/[^A-Z0-9]/g, ""); // Remove non-alphanumeric characters

            // If initials are short (< 4 chars), use TKT-XXX format for better tracking
            // Examples: "HANGOVER" -> "TKT-HAN", "DJ Night" -> "TKT-DJN"
            if (initials.length < 4) {
              // Take first 3 letters from the title (removing spaces and special chars)
              const cleanTitle = title
                .replace(/[^A-Za-z0-9]/g, "")
                .toUpperCase()
                .substring(0, 3);

              prefix = cleanTitle.length >= 3 ? `TKT-${cleanTitle}` : "TKT";
            } else {
              // For longer initials, use them directly (limit to 6 chars)
              // Examples: "Code Caravan 3.0" -> "CC30"
              prefix = initials.substring(0, 6);
            }
          }

          // Fallback if no event found or title is empty
          if (!prefix || prefix.length < 2) {
            prefix = "TKT";
          }
        }

        // Add event ID suffix to ensure uniqueness across events with same name
        // Take last 4 chars of event UUID for brevity
        const eventIdSuffix = ticketType.eventId.slice(-4).toUpperCase();

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
        // Format: PREFIX-EVENTID-NUMBER
        // Examples:
        // - "Ragnarok" Event 1 -> TKT-RAG-A1B2-001
        // - "Ragnarok" Event 2 -> TKT-RAG-C3D4-001
        // - "Code Caravan 3.0" -> CC30-E5F6-001
        const qrCode = `${prefix}-${eventIdSuffix}-${formattedNumber}`;

        // Verify uniqueness (should be guaranteed by counter + eventId, but double-check)
        const existingTicket = await tx.ticket.findUnique({
          where: { qrCode },
          select: { ticketId: true },
        });

        if (!existingTicket) {
          return qrCode;
        }

        // If collision detected (extremely rare), retry
        logger.warn(
          `QR code collision detected: ${qrCode}. Retrying... (attempt ${attempt + 1}/${maxRetries})`,
        );
        attempt++;
      } catch (error) {
        logger.error(
          `Error generating ticket ID (attempt ${attempt + 1}/${maxRetries}):`,
          error,
        );
        attempt++;

        if (attempt >= maxRetries) {
          throw new ExternalServiceError(
            "Failed to generate unique ticket ID after multiple attempts",
          );
        }
      }
    }

    throw new Error("Failed to generate unique ticket ID");
  }
}
