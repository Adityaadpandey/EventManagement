import "dotenv/config";

import { getLogger } from "@repo/logger";
import { parentPort } from "worker_threads";
import { prisma } from "../config/db";
import { redis } from "../config/redis";

const logger: any = getLogger("Analytics Worker", "debug");

interface AnalyticsData {
  eventId: string;
  type: "event_view" | "event_cta_click" | "ticket_purchase" | "ticket_success";
  metadata?: Record<string, any>;
  timestamp: number;
}

interface EventStats {
  views: number;
  ctaClicks: number;
  ticketsSold: number;
  revenue: number;
}

const BATCH_SIZE = 100;
const POLLING_INTERVAL = 10000; // 10s

async function processAnalyticsQueue() {
  try {
    const batch = await redis.rpop("analytics:queue", BATCH_SIZE);
    if (!batch || batch.length === 0) return;

    logger.info(`Processing ${batch.length} analytics events...`);

    const events: AnalyticsData[] = batch
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch (err) {
          logger.error("Failed to parse event:", err);
          return null;
        }
      })
      .filter((e): e is AnalyticsData => e !== null);

    const eventStatsMap = new Map<string, EventStats>();

    for (const event of events) {
      const stats = eventStatsMap.get(event.eventId) || {
        views: 0,
        ctaClicks: 0,
        ticketsSold: 0,
        revenue: 0,
      };

      switch (event.type) {
        case "event_view":
          stats.views++;
          break;

        case "event_cta_click":
          stats.ctaClicks += 1;
          break;

        case "ticket_purchase":
          stats.ticketsSold += event.metadata?.quantity || 1;
          stats.revenue += event.metadata?.amount || 0;
          break;

        case "ticket_success":
          stats.ticketsSold += event.metadata?.quantity || 1;
          stats.revenue += event.metadata?.amount || 0;
          break;
      }

      eventStatsMap.set(event.eventId, stats);
    }

    // Batch update events in DB
    const updates = Array.from(eventStatsMap.entries()).map(
      async ([eventId, stats]) => {
        try {
          // Get real-time data from event and tickets for accurate sync
          const eventWithTickets = await prisma.event.findUnique({
            where: { eventId },
            select: {
              eventId: true,
              Ticket: {
                where: { status: "SUCCESS" },
                select: {
                  quantity: true,
                  totalPrice: true,
                  ticketTypeId: true,
                  createdAt: true,
                  ticketType: {
                    select: {
                      ticketTypeId: true,
                      name: true,
                      platformfee: true,
                    },
                  },
                },
              },
            },
          });

          // Get existing analytics for incremental updates
          const existingAnalytics = await prisma.eventAnalytics.findUnique({
            where: { eventId },
            select: {
              views: true,
              clicks: true,
            },
          });

          if (!eventWithTickets) {
            logger.warn(`Event ${eventId} not found, skipping`);
            return;
          }

          // Calculate REAL ticket data from database
          const realTicketsSold = eventWithTickets.Ticket.reduce(
            (sum, ticket) => sum + ticket.quantity,
            0,
          );
          const realRevenue = eventWithTickets.Ticket.reduce((sum, ticket) => {
            // Calculate actual revenue by subtracting platform fees
            let actualRevenue = ticket.totalPrice;

            // Only subtract platform fee if it exists and is > 0
            if (ticket.ticketType.platformfee > 0) {
              const platformFee =
                ticket.ticketType.platformfee * ticket.quantity;
              actualRevenue = ticket.totalPrice - platformFee;
            } else {
              // If no platform fee, subtract 5% as default platform fee
              const defaultPlatformFee = ticket.totalPrice * 0.05;
              actualRevenue = ticket.totalPrice - defaultPlatformFee;
            }

            return sum + actualRevenue;
          }, 0);

          // Update views and CTA clicks incrementally (these come from queue)
          const totalViews = (existingAnalytics?.views || 0) + stats.views;
          const totalCTA = (existingAnalytics?.clicks || 0) + stats.ctaClicks;

          // Calculate conversion rate from REAL data
          const conversionRate =
            totalViews > 0
              ? parseFloat(((realTicketsSold * 100) / totalViews).toFixed(2))
              : 0;

          // Event table only stores ticketCounter now - all analytics in EventAnalytics

          // Get current date for daily tracking
          const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

          // Get existing daily analytics to merge data
          const existingDailyAnalytics = await prisma.eventAnalytics.findUnique(
            {
              where: { eventId },
              select: {
                viewsByDay: true,
                clicksByDay: true,
                salesByDay: true,
                revenueByDay: true,
                ticketTypesSalesByDay: true,
              },
            },
          );

          // Prepare daily data updates
          const viewsByDay = (existingDailyAnalytics?.viewsByDay as any) || {};
          const clicksByDay =
            (existingDailyAnalytics?.clicksByDay as any) || {};
          const salesByDay = (existingDailyAnalytics?.salesByDay as any) || {};
          const revenueByDay =
            (existingDailyAnalytics?.revenueByDay as any) || {};
          const ticketTypesSalesByDay =
            (existingDailyAnalytics?.ticketTypesSalesByDay as any) || {};

          // Update today's data (increment existing or set new)
          viewsByDay[today] = (viewsByDay[today] || 0) + stats.views;
          clicksByDay[today] = (clicksByDay[today] || 0) + stats.ctaClicks;
          salesByDay[today] = realTicketsSold; // Set to real current value
          revenueByDay[today] = parseFloat(realRevenue.toFixed(2)); // Set to real current value

          // Calculate ticket type sales by day - group all tickets by date and type
          const ticketsByDate: Record<
            string,
            Record<string, { quantity: number; revenue: number; name: string }>
          > = {};

          for (const ticket of eventWithTickets.Ticket) {
            const ticketDate = ticket.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD
            const ticketTypeId = ticket.ticketTypeId;
            const ticketTypeName = ticket.ticketType?.name || "Unknown";

            if (!ticketsByDate[ticketDate]) {
              ticketsByDate[ticketDate] = {};
            }

            if (!ticketsByDate[ticketDate][ticketTypeId]) {
              ticketsByDate[ticketDate][ticketTypeId] = {
                quantity: 0,
                revenue: 0,
                name: ticketTypeName,
              };
            }

            ticketsByDate[ticketDate][ticketTypeId].quantity += ticket.quantity;

            // Calculate revenue for this ticket type (subtract platform fee)
            let ticketRevenue = ticket.totalPrice;
            if (ticket.ticketType?.platformfee > 0) {
              const platformFee =
                ticket.ticketType.platformfee * ticket.quantity;
              ticketRevenue = ticket.totalPrice - platformFee;
            } else {
              // Default 5% platform fee
              const defaultPlatformFee = ticket.totalPrice * 0.05;
              ticketRevenue = ticket.totalPrice - defaultPlatformFee;
            }

            ticketsByDate[ticketDate][ticketTypeId].revenue += parseFloat(
              ticketRevenue.toFixed(2),
            );
          }

          // Update ticket types sales by day with complete data
          Object.assign(ticketTypesSalesByDay, ticketsByDate);

          // Update EventAnalytics with REAL values and daily tracking
          await prisma.eventAnalytics.upsert({
            where: { eventId },
            create: {
              eventId,
              views: totalViews,
              clicks: totalCTA,
              ticketsSold: realTicketsSold,
              revenue: realRevenue,
              conversionRate,

              viewsByDay,
              clicksByDay,
              salesByDay,
              revenueByDay,
              ticketTypesSalesByDay,
              lastUpdated: new Date(),
            },
            update: {
              views: totalViews,
              clicks: totalCTA,
              ticketsSold: realTicketsSold,
              revenue: realRevenue,
              conversionRate,

              viewsByDay,
              clicksByDay,
              salesByDay,
              revenueByDay,
              ticketTypesSalesByDay,
              lastUpdated: new Date(),
            },
          });

          logger.info(
            `✅ Event ${eventId}: +${stats.views} views, +${stats.ctaClicks} CTA, ` +
              `${realTicketsSold} sold (real), ₹${realRevenue.toFixed(2)} revenue (real), CR ${conversionRate}%`,
          );
        } catch (err) {
          logger.error(`Failed analytics update for ${eventId}:`, err);
        }
      },
    );

    await Promise.allSettled(updates);
    logger.info(`Completed processing ${batch.length} analytics events`);
  } catch (err) {
    logger.error("Analytics worker error:", err);
  }
}

async function startWorker() {
  logger.info("Analytics worker started");
  await processAnalyticsQueue();
  setInterval(processAnalyticsQueue, POLLING_INTERVAL);
}

process.on("SIGTERM", async () => {
  logger.info("Worker shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("Worker shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

startWorker().catch((err) => {
  logger.error("Failed to start worker:", err);
  process.exit(1);
});

if (parentPort) parentPort.postMessage({ status: "ready" });
