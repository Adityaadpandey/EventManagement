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

  async getPublicEvents(
    cursor?: string,
    limit = 10,
    longitude?: number,
    latitude?: number,
    includeGlobalEvents = true, // New parameter to control global events
  ) {
    limit = Math.min(Number(limit) || 10, 100);

    // Validate location parameters
    const hasValidLocation =
      longitude !== undefined &&
      latitude !== undefined &&
      !isNaN(longitude) &&
      !isNaN(latitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180;

    // Enhanced cache key with global events flag
    const locationKey = hasValidLocation
      ? `${latitude!.toFixed(3)}_${longitude!.toFixed(3)}_${includeGlobalEvents}`
      : "all";
    const cacheKey = `public-events:v2:${locationKey}:${cursor || "first"}:${limit}`;

    try {
      // 1. Try cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info(`Cache hit for key: ${cacheKey}`);
        return JSON.parse(cached);
      }

      logger.info(`Cache miss for key: ${cacheKey}`);

      // 2. Build query conditions
      const baseWhere = {
        status: "APPROVED" as const,
        date: {
          gte: new Date(), // Only future events
        },
      };

      let locationEvents: any[] = [];
      let globalEvents: any[] = [];

      // 3. Fetch location-based events if location is provided
      if (hasValidLocation) {
        const radiusKm = 300;
        const latDelta = radiusKm / 111; // degrees latitude
        const lonDelta =
          radiusKm / (111 * Math.cos((latitude! * Math.PI) / 180)); // degrees longitude

        const locationWhere = {
          ...baseWhere,
          latitude: {
            gte: latitude! - latDelta,
            lte: latitude! + latDelta,
            not: null,
          },
          longitude: {
            gte: longitude! - lonDelta,
            lte: longitude! + lonDelta,
            not: null,
          },
        };

        locationEvents = await prisma.event.findMany({
          where: locationWhere,
          take: limit * 2, // Fetch more for distance filtering
          ...(cursor && {
            cursor: { eventId: cursor },
            skip: 1,
          }),
          orderBy: [
            { date: "asc" }, // Prioritize upcoming events
            { eventId: "asc" },
          ],
          select: this.getEventSelectFields(),
        });

        // Filter by precise distance and add distance field
        locationEvents = locationEvents
          .map((event) => {
            const distance = this.calculateDistance(
              latitude!,
              longitude!,
              event.latitude!,
              event.longitude!,
            );
            return { ...event, distance };
          })
          .filter((event) => event.distance <= radiusKm)
          .sort((a, b) => a.distance - b.distance); // Sort by distance

        logger.info(
          `Found ${locationEvents.length} location-based events within ${radiusKm}km`,
        );
      }

      // 4. Fetch global events (events without coordinates) if requested
      if (includeGlobalEvents) {
        const globalWhere = {
          ...baseWhere,
          OR: [{ latitude: null }, { longitude: null }],
        };

        globalEvents = await prisma.event.findMany({
          where: globalWhere,
          take: hasValidLocation ? Math.ceil(limit / 3) : limit, // Fewer global events if location-based search
          orderBy: [{ date: "asc" }, { eventId: "asc" }],
          select: this.getEventSelectFields(),
        });

        // Add distance field for consistency (null for global events)
        globalEvents = globalEvents.map((event) => ({
          ...event,
          distance: null,
        }));

        logger.info(`Found ${globalEvents.length} global events`);
      }

      // 5. Combine and sort events
      let allEvents = [...locationEvents, ...globalEvents];

      // Sort combined events: location-based first (by distance), then global (by date)
      allEvents.sort((a, b) => {
        // Location events come first, sorted by distance
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        if (a.distance !== null && b.distance === null) {
          return -1; // Location events before global
        }
        if (a.distance === null && b.distance !== null) {
          return 1; // Global events after location
        }
        // Both are global events, sort by date
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      // 6. Apply pagination
      const hasNextPage = allEvents.length > limit;
      const paginatedEvents = allEvents.slice(0, limit);
      const nextCursor =
        hasNextPage && paginatedEvents.length > 0
          ? paginatedEvents[paginatedEvents.length - 1].eventId
          : null;

      // 7. Enhance events with additional computed fields
      const enhancedEvents = paginatedEvents.map((event) => ({
        ...event,
        // Remove distance from final response (used only for sorting)
        distance: undefined,
        // Add computed fields
        isGlobalEvent: event.latitude === null || event.longitude === null,
        minPrice: Math.min(...event.TicketType.map((t: any) => t.price)),
        maxPrice: Math.max(...event.TicketType.map((t: any) => t.price)),
        totalTickets: event.TicketType.reduce(
          (sum: number, t: any) => sum + t.quantity,
          0,
        ),
        // Format date for better UX
        formattedDate: new Date(event.date).toLocaleDateString(),
        formattedTime: new Date(event.time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));

      const result = {
        events: enhancedEvents,
        nextCursor,
        hasNextPage,
        metadata: {
          totalReturned: enhancedEvents.length,
          locationBasedCount: locationEvents.length,
          globalEventsCount: globalEvents.length,
          searchLocation: hasValidLocation ? { latitude, longitude } : null,
          radiusKm: hasValidLocation ? 300 : null,
        },
      };

      // 8. Cache with appropriate TTL
      const ttl = hasValidLocation ? 60 : 120; // Longer cache for location searches
      await redis.set(cacheKey, JSON.stringify(result), "EX", ttl);

      logger.info(
        `Returning ${result.events.length} events (${locationEvents.length} local, ${globalEvents.length} global)`,
      );
      return result;
    } catch (error) {
      logger.error("Error in getPublicEvents:", error);
      throw error;
    }
  }

  // Helper method to get consistent select fields
  private getEventSelectFields() {
    return {
      eventId: true,
      title: true,
      description: true,
      date: true,
      time: true,
      chips: true,
      restrictions: true,
      longitude: true,
      latitude: true,
      tags: true,
      location: true,
      capacity: true,
      banner_horizontal: true,
      banner_vertical: true,
      banner_square: true,
      TicketType: {
        select: {
          ticketTypeId: true,
          name: true,
          price: true,
          quantity: true,
          salesCutoff: true,
        },
      },
      lister: {
        select: {
          listerId: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          bio: true,
        },
      },
    };
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
          chips: true,
          restrictions: true,
          longitude: true,
          latitude: true,
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
          _count: {
            select: {
              DiscountCode: true, // This adds the count of discount codes
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
          DiscountCode: {
            select: {
              code: true,
              description: true,
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

  // Helper method for calculating distance (Haversine formula)
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
