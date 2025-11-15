import { prisma } from "../config/db";
import logger from "../config/logger";
import { redis } from "../config/redis";
import {
  getEventAnalyticsCache,
  getListerEventsCache,
  getPublicEventCache,
  invalidateEventCaches,
  setEventAnalyticsCache,
  setListerEventsCache,
  setPublicEventCache,
} from "../lib/cache";
import { sendEmail } from "../lib/mail";
import { CreateEventRequest } from "../types/event";

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

        // Validate ticket-specific custom fields if provided
        if (ticketType.customField && ticketType.customField.length > 0) {
          for (const field of ticketType.customField) {
            if (!field.label || !field.fieldType) {
              throw new Error(
                `Invalid custom field for ticket type "${ticketType.name}". Label and fieldType are required`,
              );
            }
          }
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

        // Create ticket types with their custom fields
        const ticketTypes = await Promise.all(
          eventData.ticketTypes.map(async (ticketType) => {
            // Create the ticket type
            const createdTicketType = await tx.ticketType.create({
              data: {
                eventId: event.eventId,
                name: ticketType.name,
                description: ticketType.description,
                discountedPrice: ticketType.discountedPrice,
                discountReason: ticketType.discountReason,
                price: ticketType.price,
                quantity: ticketType.quantity,
                ticketPrefix: ticketType.ticketPrefix,
                salesCutoff: ticketType.salesCutoff
                  ? new Date(ticketType.salesCutoff)
                  : null,
              },
            });

            // Create ticket-specific custom fields if provided
            let ticketCustomFields: any = [];
            if (ticketType.customField && ticketType.customField.length > 0) {
              ticketCustomFields = await Promise.all(
                ticketType.customField.map(async (field) => {
                  return await tx.customField.create({
                    data: {
                      eventId: event.eventId,
                      ticketTypeId: createdTicketType.ticketTypeId,
                      label: field.label,
                      fieldType: field.fieldType,
                      required: field.required,
                      options: field.options,
                    },
                  });
                }),
              );
            }

            return {
              ...createdTicketType,
              customFields: ticketCustomFields,
            };
          }),
        );

        // Create event-level custom fields if provided
        let eventCustomFields: any = [];
        if (eventData.customFields && eventData.customFields.length > 0) {
          eventCustomFields = await Promise.all(
            eventData.customFields.map(async (field) => {
              return await tx.customField.create({
                data: {
                  eventId: event.eventId,
                  ticketTypeId: null, // Event-level field, not ticket-specific
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
          eventCustomFields,
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
          TicketType: {
            include: {
              CustomField: true, // Include ticket-specific custom fields
            },
          },
          CustomField: {
            where: {
              ticketTypeId: null, // Only event-level custom fields
            },
          },
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
    includeGlobalEvents = true,
    includeAll = false,
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

    // Enhanced cache key with global events flag and includeAll flag
    const locationKey = hasValidLocation
      ? `${latitude!.toFixed(3)}_${longitude!.toFixed(3)}_${includeGlobalEvents}`
      : "all";
    const cacheKey = `public-events:v3:${locationKey}:${cursor || "first"}:${limit}:${includeAll}`;

    try {
      // 1. Try cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info(`Cache hit for key: ${cacheKey}`);
        return JSON.parse(cached);
      }

      logger.info(`Cache miss for key: ${cacheKey}`);

      // 2. Build query conditions
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      oneDayAgo.setHours(0, 0, 0, 0);

      // If includeAll is true, fetch all events without location filtering
      if (includeAll) {
        const allEvents = await prisma.event.findMany({
          where: {
            status: "APPROVED",
            date: { gte: oneDayAgo },
          },
          take: limit + 1,
          ...(cursor && {
            cursor: { eventId: cursor },
            skip: 1,
          }),
          orderBy: [{ date: "asc" }, { eventId: "asc" }],
          select: this.getEventSelectFields(),
        });

        const hasNextPage = allEvents.length > limit;
        const paginatedEvents = allEvents.slice(0, limit);
        const nextCursor =
          hasNextPage && paginatedEvents.length > 0
            ? paginatedEvents[paginatedEvents.length - 1].eventId
            : null;

        const enhancedEvents = paginatedEvents.map((event) => ({
          ...event,
          isGlobalEvent: event.latitude === null || event.longitude === null,
          minPrice: Math.min(...event.TicketType.map((t: any) => t.price)),
          maxPrice: Math.max(...event.TicketType.map((t: any) => t.price)),
          totalTickets: event.TicketType.reduce(
            (sum: number, t: any) => sum + t.quantity,
            0,
          ),
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
            locationBasedCount: 0,
            globalEventsCount: 0,
            searchLocation: null,
            radiusKm: null,
            includeAll: true,
          },
        };

        await redis.set(cacheKey, JSON.stringify(result), "EX", 120);
        logger.info(
          `Returning all ${result.events.length} events (includeAll=true)`,
        );
        return result;
      }

      let locationEvents: any[] = [];
      let globalEvents: any[] = [];

      // 3. Fetch location-based events using database distance calculation
      if (hasValidLocation) {
        const radiusKm = 300;

        locationEvents = await prisma.$queryRaw<any[]>`
          SELECT
            e."eventId",
            e.title,
            e.description,
            e.date,
            e.time,
            e.chips,
            e.restrictions,
            e.longitude,
            e.latitude,
            e.tags,
            e.location,
            e.capacity,
            e."banner_horizontal",
            e."banner_vertical",
            e."banner_square",
            e."canBuy",
            (
              6371 * acos(
                cos(radians(${latitude})) *
                cos(radians(e.latitude)) *
                cos(radians(e.longitude) - radians(${longitude})) +
                sin(radians(${latitude})) *
                sin(radians(e.latitude))
              )
            ) as distance
          FROM "Event" e
          WHERE e.status = 'APPROVED'
            AND e.date >= ${oneDayAgo}
            AND e.latitude IS NOT NULL
            AND e.longitude IS NOT NULL
            AND (
              6371 * acos(
                cos(radians(${latitude})) *
                cos(radians(e.latitude)) *
                cos(radians(e.longitude) - radians(${longitude})) +
                sin(radians(${latitude})) *
                sin(radians(e.latitude))
              )
            ) <= ${radiusKm}
          ORDER BY distance ASC, e.date ASC
          LIMIT ${limit * 2}
        `;

        // Fetch related data for location events
        if (locationEvents.length > 0) {
          const eventIds = locationEvents.map((e) => e.eventId);
          const eventsWithRelations = await prisma.event.findMany({
            where: { eventId: { in: eventIds } },
            select: this.getEventSelectFields(),
          });

          // Merge distance data with full event data
          locationEvents = locationEvents.map((locEvent) => {
            const fullEvent = eventsWithRelations.find(
              (e) => e.eventId === locEvent.eventId,
            );
            return { ...fullEvent, distance: locEvent.distance };
          });
        }

        logger.info(
          `Found ${locationEvents.length} location-based events within ${radiusKm}km using DB distance calc`,
        );
      }

      // 4. Fetch global events (events without coordinates) if requested
      if (includeGlobalEvents) {
        globalEvents = await prisma.event.findMany({
          where: {
            status: "APPROVED",
            date: { gte: oneDayAgo },
            OR: [{ latitude: null }, { longitude: null }],
          },
          take: hasValidLocation ? Math.ceil(limit / 3) : limit,
          orderBy: [{ date: "asc" }, { eventId: "asc" }],
          select: this.getEventSelectFields(),
        });

        globalEvents = globalEvents.map((event) => ({
          ...event,
          distance: null,
        }));

        logger.info(`Found ${globalEvents.length} global events`);
      }

      // 5. Combine and sort events
      let allEvents = [...locationEvents, ...globalEvents];

      // Sort: location-based first (by distance), then global (by date)
      allEvents.sort((a, b) => {
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        if (a.distance !== null && b.distance === null) {
          return -1;
        }
        if (a.distance === null && b.distance !== null) {
          return 1;
        }
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      // 6. Apply pagination
      const hasNextPage = allEvents.length > limit;
      const paginatedEvents = allEvents.slice(0, limit);
      const nextCursor =
        hasNextPage && paginatedEvents.length > 0
          ? paginatedEvents[paginatedEvents.length - 1].eventId
          : null;

      // 7. Enhance events with computed fields
      const enhancedEvents = paginatedEvents.map((event) => ({
        ...event,
        distance: undefined, // Remove from response
        isGlobalEvent: event.latitude === null || event.longitude === null,
        minPrice: Math.min(...event.TicketType.map((t: any) => t.price)),
        maxPrice: Math.max(...event.TicketType.map((t: any) => t.price)),
        totalTickets: event.TicketType.reduce(
          (sum: number, t: any) => sum + t.quantity,
          0,
        ),
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
      const ttl = hasValidLocation ? 60 : 120;
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
      canBuy: true,
      banner_horizontal: true,
      banner_vertical: true,
      banner_square: true,
      TicketType: {
        select: {
          ticketTypeId: true,
          name: true,
          price: true,
          quantity: true,
          discountedPrice: true,
          discountReason: true,
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
      // Try cache first
      const cached = await getListerEventsCache(userId);
      if (cached) {
        logger.info(`Lister events cache hit for user ${userId}`);
        return cached;
      }

      // Cache miss - fetch from database
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

      // Cache the results
      await setListerEventsCache(userId, events);

      return events;
    } catch (error) {
      logger.error("Error in getListerEvents:", error);
      throw error;
    }
  }

  async getPublicEventDetails(eventId: string) {
    try {
      // Try to get from cache first

      const cached = await getPublicEventCache(eventId);
      if (cached) {
        logger.info(`Public event cache hit for ${eventId}`);
        return cached;
      }

      // If not in cache, fetch from database
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
          canBuy: true,
          location: true,
          capacity: true,
          TicketType: {
            select: {
              ticketTypeId: true,
              name: true,
              description: true,
              price: true,
              quantity: true,
              discountedPrice: true,
              discountReason: true,
              salesCutoff: true,
              platformfee: true,
              soldCount: true,
              CustomField: {
                // Include ticket-specific custom fields
                select: {
                  fieldId: true,
                  label: true,
                  fieldType: true,
                  required: true,
                  options: true,
                },
              },
            },
          },
          CustomField: {
            // Include event-level custom fields only
            where: {
              ticketTypeId: null,
            },
            select: {
              fieldId: true,
              label: true,
              fieldType: true,
              required: true,
              options: true,
            },
          },
          _count: {
            select: {
              DiscountCode: true,
            },
          },
        },
      });

      if (!event) {
        throw new Error("Event not found");
      }

      // Store in cache
      await setPublicEventCache(eventId, event);

      return event;
    } catch (error) {
      logger.error("Error in getPublicEventDetails:", error);
      throw error;
    }
  }

  async getEventDetails(userId: string, eventId: string) {
    try {
      // Try cache first
      const { getEventCache, setEventCache } = await import("../lib/cache");
      const cached = await getEventCache(eventId);

      if (cached) {
        // Verify ownership from cache
        const cachedEvent = cached as any;
        if (cachedEvent.lister?.user?.userId !== userId) {
          throw new Error("You do not have permission to view this event");
        }
        logger.info(`Event details cache hit for ${eventId}`);
        return cached;
      }

      // Cache miss - fetch from database
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

      // Cache the event details
      await setEventCache(eventId, event);

      return event;
    } catch (error) {
      logger.error("Error in getEventDetails:", error);
      throw error;
    }
  }

  async patchEvent(userId: string, eventId: string, updateData: any) {
    try {
      const { ticketTypes, customFields, ...eventData } = updateData;

      // First, verify the event exists
      const existingEvent = await prisma.event.findUnique({
        where: { eventId },
        select: {
          listerId: true,
          TicketType: {
            include: {
              _count: {
                select: { Ticket: true },
              },
            },
          },
        },
      });

      if (!existingEvent) {
        throw new Error(`Event with ID ${eventId} not found`);
      }

      // Check if any ticket types have sold tickets
      const hasSoldTickets = existingEvent.TicketType.some(
        (tt) => tt._count.Ticket > 0,
      );

      // Build the update data object
      const updatePayload: any = {
        ...eventData,
      };

      // Handle ticket types if provided
      if (ticketTypes && ticketTypes.length > 0) {
        if (hasSoldTickets) {
          // If tickets have been sold, don't allow replacing ticket types
          // Only allow adding new ones
          throw new Error(
            "Cannot modify or delete ticket types after tickets have been sold. You can only add new ticket types.",
          );
        } else {
          // Safe to replace ticket types since no tickets sold
          updatePayload.TicketType = {
            deleteMany: {},
            create: ticketTypes.map((t: any) => ({
              name: t.name,
              description: t.description || null,
              price: t.price,
              discountedPrice: t.discountedPrice || null,
              discountReason: t.discountReason || null,
              quantity: t.quantity,
              salesCutoff: t.salesCutoff ? new Date(t.salesCutoff) : null,
            })),
          };
        }
      }

      // Handle custom fields if provided
      // Custom fields can be safely replaced as they don't have critical dependencies
      if (customFields && customFields.length > 0) {
        updatePayload.CustomField = {
          deleteMany: {},
          create: customFields.map((f: any) => ({
            label: f.label,
            fieldType: f.fieldType,
            required: f.required,
            options: f.options || null,
          })),
        };
      }

      const updatedEvent = await prisma.event.update({
        where: { eventId },
        data: updatePayload,
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

      // Invalidate all event-related caches
      await invalidateEventCaches(eventId, userId);

      return updatedEvent;
    } catch (error) {
      logger.error("Error in patchEvent:", error);
      throw error;
    }
  }

  async updateInfo(eventId: string, update: string, imageUrl?: string) {
    try {
      //  so we need to fetch event ticket bought users and send them the email update so we will need the emails of the users who bought tickets for this event
      const event = await prisma.event.findUnique({
        where: { eventId },
        include: {
          Ticket: {
            include: {
              user: {
                select: { email: true, name: true },
              },
            },
          },
        },
      });

      if (!event) {
        throw new Error("Event not found");
      }
      const ticketedUsers = event.Ticket.map((t) => t.user);
      const event_data = event.title;
      logger.info(
        `Fetched ${ticketedUsers.length} ticket holders for event "${event_data}"${imageUrl ? " with image" : ""}`,
      );

      // also not the one who has already been mailed

      for (const user of ticketedUsers) {
        if (!user.email) {
          logger.warn(`Skipping user ${user.name ?? "Unknown"} — no email`);
          continue;
        }

        await sendEmail(
          user.email,
          `Important Update: ${event_data}`,
          {
            type: "event-update",
            content: {
              eventUpdate: {
                message: update,
                updatedAt: new Date().toISOString(),
                imageUrl: imageUrl || undefined,
              },
            },
          },
          user.name ?? "Attendee",
        );
      }
      return {
        success: true,
        message: `Update sent to ${ticketedUsers.length} ticket holders for event "${event_data}"${imageUrl ? " with image" : ""}`,
      };
    } catch (error) {
      logger.error("Error in updateInfo:", error);
      throw error;
    }
  }

  async getEventAnalytics(userId: string, eventId: string) {
    try {
      // Try cache first (short TTL for analytics)
      const cached = await getEventAnalyticsCache(eventId);
      if (cached) {
        logger.info(`Event analytics cache hit for ${eventId}`);
        return cached;
      }

      // OPTIMIZED: Lightweight ownership check first
      const event = await prisma.event.findUnique({
        where: { eventId },
        select: {
          eventId: true,
          title: true,
          date: true,
          capacity: true,
          ticketCounter: true,
          lister: {
            select: {
              user: {
                select: { userId: true },
              },
            },
          },
          EventAnalytics: {
            select: {
              views: true,
              clicks: true,
              ticketsSold: true,
              revenue: true,
              conversionRate: true,
              viewsByDay: true,
              clicksByDay: true,
              salesByDay: true,
              revenueByDay: true,
              ticketTypesSalesByDay: true,
              lastUpdated: true,
            },
          },
        },
      });

      if (!event) {
        throw new Error("Event not found");
      }

      if (event.lister.user.userId !== userId) {
        throw new Error(
          "You do not have permission to view this event's analytics",
        );
      }

      // OPTIMIZED: Use database aggregation for real-time revenue calculation
      const ticketStats = await prisma.$queryRaw<
        Array<{
          totalTickets: bigint;
          totalRevenue: number;
          ticketRecords: bigint;
        }>
      >`
        SELECT
          COALESCE(SUM(t.quantity), 0)::bigint as "totalTickets",
          COALESCE(SUM(
            CASE
              WHEN tt.platformfee > 0
              THEN t."totalPrice" - (tt.platformfee * t.quantity)
              ELSE t."totalPrice" * 0.95
            END
          ), 0)::float as "totalRevenue",
          COUNT(t."ticketId")::bigint as "ticketRecords"
        FROM "Ticket" t
        INNER JOIN "TicketType" tt ON t."ticketTypeId" = tt."ticketTypeId"
        WHERE tt."eventId" = ${eventId}
          AND t.status = 'SUCCESS'
      `;

      const realTimeTicketsSold = Number(ticketStats[0]?.totalTickets || 0);
      const realTimeRevenue = parseFloat(
        (ticketStats[0]?.totalRevenue || 0).toFixed(2),
      );

      // Read from EventAnalytics table (kept in sync by worker)
      const analytics = event.EventAnalytics;

      if (!analytics) {
        // If analytics don't exist yet, use real-time calculations
        return {
          eventId: event.eventId,
          title: event.title,
          views: 0,
          clicks: 0,
          ticketsSold: realTimeTicketsSold,
          revenue: realTimeRevenue,
          conversionRate: 0,
          totalTickets: Number(ticketStats[0]?.ticketRecords || 0),
          total_tickets: event.ticketCounter || 0,
          capacity: event.capacity,
          capacityUtilization: event.capacity
            ? parseFloat(
                ((realTimeTicketsSold * 100) / event.capacity).toFixed(2),
              )
            : null,
          eventDate: event.date,
          lastUpdated: new Date(),
          viewsByDay: {},
          clicksByDay: {},
          salesByDay: {},
          revenueByDay: {},
          ticketTypesSalesByDay: {},
        };
      }

      // Return analytics data with real-time revenue calculation
      const conversionRate =
        analytics.views > 0
          ? parseFloat(
              ((realTimeTicketsSold * 100) / analytics.views).toFixed(2),
            )
          : 0;

      const analyticsResult = {
        eventId: event.eventId,
        title: event.title,
        views: analytics.views || 0,
        clicks: analytics.clicks || 0,
        ticketsSold: realTimeTicketsSold,
        revenue: realTimeRevenue,
        conversionRate,
        total_tickets: event.ticketCounter || 0,
        capacity: event.capacity,
        capacityUtilization: event.capacity
          ? parseFloat(
              ((realTimeTicketsSold * 100) / event.capacity).toFixed(2),
            )
          : null,
        eventDate: event.date,
        lastUpdated: analytics.lastUpdated || new Date(),
        viewsByDay: analytics.viewsByDay || {},
        clicksByDay: analytics.clicksByDay || {},
        salesByDay: analytics.salesByDay || {},
        revenueByDay: analytics.revenueByDay || {},
        ticketTypesSalesByDay: analytics.ticketTypesSalesByDay || {},
      };

      // Cache analytics with short TTL (1 minute)
      await setEventAnalyticsCache(eventId, analyticsResult);

      return analyticsResult;
    } catch (error: any) {
      logger.error("Error in getEventAnalytics:", error);
      throw error;
    }
  }
}
