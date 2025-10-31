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
          ListerAnalytics: {
            select: {
              totalEvents: true,
              totalRevenue: true,
              totalTicketsSold: true,
              lastUpdated: true,
            },
          },
          Event: {
            select: {
              eventId: true,
              title: true,
              date: true,
              banner_horizontal: true,
              banner_vertical: true,
              banner_square: true,
              status: true,
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
      await invalidateUserSessions(userId);

      return lister;
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
              ticketsSold: true,
              revenue: true,
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
      const lister = await prisma.lister.findUnique({
        where: {
          userId,
        },
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

      // Get real-time cumulative data from events
      const eventStats = await prisma.event.aggregate({
        where: {
          listerId,
          // status: "APPROVED",
        },
        _sum: {
          ticketsSold: true,
          revenue: true,
        },
        _count: {
          eventId: true,
        },
      });
      console.log("Event Stats:", eventStats);

      return {
        totalEvents: eventStats._count.eventId || 0,
        totalRevenue: eventStats._sum.revenue || 0,
        totalTicketsSold: eventStats._sum.ticketsSold || 0,
        lastUpdated: new Date(),
        lister: {
          companyName: lister.companyName,
          user: {
            name: lister.user.name,
          },
        },
      };
    } catch (error) {
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

        const checkedInCount = tickets.filter((t) => t.checkedIn).length;
        const totalRevenue = tickets.reduce((sum, t) => sum + t.totalPrice, 0);

        return {
          ticketTypeId: ticketType.ticketTypeId,
          name: ticketType.name,
          description: ticketType.description,
          price: ticketType.price,
          discountedPrice: ticketType.discountedPrice,
          totalQuantity: ticketType.quantity,
          soldCount: ticketType.soldCount,
          availableCount: ticketType.quantity - ticketType.soldCount,
          totalTickets: tickets.length,
          checkedInCount,
          totalRevenue,
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
            totalRevenue,
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
