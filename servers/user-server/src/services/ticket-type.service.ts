import { prisma } from "../config/db";
import logger from "../config/logger";

export class TicketTypeService {
  async CreateTicketType(userId: string, eventId: string, payload: any) {
    try {
      // Verify the event exists and belongs to the user's lister account
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
          "Event not found or you don't have permission to add ticket types",
        );
      }

      // Check if event is in a valid state to add tickets
      if (event.status === "CANCELLED") {
        throw new Error("Cannot add ticket types to a cancelled event");
      }

      // Validate discounted price is less than regular price
      if (payload.discountedPrice && payload.discountedPrice >= payload.price) {
        throw new Error("Discounted price must be less than regular price");
      }

      // Validate salesCutoff is before event date
      if (payload.salesCutoff) {
        const cutoffDate = new Date(payload.salesCutoff);
        if (cutoffDate >= event.date) {
          throw new Error("Sales cutoff must be before the event date");
        }
      }

      // Create the ticket type
      const ticketType = await prisma.ticketType.create({
        data: {
          eventId,
          name: payload.name,
          description: payload.description,
          price: payload.price,
          discountedPrice: payload.discountedPrice,
          discountReason: payload.discountReason,
          quantity: payload.quantity,
          salesCutoff: payload.salesCutoff
            ? new Date(payload.salesCutoff)
            : null,
        },
      });

      logger.info(
        `Ticket type ${ticketType.ticketTypeId} created for event ${eventId}`,
      );
      return ticketType;
    } catch (error) {
      logger.error("Error creating ticket type:", error);
      throw error;
    }
  }

  async UpdateTicketType(
    userId: string,
    eventId: string,
    ticketTypeId: string,
    payload: any,
  ) {
    try {
      // Verify the ticket type exists and belongs to the user's event
      const ticketType = await prisma.ticketType.findFirst({
        where: {
          ticketTypeId,
          eventId,
          event: {
            lister: {
              userId,
            },
          },
        },
        include: {
          event: true,
          _count: {
            select: { Ticket: true },
          },
        },
      });

      if (!ticketType) {
        throw new Error(
          "Ticket type not found or you don't have permission to update it",
        );
      }

      // Prevent quantity reduction below sold count
      if (
        payload.quantity !== undefined &&
        payload.quantity < ticketType.soldCount
      ) {
        throw new Error(
          `Cannot reduce quantity below sold count (${ticketType.soldCount})`,
        );
      }

      // Validate discounted price is less than regular price
      const newPrice = payload.price ?? ticketType.price;
      if (payload.discountedPrice && payload.discountedPrice >= newPrice) {
        throw new Error("Discounted price must be less than regular price");
      }

      // Validate salesCutoff is before event date
      if (payload.salesCutoff) {
        const cutoffDate = new Date(payload.salesCutoff);
        if (cutoffDate >= ticketType.event.date) {
          throw new Error("Sales cutoff must be before the event date");
        }
      }

      // Update the ticket type
      const updatedTicketType = await prisma.ticketType.update({
        where: { ticketTypeId },
        data: {
          ...(payload.name && { name: payload.name }),
          ...(payload.description !== undefined && {
            description: payload.description,
          }),
          ...(payload.price !== undefined && { price: payload.price }),
          ...(payload.discountedPrice !== undefined && {
            discountedPrice: payload.discountedPrice,
          }),
          ...(payload.discountReason !== undefined && {
            discountReason: payload.discountReason,
          }),
          ...(payload.quantity !== undefined && { quantity: payload.quantity }),
          ...(payload.salesCutoff !== undefined && {
            salesCutoff: payload.salesCutoff
              ? new Date(payload.salesCutoff)
              : null,
          }),
        },
      });

      logger.info(`Ticket type ${ticketTypeId} updated for event ${eventId}`);
      return updatedTicketType;
    } catch (error) {
      logger.error("Error updating ticket type:", error);
      throw error;
    }
  }

  async DeleteTicketType(
    userId: string,
    eventId: string,
    ticketTypeId: string,
  ) {
    try {
      // Verify the ticket type exists and belongs to the user's event
      const ticketType = await prisma.ticketType.findFirst({
        where: {
          ticketTypeId,
          eventId,
          event: {
            lister: {
              userId,
            },
          },
        },
      });

      if (!ticketType) {
        throw new Error(
          "Ticket type not found or you don't have permission to delete it",
        );
      }

      // Prevent deletion if tickets have been sold
      if (ticketType.soldCount > 0) {
        throw new Error(
          `Cannot delete ticket type with ${ticketType.soldCount} sold tickets`,
        );
      }

      // Delete the ticket type
      await prisma.ticketType.delete({
        where: { ticketTypeId },
      });

      logger.info(`Ticket type ${ticketTypeId} deleted for event ${eventId}`);
      return { message: "Ticket type deleted successfully" };
    } catch (error) {
      logger.error("Error deleting ticket type:", error);
      throw error;
    }
  }
}
