import { prisma } from "../config/db";
import logger from "../config/logger";
import {
  delListerCache,
  getListerCache,
  invalidateUserCaches,
  setListerCache,
  setUserCache,
} from "../lib/cache";

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

      // Update user cache with new role
      await setUserCache(userId, {
        ...existingUser,
        role: "LISTER",
      });

      // Cache the lister profile
      await setListerCache(lister.listerId, lister);

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

      // Invalidate user caches after updating analytics
      await invalidateUserCaches(userId);

      // Cache the lister profile
      const listerResult = {
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

      // Cache the lister result
      await setListerCache(lister.listerId, listerResult);

      return listerResult;
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

      // Invalidate lister cache
      await delListerCache(existingLister.listerId);
      await invalidateUserCaches(userId);

      return updatedLister;
    } catch (error) {
      logger.error("Error in updateLister:", error);
      throw error;
    }
  }

  async getLister(listerId: string) {
    try {
      // Try cache first
      const cached = await getListerCache(listerId);
      if (cached) {
        logger.info(`Lister cache hit for ${listerId}`);
        return cached;
      }

      // Cache miss - fetch from database
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

      // Cache the lister
      await setListerCache(listerId, lister);

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

      // OPTIMIZED: Aggregate from EventAnalytics (already kept in sync by payment.service)
      // This is MUCH faster than querying all tickets
      const [totalEvents, analyticsSum] = await Promise.all([
        // Count total events
        prisma.event.count({
          where: { listerId },
        }),
        // Aggregate revenue and tickets from EventAnalytics
        prisma.eventAnalytics.aggregate({
          where: {
            event: {
              listerId,
            },
          },
          _sum: {
            revenue: true,
            ticketsSold: true,
          },
        }),
      ]);

      const totalRevenue = parseFloat(
        (analyticsSum._sum.revenue || 0).toFixed(2),
      );
      const totalTicketsSold = analyticsSum._sum.ticketsSold || 0;

      logger.info("Lister analytics aggregated from EventAnalytics:", {
        totalEvents,
        totalTicketsSold,
        totalRevenue,
      });

      prisma.listerAnalytics
        .upsert({
          where: { listerId },
          create: {
            listerId,
            totalEvents,
            totalRevenue,
            totalTicketsSold,
          },
          update: {
            totalEvents,
            totalRevenue,
            totalTicketsSold,
            lastUpdated: new Date(),
          },
        })
        .catch((err) =>
          logger.warn("Failed to update ListerAnalytics cache:", err),
        );

      return {
        totalEvents,
        totalRevenue,
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
      // Verify event ownership first (lightweight query)
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
        },
      });

      if (!event) {
        logger.warn(
          `Event not found or access denied for eventId: ${eventId} and userId: ${userId}`,
        );
        throw new Error("Access Denied or Event not found");
      }

      // OPTIMIZED: Get ticket types with aggregated statistics using raw SQL
      let ticketTypesWithStats: Array<{
        ticketTypeId: string;
        name: string;
        description: string | null;
        price: number;
        discountedPrice: number | null;
        quantity: number;
        platformfee: number;
        totalTicketsSold: bigint;
        totalTicketRecords: bigint;
        checkedInCount: bigint;
        totalRevenue: number;
      }>;

      ticketTypesWithStats = await prisma.$queryRaw`
          SELECT
            tt."ticketTypeId",
            tt.name,
            tt.description,
            tt.price,
            tt."discountedPrice",
            tt.quantity,
            tt.platformfee,
            COALESCE(SUM(t.quantity), 0)::bigint as "totalTicketsSold",
            COUNT(t."ticketId")::bigint as "totalTicketRecords",
            COALESCE(SUM(CASE WHEN t."checkedIn" = true THEN t.quantity ELSE 0 END), 0)::bigint as "checkedInCount",
            COALESCE(SUM(
              CASE
                WHEN tt.platformfee > 0
                THEN t."totalPrice" - (tt.platformfee * t.quantity)
                ELSE t."totalPrice" * 0.95
              END
            ), 0)::float as "totalRevenue"
          FROM "TicketType" tt
          LEFT JOIN "Ticket" t ON tt."ticketTypeId" = t."ticketTypeId" AND t.status = 'SUCCESS'
          WHERE tt."eventId" = ${eventId}
          GROUP BY tt."ticketTypeId", tt.name, tt.description, tt.price, tt."discountedPrice", tt.quantity, tt.platformfee
          ORDER BY tt.price ASC
        `;

      // Calculate pagination (skip if fetchAll is true)

      // Fetch tickets with details (all or paginated)
      const ticketTypesSummary = await Promise.all(
        ticketTypesWithStats.map(async (ticketType) => {
          const tickets = await prisma.ticket.findMany({
            where: {
              ticketTypeId: ticketType.ticketTypeId,
              status: "SUCCESS",
            },
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
          });

          const totalTicketsForType = Number(ticketType.totalTicketRecords);

          const formattedTickets = tickets.map((ticket) => {
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

          return {
            ticketTypeId: ticketType.ticketTypeId,
            name: ticketType.name,
            description: ticketType.description,
            price: ticketType.price,
            discountedPrice: ticketType.discountedPrice,
            totalQuantity: ticketType.quantity,
            soldCount: Number(ticketType.totalTicketsSold),
            availableCount:
              ticketType.quantity - Number(ticketType.totalTicketsSold),
            totalTickets: Number(ticketType.totalTicketsSold),
            totalTicketRecords: Number(ticketType.totalTicketRecords),
            checkedInCount: Number(ticketType.checkedInCount),
            totalRevenue: parseFloat(ticketType.totalRevenue.toFixed(2)),
            tickets: formattedTickets,
          };
        }),
      );

      // Calculate overall statistics from aggregated data
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
          ticketTypes: ticketTypesSummary,
        },
      };
    } catch (e) {
      logger.error("Error in getEventAttendeeTicketsDetails:", e);
      throw e;
    }
  }
}
