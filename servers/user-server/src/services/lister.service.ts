import { prisma } from "../config/db";
import logger from "../config/logger";
import { setCachedUser } from "../lib/redis-fn";

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
}
