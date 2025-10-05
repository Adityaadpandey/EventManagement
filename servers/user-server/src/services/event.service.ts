import { prisma } from "../config/db";
import logger from "../config/logger";
import { redis } from "../config/redis";

export interface TicketTypeRequest {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  salesCutoff?: string; // ISO date string
}

export interface CustomFieldRequest {
  label: string;
  fieldType: string; // 'text', 'number', 'dropdown', 'email', etc.
  required: boolean;
  options?: string; // JSON or comma-separated for dropdown options
}

export interface CreateEventRequest {
  title: string;
  description: string;
  banner_horizontal: string;
  banner_vertical: string;
  banner_square: string;
  date: string; // ISO date string
  time: string; // ISO time string
  tags: string[];
  chips: string[];
  restrictions?: string;
  location: string;
  longitude?: number;
  latitude?: number;
  capacity?: number;
  samplePoster?: string;
  socialMediaGraphic?: string;
  eventFormat?: string;
  requestedVenue?: string;
  termsConditions?: string;
  rulesRegulations?: string;
  policies?: string;
  dutyLeavesDetails?: string;
  ticketTypes: TicketTypeRequest[];
  customFields?: CustomFieldRequest[];
}

export class EventService {
  async createEvent(userId: string, eventData: CreateEventRequest) {
    try {
      // First, verify the user exists and has a lister profile
      const user = await prisma.user.findUnique({
        where: { userId },
        include: { Lister: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (!user.Lister) {
        throw new Error("User must be a lister to create events");
      }

      if (user.Lister.status !== "COMPLETED") {
        throw new Error(
          "Lister profile must be approved before creating events",
        );
      }

      // Validate required fields
      const requiredFields = [
        "title",
        "description",
        "banner_horizontal",
        "banner_vertical",
        "banner_square",
        "date",
        "time",
        "location",
      ] as const;
      for (const field of requiredFields) {
        if (!eventData[field as keyof CreateEventRequest]) {
          throw new Error(`${field} is required`);
        }
      }

      // Validate ticket types
      if (!eventData.ticketTypes || eventData.ticketTypes.length === 0) {
        throw new Error("At least one ticket type is required");
      }

      for (const ticketType of eventData.ticketTypes) {
        if (
          !ticketType.name ||
          ticketType.price < 0 ||
          ticketType.quantity <= 0
        ) {
          throw new Error(
            "Invalid ticket type data. Name, valid price, and positive quantity are required",
          );
        }
      }

      // Parse and validate date/time
      const eventDate = new Date(eventData.date);
      const eventTime = new Date(eventData.time);

      if (
        Number.isNaN(eventDate.getTime()) ||
        Number.isNaN(eventTime.getTime())
      ) {
        throw new Error("Invalid date or time format");
      }

      // Check if event date is in the future
      if (eventDate < new Date()) {
        throw new Error("Event date must be in the future");
      }

      // Use transaction to ensure data consistency
      const result = await prisma.$transaction(async (tx) => {
        // Create the event
        const event = await tx.event.create({
          data: {
            listerId: user.Lister!.listerId,
            title: eventData.title,
            description: eventData.description,
            banner_horizontal: eventData.banner_horizontal,
            banner_vertical: eventData.banner_vertical,
            banner_square: eventData.banner_square,
            date: eventDate,
            chips: eventData.chips,
            restrictions: eventData.restrictions,
            time: eventTime,
            longitude: eventData.longitude,
            latitude: eventData.latitude,
            location: eventData.location,
            capacity: eventData.capacity,
            status: "NOT_VIEWED",
            tags: eventData.tags,
            // Optional admin-only details
            samplePoster: eventData.samplePoster,
            socialMediaGraphic: eventData.socialMediaGraphic,
            eventFormat: eventData.eventFormat,
            requestedVenue: eventData.requestedVenue,
            termsConditions: eventData.termsConditions,
            rulesRegulations: eventData.rulesRegulations,
            policies: eventData.policies,
            dutyLeavesDetails: eventData.dutyLeavesDetails,
          },
        });

        // Create ticket types
        const ticketTypes = await Promise.all(
          eventData.ticketTypes.map(async (ticketType) => {
            return await tx.ticketType.create({
              data: {
                eventId: event.eventId,
                name: ticketType.name,
                description: ticketType.description,
                price: ticketType.price,
                quantity: ticketType.quantity,
                salesCutoff: ticketType.salesCutoff
                  ? new Date(ticketType.salesCutoff)
                  : null,
              },
            });
          }),
        );

        // Create custom fields if provided
        let customFields: any = [];
        if (eventData.customFields && eventData.customFields.length > 0) {
          customFields = await Promise.all(
            eventData.customFields.map(async (field) => {
              return await tx.customField.create({
                data: {
                  eventId: event.eventId,
                  label: field.label,
                  fieldType: field.fieldType,
                  required: field.required,
                  options: field.options,
                },
              });
            }),
          );
        }

        // Create analytics entry for the event
        await tx.eventAnalytics.create({
          data: {
            eventId: event.eventId,
          },
        });

        return {
          event,
          ticketTypes,
          customFields,
        };
      });

      // Fetch the complete event with relations
      const completeEvent = await prisma.event.findUnique({
        where: { eventId: result.event.eventId },
        include: {
          lister: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          TicketType: true,
          CustomField: true,
          EventAnalytics: true,
        },
      });

      return {
        success: true,
        message:
          "Event created successfully with ticket types and custom fields",
        data: completeEvent,
      };
    } catch (error) {
      logger.error("Error creating event:", error);
      throw error;
    }
  }

  async getPublicEvents(cursor?: string, limit = 10) {
    limit = Math.min(Number(limit) || 10, 100);
    const cacheKey = `public-events:${cursor || "first"}:${limit}`;

    try {
      // 1. Try cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // 2. Fetch from DB
      const where = { status: "APPROVED" as const };

      const events = await prisma.event.findMany({
        where,
        take: limit + 1,
        ...(cursor && {
          cursor: { eventId: cursor },
          skip: 1,
        }),
        orderBy: { eventId: "asc" },
        select: {
          eventId: true,
          title: true,
          description: true,
          date: true,
          time: true,
          tags: true,
          location: true,
          capacity: true,
          banner_horizontal: true,
          banner_vertical: true,
          banner_square: true,
          TicketType: {
            select: {
              name: true,
              price: true,
              quantity: true,
            },
          },
          lister: {
            select: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      });

      const hasNextPage = events.length > limit;
      const slicedEvents = hasNextPage ? events.slice(0, -1) : events;
      const nextCursor = hasNextPage
        ? slicedEvents[slicedEvents.length - 1].eventId
        : null;

      const result = {
        events: slicedEvents,
        nextCursor,
        hasNextPage,
      };

      // 3. Store in cache (set TTL for staleness tolerance)
      await redis.set(cacheKey, JSON.stringify(result), "EX", 60); // Cache for 60 seconds

      return result;
    } catch (error) {
      logger.error("Error in getPublicEvents:", error);
      throw error;
    }
  }

  async getListerEvents(userId: string) {
    try {
      const events = await prisma.event.findMany({
        where: {
          lister: {
            userId,
          },
        },
        include: {
          TicketType: true,
          CustomField: true,
          EventAnalytics: true,
        },
      });
      logger.info(`Fetched ${events.length} events for user ${userId}`);
      if (events.length === 0) {
        logger.warn(`No events found for user ${userId}`);
      }

      return events;
    } catch (error) {
      logger.error("Error in getListerEvents:", error);
      throw error;
    }
  }

  async getPublicEventDetails(eventId: string) {
    try {
      const event = await prisma.event.findUnique({
        where: {
          eventId,
        },
        select: {
          lister: {
            select: {
              user: {
                select: { name: true, email: true },
              },
              bio: true,
            },
          },
          title: true,
          description: true,
          banner_horizontal: true,
          banner_vertical: true,
          banner_square: true,
          date: true,
          time: true,
          tags: true,
          location: true,
          capacity: true,
          TicketType: {
            select: {
              ticketTypeId: true,
              name: true,
              price: true,
              quantity: true,
            },
          },
          CustomField: {
            select: {
              label: true,
              fieldType: true,
              required: true,
              options: true,
            },
          },
        },
      });

      if (!event) {
        throw new Error("Event not found");
      }
      return event;
    } catch (error) {
      logger.error("Error in getPublicEventDetails:", error);
      throw error;
    }
  }

  async getEventDetails(userId: string, eventId: string) {
    try {
      const event = await prisma.event.findUnique({
        where: {
          eventId,
        },
        include: {
          lister: {
            select: {
              user: {
                select: { name: true, email: true, userId: true },
              },
            },
          },
          TicketType: true,
          CustomField: true,
          EventAnalytics: true,
        },
      });

      if (!event) {
        throw new Error("Event not found");
      }

      if (event.lister.user.userId !== userId) {
        throw new Error("You do not have permission to view this event");
      }

      return event;
    } catch (error) {
      logger.error("Error in getEventDetails:", error);
      throw error;
    }
  }
  async patchEvent(userId: string, eventId: string, updateData: any) {
    try {
      const updatedEvent = await prisma.event.update({
        where: { eventId },
        data: {
          ...updateData,
          lister: {
            connect: { userId },
          },
        },
        include: {
          lister: {
            select: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
          TicketType: true,
          CustomField: true,
          EventAnalytics: true,
        },
      });

      return updatedEvent;
    } catch (error) {
      logger.error("Error in patchEvent:", error);
      throw error;
    }
  }
}
