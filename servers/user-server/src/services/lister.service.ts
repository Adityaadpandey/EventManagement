import { prisma } from "../config/db";
import logger from "../config/logger";
import { invalidateUserSessions, setCachedUser } from "../lib/redis-fn";

export class ListerServer {
  async applyForLister(
    userId: string,
    listerData: { companyName: string; companyLogo?: string; bio: string },
  ) {
    try {
      // Check if the user exists and is not already a lister
      const existingUser = await prisma.user.findUnique({
        where: { userId },
        include: {
          Lister: true,
        },
      });

      if (!existingUser) {
        throw new Error("User not found.");
      }

      if (existingUser.Lister) {
        throw new Error("User is already a lister.");
      }

      // Create new lister
      const lister = await prisma.lister.create({
        data: {
          userId,
          companyName: listerData.companyName,
          companyLogo: listerData.companyLogo,
          bio: listerData.bio,
          status: "COMPLETED",
        },
        select: {
          listerId: true,
          userId: true,
          companyName: true,
          companyLogo: true,
          bio: true,
          status: true,
          createdAt: true,
        },
      });

      const _ = await prisma.user.update({
        where: { userId },
        data: {
          role: "LISTER",
        },
      });
      await setCachedUser(userId, {
        ...existingUser,
        role: "LISTER",
      });

      return lister;
    } catch (error) {
      logger.error("Error in applyForLister:", error);
      throw error;
    }
  }

