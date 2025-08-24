import bcrypt from "bcrypt";
import { prisma } from "../config/db";
import logger from "../config/logger";

export class CheckerService {
  async createChecker(
    eventId: string,
    userId: string,
    username: string,
    password: string,
  ) {
    try {
      // First verify the event exists and user is the lister
      const event = await prisma.event.findFirst({
        where: {
          eventId,
          lister: {
            userId,
          },
        },
        include: {
          lister: true,
        },
      });

      if (!event) {
        throw new Error(
          "Event not found or you are not authorized to create a checker for this event",
        );
      }

      // Check if checker with same username already exists for this event
      const existingChecker = await prisma.ticketChecker.findFirst({
        where: {
          eventId,
          username,
        },
      });

      if (existingChecker) {
        throw new Error(
          "Checker with this username already exists for this event",
        );
      }

      // Calculate expiry time: event time + 10 hours
      const eventDateTime = new Date(
        `${event.date.toDateString()} ${event.time.toTimeString()}`,
      );
      const expiresAt = new Date(eventDateTime.getTime() + 10 * 60 * 60 * 1000); // 10 hours after event

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      const checker = await prisma.ticketChecker.create({
        data: {
          listerId: event.listerId,
          eventId,
          username,
          password: hashedPassword,
          active: true,
          deprecated: false,
          expiresAt,
          createdBy: userId,
        },
      });

      // Return checker without password
      const { password: _, ...checkerData } = checker;
      return checkerData;
    } catch (error: any) {
      logger.error("Error creating checker:", error);
      throw new Error(error.message || "Failed to create checker");
    }
  }

  async getCheckerById(checkerId: string) {
    try {
      const checker = await prisma.ticketChecker.findUnique({
        where: {
          checkerId,
        },
        include: {
          event: {
            select: {
              title: true,
              date: true,
              time: true,
              location: true,
            },
          },
          lister: {
            select: {
              companyName: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!checker) {
        throw new Error("Checker not found");
      }

      // Remove password from response
      const { password: _, ...checkerData } = checker;
      return checkerData;
    } catch (error: any) {
      logger.error("Error getting checker:", error);
      throw new Error(error.message || "Failed to get checker");
    }
  }

  async getCheckersByEvent(eventId: string, userId: string) {
    try {
      // Verify user owns this event
      const event = await prisma.event.findFirst({
        where: {
          eventId,
          lister: {
            userId,
          },
        },
      });

      if (!event) {
        throw new Error("Event not found or unauthorized");
      }

      const checkers = await prisma.ticketChecker.findMany({
        where: {
          eventId,
        },
        select: {
          checkerId: true,
          username: true,
          active: true,
          deprecated: true,
          expiresAt: true,
          createdAt: true,
          revokedAt: true,
        },
      });

      return checkers;
    } catch (error: any) {
      logger.error("Error getting checkers for event:", error);
      throw new Error(error.message || "Failed to get checkers");
    }
  }

  async deleteChecker(checkerId: string, userId: string) {
    try {
      // Verify the checker exists and user owns the event
      const checker = await prisma.ticketChecker.findFirst({
        where: {
          checkerId,
          lister: {
            userId,
          },
        },
      });

      if (!checker) {
        throw new Error("Checker not found or unauthorized");
      }

      await prisma.ticketChecker.update({
        where: {
          checkerId,
        },
        data: {
          active: false,
          deprecated: true,
          revokedAt: new Date(),
        },
      });

      return { message: "Checker deleted successfully" };
    } catch (error: any) {
      logger.error("Error deleting checker:", error);
      throw new Error(error.message || "Failed to delete checker");
    }
  }
}
