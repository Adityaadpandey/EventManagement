import { prisma } from "../config/db";
import logger from "../config/logger";
import { invalidateEventCaches } from "../lib/cache";
import { sendEmail } from "../lib/mail";
import { NotFoundError, UnauthorizedError } from "../utils/errors";

export class AdminService {
  async changeEventStatus(
    adminId: string,
    data: {
      eventId: string;
      newStatus:
        | "NOT_VIEWED"
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "CANCELLATION_REQUESTED"
        | "CANCELLED";
    },
  ) {
    try {
      // Check if the requesting user is an admin
      const adminUser = await prisma.user.findUnique({
        where: { userId: adminId },
      });

      if (!adminUser || adminUser.role !== "ADMIN") {
        throw new UnauthorizedError("Only admins can change event status");
      }

      // Update the event's status
      const updatedEvent = await prisma.event.update({
        where: { eventId: data.eventId },
        data: { status: data.newStatus },
        include: {
          lister: {
            select: {
              user: {
                select: {
                  userId: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!updatedEvent) {
        throw new NotFoundError("Event not found");
      }

      // Send email to lister on APPROVED or REJECTED
      const listerEmail = updatedEvent.lister?.user?.email;
      const listerName = updatedEvent.lister?.user?.name || "Lister";

      if (
        listerEmail &&
        (data.newStatus === "APPROVED" || data.newStatus === "REJECTED")
      ) {
        const reviewContent = {
          eventTitle: updatedEvent.title,
          eventLocation: updatedEvent.location,
          eventDate: updatedEvent.date
            ? new Date(updatedEvent.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : null,
          eventId: updatedEvent.eventId,
          listerName,
        };

        const type =
          data.newStatus === "APPROVED" ? "event-approved" : "event-rejected";
        const subject =
          data.newStatus === "APPROVED"
            ? `🎉 Your event "${updatedEvent.title}" has been approved!`
            : `Update on your event "${updatedEvent.title}"`;

        sendEmail(
          listerEmail,
          subject,
          { type, content: reviewContent },
          listerName,
        ).catch((e) =>
          logger.error(`Failed to send ${data.newStatus} email to lister:`, e),
        );
      }

      // Invalidate all event-related caches so reads reflect the new status
      const listerUserId = updatedEvent.lister?.user?.userId;
      await invalidateEventCaches(data.eventId, listerUserId);
      logger.info(
        `Invalidated event caches for ${data.eventId} after status → ${data.newStatus}`,
      );

      return {
        message: `Event status updated to ${data.newStatus} successfully`,
        data: updatedEvent,
      };
    } catch (error) {
      logger.error("Error changing event status:", error);
      throw error;
    }
  }

  async getAllPendingEvents(adminId: string) {
    try {
      // Check if the requesting user is an admin
      const adminUser = await prisma.user.findUnique({
        where: { userId: adminId },
      });

      if (!adminUser || adminUser.role !== "ADMIN") {
        throw new UnauthorizedError("Only admins can view pending events");
      }

      // Fetch all events with status 'PENDING'
      const pendingEvents = await prisma.event.findMany({
        where: { status: "PENDING" },
        include: {
          lister: {
            select: {
              user: {
                select: {
                  userId: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return {
        message: "Pending events retrieved successfully",
        data: pendingEvents,
      };
    } catch (error) {
      logger.error("Error fetching pending events:", error);
      throw error;
    }
  }

  async getAllEvents(adminId: string) {
    try {
      // Check if the requesting user is an admin
      const adminUser = await prisma.user.findUnique({
        where: { userId: adminId },
      });

      if (!adminUser || adminUser.role !== "ADMIN") {
        throw new UnauthorizedError("Only admins can view all events");
      }

      // Fetch all events
      const allEvents = await prisma.event.findMany({
        include: {
          lister: {
            select: {
              user: {
                select: {
                  userId: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return {
        message: "All events retrieved successfully",
        data: allEvents,
      };
    } catch (error) {
      logger.error("Error fetching all events:", error);
      throw error;
    }
  }
}
