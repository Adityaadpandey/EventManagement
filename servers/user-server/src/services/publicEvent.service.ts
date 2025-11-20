import { prisma } from "../config/db";
import logger from "../config/logger";
import { redis } from "../config/redis";

export class PublicEventService {
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
}
