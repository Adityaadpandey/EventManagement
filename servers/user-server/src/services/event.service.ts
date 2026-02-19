import { prisma } from "../config/db";
import logger from "../config/logger";
import {
  getEventAnalyticsCache,
  getEventCache,
  getListerEventsCache,
  getPublicEventCache,
  invalidateEventCaches,
  setEventAnalyticsCache,
  setEventCache,
  setListerEventsCache,
  setPublicEventCache,
} from "../lib/cache";
import { sendEmail } from "../lib/mail";
import { notificationQueue } from "../lib/queues";
import { CreateEventRequest } from "../types/event";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/errors";

export class EventService {
  async createEvent(userId: string, eventData: CreateEventRequest) {
    try {
      // First, verify the user exists and has a lister profile
      const user = await prisma.user.findUnique({
        where: { userId },
        include: { Lister: true },
      });

      if (!user) {
        throw new NotFoundError("User not found");
      }

      if (!user.Lister) {
        throw new BadRequestError("User must be a lister to create events");
      }

      if (user.Lister.status !== "COMPLETED") {
        throw new ForbiddenError(
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
          throw new BadRequestError(`${field} is required`);
        }
      }

      // Validate ticket types
      if (!eventData.ticketTypes || eventData.ticketTypes.length === 0) {
        throw new BadRequestError("At least one ticket type is required");
      }

      for (const ticketType of eventData.ticketTypes) {
        if (
          !ticketType.name ||
          ticketType.price < 0 ||
          ticketType.quantity <= 0
        ) {
          throw new BadRequestError(
            "Invalid ticket type data. Name, valid price, and positive quantity are required",
          );
        }

        // Validate ticket-specific custom fields if provided
        if (ticketType.customField && ticketType.customField.length > 0) {
          for (const field of ticketType.customField) {
            if (!field.label || !field.fieldType) {
              throw new BadRequestError(
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
        throw new BadRequestError("Invalid date or time format");
      }

      // Check if event date is in the future
      if (eventDate < new Date()) {
        throw new BadRequestError("Event date must be in the future");
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
        throw new NotFoundError("Event not found");
      }

      // Store in cache
      await setPublicEventCache(eventId, event);

      return event;
    } catch (error) {
      logger.error("Error in getPublicEventDetails:", error);
      throw error;
    }
  }

  async getEventDetails(
    userId: string,
    eventId: string,
    isAdmin: boolean = false,
  ) {
    try {
      // Try cache first
      const cached = await getEventCache(eventId);

      if (cached) {
        // Verify ownership from cache
        const cachedEvent = cached as any;
        if (cachedEvent.lister?.user?.userId !== userId && !isAdmin) {
          throw new UnauthorizedError(
            "You do not have permission to view this event",
          );
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
        throw new NotFoundError("Event not found");
      }

      if (event.lister.user.userId !== userId && !isAdmin) {
        throw new ForbiddenError(
          "You do not have permission to view this event",
        );
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
          CustomField: {
            include: {
              _count: {
                select: { AttendeeFieldResponse: true },
              },
            },
          },
        },
      });

      if (!existingEvent) {
        throw new NotFoundError(`Event with ID ${eventId} not found`);
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
          throw new BadRequestError(
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
      if (customFields && customFields.length > 0) {
        const hasFieldResponses = existingEvent.CustomField.some(
          (cf) => cf._count.AttendeeFieldResponse > 0,
        );
        if (hasFieldResponses) {
          throw new BadRequestError(
            "Cannot modify or delete custom fields after attendees have submitted responses. You can only add new custom fields.",
          );
        }
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

  async updateInfo(
    eventId: string,
    update: string,
    userId: string,
    imageUrl?: string,
  ) {
    try {
      // Validate imageUrl if provided
      if (imageUrl) {
        try {
          new URL(imageUrl);
        } catch {
          logger.warn("Invalid imageUrl provided — ignoring");
          imageUrl = undefined;
        }
      }

      // Fetch event and ticket holders
      const event = await prisma.event.findUnique({
        where: { eventId },
        include: {
          Ticket: {
            include: {
              user: {
                select: { email: true, name: true, userId: true },
              },
            },
          },
        },
      });

      if (!event) {
        throw new NotFoundError("Event not found");
      }

      if (event.availableMailUpdates <= 0) {
        throw new BadRequestError(
          "No more email updates available for this event",
        );
      }

      const eventTitle = event.title;

      // Extract users from tickets
      const ticketedUsers = event.Ticket.map((t) => t.user);

      logger.info(
        `Fetched ${ticketedUsers.length} ticket holders for event "${eventTitle}"${
          imageUrl ? " with image" : ""
        }`,
      );

      const uniqueUsersMap = new Map<
        string,
        { email: string; name: string; userId: string }
      >();

      ticketedUsers.forEach((u) => {
        if (!uniqueUsersMap.has(u.userId) && u.email) {
          uniqueUsersMap.set(u.userId, {
            email: u.email,
            name: u.name || "Unknown",
            userId: u.userId,
          });
        }
      });

      const uniqueUsers = Array.from(uniqueUsersMap.values());

      if (uniqueUsers.length === 0) {
        logger.info(`No ticket buyers to send emails to`);
        return {
          success: true,
          message: "No previous buyers to send emails to",
          emailsSent: 0,
        };
      }

      for (const user of uniqueUsers) {
        if (!user.email) {
          logger.warn(`Skipping user ${user.name ?? "Unknown"} — no email`);
          continue;
        }

        await sendEmail(
          user.email,
          `Important Update: ${eventTitle}`,
          {
            type: "event-update",
            content: {
              eventUpdate: {
                message: update,
                updatedAt: new Date().toISOString(),
                imageUrl: imageUrl || undefined,
                eventName: event.title,
                eventDate: event.date.toISOString().split("T")[0],
                eventVenue: event.location || undefined,
              },
            },
          },
          user.name ?? "Attendee",
        );
      }

      // Send notifications to all ticket holders
      for (const user of uniqueUsers) {
        await notificationQueue.add("send-notification", {
          userId: user.userId,
          type: "EVENT_UPDATE",
          title: `Update: ${eventTitle}`,
          body: update,
          link: `/events/${eventId}`,
          metadata: {
            eventId,
            imageUrl: imageUrl || undefined,
          },
        });
      }

      // Decrement available updates and invalidate cache
      await prisma.event.update({
        where: { eventId },
        data: { availableMailUpdates: { decrement: 1 } },
      });
      await invalidateEventCaches(eventId, userId);

      return {
        message: `Update sent to ${uniqueUsers.length} ticket holders for event "${eventTitle}"`,
        emailsSent: uniqueUsers.length,
        updatesRemaining: event.availableMailUpdates - 1,
      };
    } catch (error) {
      logger.error("Error in updateInfo:", error);
      throw error;
    }
  }

  async getEventAnalytics(
    userId: string,
    eventId: string,
    isAdmin: boolean = false,
  ) {
    try {
      // Try cache first (short TTL for analytics)
      const cached = await getEventAnalyticsCache(eventId);
      if (cached) {
        logger.info(`Event analytics cache hit for ${eventId}`);
        if (!isAdmin) {
          // Verify ownership from cache
          const cachedEvent = cached as any;
          if (cachedEvent.ownerId !== userId) {
            throw new UnauthorizedError(
              "You do not have permission to view this event's analytics",
            );
          }
        }
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
        throw new NotFoundError("Event not found");
      }

      if (!isAdmin && event.lister.user.userId !== userId) {
        throw new UnauthorizedError(
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
        ownerId: event.lister.user.userId,
      };

      // Cache analytics with short TTL (1 minute)
      await setEventAnalyticsCache(eventId, analyticsResult);

      return analyticsResult;
    } catch (error: any) {
      logger.error("Error in getEventAnalytics:", error);
      throw error;
    }
  }

  async changeEventStatus(
    userId: string,
    eventId: string,
    canBuy: boolean,
    isAdmin: boolean = false,
  ) {
    try {
      const event = await prisma.event.findUnique({
        where: { eventId },
        select: {
          lister: {
            select: {
              user: {
                select: { userId: true },
              },
            },
          },
        },
      });

      if (!event) {
        throw new NotFoundError("Event not found");
      }
      if (event.lister.user.userId !== userId && !isAdmin) {
        throw new ForbiddenError(
          "You do not have permission to change this event's status",
        );
      }

      const updatedEvent = await prisma.event.update({
        where: { eventId },
        data: { canBuy },
      });
      await invalidateEventCaches(eventId, userId);

      return {
        message: `Event canBuy status updated to ${canBuy} successfully`,
        data: updatedEvent,
      };
    } catch (error) {
      logger.error("Error changing event status:", error);
      throw error;
    }
  }
}