  async meLister(userId: string) {
    try {
      const lister = await prisma.lister.findUnique({
        where: {
          userId: userId,
        },
        select: {
          listerId: true,
          companyName: true,
          companyLogo: true,
          bio: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          Event: {
            select: {
              eventId: true,
              title: true,
              date: true,
              banner_horizontal: true,
              banner_vertical: true,
              banner_square: true,
              status: true,
              Ticket: {
                where: { status: "SUCCESS" },
                select: {
                  quantity: true,
                  totalPrice: true,
                  ticketType: {
                    select: {
                      platformfee: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          user: {
            select: {
              userId: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              role: true,
              profileComplete: true,
              createdAt: true,
            },
          },
        },
      });

      if (!lister) {
        throw new Error("Lister not found for given userId");
      }

      // Calculate real-time analytics
      let totalRevenue = 0;
      let totalTicketsSold = 0;

      lister.Event.forEach((event) => {
        const eventTicketsSold = event.Ticket.reduce(
          (sum, ticket) => sum + ticket.quantity,
          0,
        );
        const eventRevenue = event.Ticket.reduce((sum, ticket) => {
          // Calculate actual revenue by subtracting platform fees
          // If platform fee exists, subtract it; if 0, subtract 5% of total price
          const platformFee =
            ticket.ticketType.platformfee > 0
              ? ticket.ticketType.platformfee * ticket.quantity
              : ticket.totalPrice * 0.05;
          const actualRevenue = ticket.totalPrice - platformFee;
          return sum + actualRevenue;
        }, 0);

        totalTicketsSold += eventTicketsSold;
        totalRevenue += eventRevenue;
      });

      // Update the ListerAnalytics table with real-time data
      await prisma.listerAnalytics.upsert({
        where: { listerId: lister.listerId },
        create: {
          listerId: lister.listerId,
          totalEvents: lister.Event.length,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalTicketsSold,
        },
        update: {
          totalEvents: lister.Event.length,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalTicketsSold,
          lastUpdated: new Date(),
        },
      });

      await invalidateUserSessions(userId);

      // Return lister data with real-time analytics
      return {
        ...lister,
        ListerAnalytics: {
          totalEvents: lister.Event.length,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalTicketsSold,
          lastUpdated: new Date(),
        },
        Event: lister.Event.map((event) => ({
          eventId: event.eventId,
          title: event.title,
          date: event.date,
          banner_horizontal: event.banner_horizontal,
          banner_vertical: event.banner_vertical,
          banner_square: event.banner_square,
          status: event.status,
        })),
      };
    } catch (error) {
      logger.error("Error in meLister:", error);
      throw error;
    }
  }

  async updateLister(
    userId: string,
    updateData: {
      companyName?: string;
      companyLogo?: string;
      bio?: string;
    },
  ) {
    try {
      // First check if the lister exists
      const existingLister = await prisma.lister.findUnique({
        where: { userId },
      });

      if (!existingLister) {
        throw new Error("Lister not found for given userId");
      }

      // Update the lister
      const updatedLister = await prisma.lister.update({
        where: { userId },
        data: {
          ...(updateData.companyName !== undefined && {
            companyName: updateData.companyName,
          }),
          ...(updateData.companyLogo !== undefined && {
            companyLogo: updateData.companyLogo,
          }),
          ...(updateData.bio !== undefined && { bio: updateData.bio }),
        },
        select: {
          listerId: true,
          userId: true,
          companyName: true,
          companyLogo: true,
          bio: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedLister;
    } catch (error) {
      logger.error("Error in updateLister:", error);
      throw error;
    }
  }

  async getLister(listerId: string) {
    try {
      const lister = await prisma.lister.findUnique({
        where: {
          listerId,
        },
        select: {
          listerId: true,
          status: true,
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
          createdAt: true,
          companyLogo: true,
          companyName: true,
          bio: true,
          Event: {
            select: {
              eventId: true,
              title: true,
              date: true,
              banner_horizontal: true,
              banner_vertical: true,
              banner_square: true,
              status: true,
              EventAnalytics: {
                select: {
                  views: true,
                  clicks: true,
                  ticketsSold: true,
                  revenue: true,
                  conversionRate: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          ListerAnalytics: {
            select: {
              totalEvents: true,
              totalRevenue: true,
              totalTicketsSold: true,
              lastUpdated: true,
            },
          },
        },
      });

      if (!lister) {
        throw new Error("Lister not found for given listerId");
      }

      return lister;
    } catch (error) {
      logger.error("Error in getLister:", error);
      throw error;
    }
  }

  async getListerAnalytics(userId: string) {
    try {
      // Get lister info
      const lister = await prisma.lister.findUnique({
        where: { userId },
        select: {
          listerId: true,
          companyName: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!lister?.listerId) {
        throw new Error("User is not a Lister");
      }

      const { listerId } = lister;

      // Get all events with their tickets - calculate from real data
      const events = await prisma.event.findMany({
        where: { listerId },
        select: {
          eventId: true,
          Ticket: {
            where: { status: "SUCCESS" },
            select: {
              quantity: true,
              totalPrice: true,
              ticketType: {
                select: {
                  platformfee: true,
                },
              },
            },
          },
        },
      });

      // Calculate real-time totals from actual ticket data
      let totalRevenue = 0;
      let totalTicketsSold = 0;

      events.forEach((event) => {
        const eventTicketsSold = event.Ticket.reduce(
          (sum, ticket) => sum + ticket.quantity,
          0,
        );
        const eventRevenue = event.Ticket.reduce((sum, ticket) => {
          // Calculate actual revenue by subtracting platform fees
          // If platform fee exists, subtract it; if 0, subtract 5% of total price
          const platformFee =
            ticket.ticketType.platformfee > 0
              ? ticket.ticketType.platformfee * ticket.quantity
              : ticket.totalPrice * 0.05;
          const actualRevenue = ticket.totalPrice - platformFee;
          return sum + actualRevenue;
        }, 0);

        totalTicketsSold += eventTicketsSold;
        totalRevenue += eventRevenue;
      });

      logger.info("Real-time Lister Stats:", {
        totalEvents: events.length,
        totalTicketsSold,
        totalRevenue,
      });

      // UPDATE: Sync calculated values back to ListerAnalytics table
      await prisma.listerAnalytics.upsert({
        where: { listerId },
        create: {
          listerId,
          totalEvents: events.length,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalTicketsSold,
        },
        update: {
          totalEvents: events.length,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalTicketsSold,
          lastUpdated: new Date(),
        },
      });

      return {
        totalEvents: events.length,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalTicketsSold,
        lastUpdated: new Date(),
        lister: {
          companyName: lister.companyName,
          user: {
            name: lister.user.name,
          },
        },
      };
    } catch (error: any) {
      logger.error("Error in getListerAnalytics:", error);
      throw error;
    }
  }

  async getEventAttendeeTicketsDetails(eventId: string, userId: string) {
    try {
      const event = await prisma.event.findFirst({
        where: {
          eventId,
          lister: { userId },
        },
        select: {
          eventId: true,
          title: true,
          date: true,
          time: true,
          location: true,
          CustomField: {
            select: {
              fieldId: true,
              label: true,
              fieldType: true,
              required: true,
              ticketTypeId: true,
            },
          },
          TicketType: {
            select: {
              ticketTypeId: true,
              name: true,
              description: true,
              price: true,
              discountedPrice: true,
              quantity: true,
              soldCount: true,
              platformfee: true,
              Ticket: {
                where: { status: "SUCCESS" },
                select: {
                  ticketId: true,
                  quantity: true,
                  totalPrice: true,
                  qrCode: true,
                  checkedIn: true,
                  createdAt: true,
                  user: {
                    select: {
                      userId: true,
                      name: true,
                      email: true,
                      phone: true,
                      avatar: true,
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
                        },
                      },
                    },
                  },
                },
                orderBy: { createdAt: "desc" },
              },
            },
            orderBy: { price: "asc" },
          },
        },
      });

      if (!event) {
        logger.warn(
          `Event not found or access denied for eventId: ${eventId} and userId: ${userId}`,
        );
        throw new Error("Access Denied or Event not found");
      }

      // 🧠 Group by Ticket Type (already done by Prisma)
      const ticketTypesSummary = event.TicketType.map((ticketType) => {
        const tickets = ticketType.Ticket.map((ticket) => {
          // Convert attendee responses into a key-value map
          const attendeeResponses = ticket.AttendeeFieldResponse.reduce(
            (acc, response) => {
              acc[response.field.label] = {
                fieldId: response.field.fieldId,
                value: response.value,
                fieldType: response.field.fieldType,
                required: response.field.required,
              };
              return acc;
            },
            {} as Record<string, any>,
          );

          return {
            ticketId: ticket.ticketId,
            qrCode: ticket.qrCode,
            quantity: ticket.quantity,
            totalPrice: ticket.totalPrice,
            checkedIn: ticket.checkedIn,
            purchaseDate: ticket.createdAt,
            buyer: ticket.user,
            attendeeFields: attendeeResponses,
          };
        });

        // Calculate actual number of people checked in (considering ticket quantity)
        const checkedInCount = tickets.reduce((sum, t) => {
          return sum + (t.checkedIn ? t.quantity : 0);
        }, 0);

        // Calculate actual number of tickets sold for this ticket type
        const actualTicketsSold = tickets.reduce(
          (sum, t) => sum + t.quantity,
          0,
        );

        const totalRevenue = tickets.reduce((sum, t) => {
          // Calculate actual revenue by subtracting platform fees
          // If platform fee exists, subtract it; if 0, subtract 5% of total price
          const platformFee =
            ticketType.platformfee > 0
              ? ticketType.platformfee * t.quantity
              : t.totalPrice * 0.05;
          const actualRevenue = t.totalPrice - platformFee;
          return sum + actualRevenue;
        }, 0);

        return {
          ticketTypeId: ticketType.ticketTypeId,
          name: ticketType.name,
          description: ticketType.description,
          price: ticketType.price,
          discountedPrice: ticketType.discountedPrice,
          totalQuantity: ticketType.quantity,
          soldCount: actualTicketsSold, // Use calculated value instead of potentially stale soldCount
          availableCount: ticketType.quantity - actualTicketsSold,
          totalTickets: actualTicketsSold, // Actual tickets sold, not number of records
          totalTicketRecords: tickets.length, // Number of purchase records
          checkedInCount, // Number of people checked in
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          tickets,
        };
      });

      // 📊 Overall statistics
      const totalTicketsSold = ticketTypesSummary.reduce(
        (sum, t) => sum + t.totalTickets,
        0,
      );
      const totalCheckedIn = ticketTypesSummary.reduce(
        (sum, t) => sum + t.checkedInCount,
        0,
      );
      const totalRevenue = ticketTypesSummary.reduce(
        (sum, t) => sum + t.totalRevenue,
        0,
      );
      const totalTicketRecords = ticketTypesSummary.reduce(
        (sum, t) => sum + t.totalTicketRecords,
        0,
      );

      return {
        success: true,
        data: {
          event: {
            eventId: event.eventId,
            title: event.title,
            date: event.date,
            time: event.time,
            location: event.location,
          },
          customFields: event.CustomField,
          statistics: {
            totalTicketsSold,
            totalCheckedIn,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            totalTicketRecords,
            checkInRate:
              totalTicketsSold > 0
                ? `${((totalCheckedIn / totalTicketsSold) * 100).toFixed(2)}%`
                : "0%",
          },
          ticketTypes: ticketTypesSummary, // 👈 grouped neatly by ticket type
        },
      };
    } catch (e) {
      logger.error("Error in getEventAttendeeTicketsDetails:", e);
      throw e;
    }
  }
}
