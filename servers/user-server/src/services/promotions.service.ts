import ejs from "ejs";
import path from "path";
import { prisma } from "../config/db";
import logger from "../config/logger";
import { emailQueue } from "../lib/queues";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "../utils/errors";

export class PromotionsService {
  /**
   * Send promotional emails to all previous ticket buyers of a lister's events
   * @param eventId - The event ID to promote (new event)
   * @param emailFile - The email template file name (e.g., "promotion.ejs")
   * @param content - Custom content/message for the promotion
   * @param toEventId - Optional: specific event ID to target buyers from (if not provided, targets all previous events)
   * @param userId - The user/lister ID sending the promotion
   */
  async sendMailToPrev(
    eventId: string,
    emailFile: any,
    content: string,
    toEventId: string,
    userId: string,
  ) {
    try {
      // Verify the event exists and get event details
      const event = await prisma.event.findUnique({
        where: { eventId },
        include: {
          lister: {
            include: {
              user: true,
            },
          },
          TicketType: {
            select: {
              ticketTypeId: true,
              name: true,
              price: true,
              discountedPrice: true,
              quantity: true,
              soldCount: true,
            },
          },
        },
      });

      if (!event) {
        throw new NotFoundError("Event not found");
      }

      // Verify the user is the lister of this event
      if (event.lister.userId !== userId) {
        throw new ForbiddenError(
          "You are not authorized to send promotions for this event",
        );
      }

      // Check available mail updates
      if (event.availableMailUpdates <= 0) {
        throw new BadRequestError(
          "No promotional emails remaining for this event",
        );
      }

      // Get all previous ticket buyers
      let tickets;

      if (toEventId) {
        // Target specific event's buyers
        tickets = await prisma.ticket.findMany({
          where: {
            eventEventId: toEventId,
            // status: "SUCCESS",
          },
          include: {
            user: true,
          },
        });
      } else {
        // Target all previous buyers from lister's events
        const listerEvents = await prisma.event.findMany({
          where: {
            listerId: event.listerId,
            status: "APPROVED",
            eventId: { not: eventId }, // Exclude current event
          },
          select: { eventId: true },
        });

        const eventIds = listerEvents.map((e) => e.eventId);

        tickets = await prisma.ticket.findMany({
          where: {
            eventEventId: { in: eventIds },
            status: "SUCCESS",
          },
          include: {
            user: true,
          },
        });
      }

      // Get unique users (deduplicate by userId)
      const uniqueUsersMap = new Map();
      tickets.forEach((ticket) => {
        if (!uniqueUsersMap.has(ticket.userId)) {
          uniqueUsersMap.set(ticket.userId, ticket);
        }
      });
      const ticketBuyers = Array.from(uniqueUsersMap.values());

      if (ticketBuyers.length === 0) {
        logger.info(`No previous ticket buyers found for promotion`);
        return { message: "" };
      }

      // Prepare email template data
      const templateData = {
        eventTitle: event.title,
        eventDescription: event.description || "",
        eventDate: event.date,
        eventTime: event.time,
        eventLocation: event.location,
        eventBanner: event.banner_square,
        customContent: content,
        listerName: event.lister.companyName || event.lister.user.name,
        eventLink: `https://tixin.in/event/${eventId}`,
        listerWebsite: event.lister.website,
        listerInstagram: event.lister.InstagramLink,
        listerFacebook: event.lister.FacebookLink,
        listerX: event.lister.XLink,
        chips: event.chips || [],
        tags: event.tags || [],
      };

      // Render email template
      const templatePath = path.join(
        __dirname,
        "..",
        "templates",
        emailFile || "promotion.ejs",
      );
      const html = await ejs.renderFile(templatePath, templateData);

      // Queue emails for all buyers
      const emailPromises = ticketBuyers.map(async (ticket) => {
        if (!ticket.user.email) {
          logger.warn(`User ${ticket.userId} has no email address`);
          return null;
        }

        return emailQueue.add("sendEmail", {
          to: ticket.user.email,
          subject: `New Event: ${event.title}`,
          html,
        });
      });

      await Promise.all(emailPromises);

      // Decrement available mail updates
      await prisma.event.update({
        where: { eventId },
        data: {
          availableMailUpdates: {
            decrement: 1,
          },
        },
      });

      logger.info(
        `Promotional emails queued for ${ticketBuyers.length} users for event ${eventId}`,
      );

      return {
        message: "Promotional emails queued successfully",
        emailsSent: ticketBuyers.length,
        remainingMailUpdates: event.availableMailUpdates - 1,
      };
    } catch (error) {
      logger.error("Error sending promotional emails:", error);
      throw error;
    }
  }

  /**
   * Get count of potential recipients for a promotion
   */
  async getPromotionReach(listerId: string, toEventId?: string) {
    try {
      let tickets;

      if (toEventId) {
        // Get buyers from specific event
        tickets = await prisma.ticket.findMany({
          where: {
            eventEventId: toEventId,
            status: "SUCCESS",
          },
          select: { userId: true },
        });
      } else {
        // Get all buyers from lister's events
        const listerEvents = await prisma.event.findMany({
          where: {
            listerId,
            status: "APPROVED",
          },
          select: { eventId: true },
        });

        const eventIds = listerEvents.map((e) => e.eventId);

        tickets = await prisma.ticket.findMany({
          where: {
            eventEventId: { in: eventIds },
            status: "SUCCESS",
          },
          select: { userId: true },
        });
      }

      // Count unique users
      const uniqueUserIds = new Set(tickets.map((t) => t.userId));
      const ticketCount = uniqueUserIds.size;

      return {
        potentialRecipients: ticketCount,
      };
    } catch (error) {
      logger.error("Error getting promotion reach:", error);
      throw error;
    }
  }
}
