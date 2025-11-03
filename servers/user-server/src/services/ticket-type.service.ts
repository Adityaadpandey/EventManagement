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

      // Use transaction to create ticket type and custom fields
      const result = await prisma.$transaction(async (tx) => {
        // Create the ticket type
        const ticketType = await tx.ticketType.create({
          data: {
            eventId,
            name: payload.name,
            description: payload.description,
            price: payload.price,
            discountedPrice: payload.discountedPrice,
            discountReason: payload.discountReason,
            quantity: payload.quantity,
            ticketPrefix: payload.ticketPrefix,
            salesCutoff: payload.salesCutoff
              ? new Date(payload.salesCutoff)
              : null,
          },
        });

        // Create ticket-specific custom fields if provided
        let customFields = [];
        if (payload.customField && payload.customField.length > 0) {
          customFields = await Promise.all(
            payload.customField.map(async (field: any) => {
              return await tx.customField.create({
                data: {
                  eventId,
                  ticketTypeId: ticketType.ticketTypeId,
                  label: field.label,
                  fieldType: field.fieldType,
                  required: field.required,
                  options: field.options,
                },
              });
            }),
          );
        }

        return { ticketType, customFields };
      });

      // Fetch the complete ticket type with custom fields
      const completeTicketType = await prisma.ticketType.findUnique({
        where: { ticketTypeId: result.ticketType.ticketTypeId },
        include: {
          CustomField: true,
        },
      });

      logger.info(
        `Ticket type ${result.ticketType.ticketTypeId} created for event ${eventId} with ${result.customFields.length} custom fields`,
      );

      return completeTicketType;
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
          CustomField: true,
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

      // Use transaction to update ticket type and handle custom fields
      const result = await prisma.$transaction(async (tx) => {
        // Update the ticket type
        const updatedTicketType = await tx.ticketType.update({
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
            ...(payload.quantity !== undefined && {
              quantity: payload.quantity,
            }),
            ...(payload.salesCutoff !== undefined && {
              salesCutoff: payload.salesCutoff
                ? new Date(payload.salesCutoff)
                : null,
            }),
          },
        });

        // Handle custom fields update if provided
        let customFields = ticketType.CustomField;
        if (payload.customField !== undefined) {
          // If customField is provided, replace all existing fields
          // First, delete existing ticket-specific custom fields
          await tx.customField.deleteMany({
            where: {
              ticketTypeId,
            },
          });

          // Then create new custom fields
          if (payload.customField && payload.customField.length > 0) {
            customFields = await Promise.all(
              payload.customField.map(async (field: any) => {
                return await tx.customField.create({
                  data: {
                    eventId,
                    ticketTypeId,
                    label: field.label,
                    fieldType: field.fieldType,
                    required: field.required,
                    options: field.options,
                  },
                });
              }),
            );
          } else {
            customFields = [];
          }
        }

        return { updatedTicketType, customFields };
      });

      // Fetch the complete ticket type with updated custom fields
      const completeTicketType = await prisma.ticketType.findUnique({
        where: { ticketTypeId },
        include: {
          CustomField: true,
        },
      });

      logger.info(`Ticket type ${ticketTypeId} updated for event ${eventId}`);

      return completeTicketType;
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
