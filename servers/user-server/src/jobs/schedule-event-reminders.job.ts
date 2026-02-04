import cron from "node-cron";
import { prisma } from "../config/db";
import logger from "../config/logger";
import { notificationQueue } from "../lib/queues";

/**
 * Cron job to send event reminders
 * Runs daily at 10:00 AM to check for events happening in 24 hours
 */
export function startEventReminderJob() {
  // Run daily at 10:00 AM
  cron.schedule("0 10 * * *", async () => {
    logger.info("Running event reminder job");

    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find events happening in the next 24 hours
      const upcomingEvents = await prisma.event.findMany({
        where: {
          date: {
            gte: now,
            lte: tomorrow,
          },
          canBuy: true,
        },
        include: {
          Ticket: {
            where: {
              status: "SUCCESS",
            },
            include: {
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

      logger.info(`Found ${upcomingEvents.length} events in next 24 hours`);

      // Send reminders to ticket holders
      for (const event of upcomingEvents) {
        const uniqueUsers = new Map<string, { userId: string; name: string }>();

        event.Ticket.forEach((ticket) => {
          if (!uniqueUsers.has(ticket.userId)) {
            uniqueUsers.set(ticket.userId, {
              userId: ticket.user.userId,
              name: ticket.user.name || "Attendee",
            });
          }
        });

        logger.info(
          `Sending reminders to ${uniqueUsers.size} users for event ${event.title}`,
        );

        for (const [, user] of uniqueUsers) {
          await notificationQueue.add("send-notification", {
            userId: user.userId,
            type: "EVENT_REMINDER",
            title: "Event Reminder",
            message: `Don't forget! ${event.title} is happening tomorrow at ${event.time.toLocaleTimeString()}.`,
            metadata: {
              eventId: event.eventId,
              eventDate: event.date.toISOString(),
              eventLocation: event.location,
            },
          });
        }
      }

      logger.info("Event reminder job completed successfully");
    } catch (error) {
      logger.error("Error in event reminder job:", error);
    }
  });

  logger.info("Event reminder cron job scheduled (daily at 10:00 AM)");
}
