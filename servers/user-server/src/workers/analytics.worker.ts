import "dotenv/config";

import { PrismaClient } from "@repo/database";
import { parentPort } from "worker_threads";
import { config } from "../config";
import { redis } from "../config/redis";

const prisma = new PrismaClient({
  log: ["error"],
  datasources: {
    db: { url: config.DATABASE_URL },
  },
});

interface AnalyticsData {
  eventId: string;
  type: "event_view" | "ticket_purchase" | "ticket_success";
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

    console.log(`📊 Processing ${batch.length} analytics events...`);

    const events: AnalyticsData[] = batch
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch (err) {
          console.error("❌ Failed to parse event:", err);
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

        case "ticket_purchase":
          stats.ctaClicks += event.metadata?.quantity || 1;
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
          // Get real-time data from tickets for accurate sync
          const eventWithTickets = await prisma.event.findUnique({
            where: { eventId },
            select: {
              viewsCount: true,
              ctaClicksCount: true,
              Ticket: {
                where: { status: "SUCCESS" },
                select: {
                  quantity: true,
                  totalPrice: true,
                  ticketType: {
                    select: {
                      platformfee: true,
                    },
                  },
                },
              },
            },
          });

          if (!eventWithTickets) {
            console.warn(`⚠️ Event ${eventId} not found, skipping`);
            return;
          }

          // Calculate REAL ticket data from database
          const realTicketsSold = eventWithTickets.Ticket.reduce(
            (sum, ticket) => sum + ticket.quantity,
            0,
          );
          const realRevenue = eventWithTickets.Ticket.reduce((sum, ticket) => {
            // Calculate actual revenue by subtracting platform fees
            // If platform fee exists, subtract it; if 0, subtract 5% of total price
            const platformFee =
              ticket.ticketType.platformfee > 0
                ? ticket.ticketType.platformfee * ticket.quantity
                : ticket.totalPrice * 0.05;
            const actualRevenue = ticket.totalPrice - platformFee;
            return sum + actualRevenue;
          }, 0);

          // Update views and CTA clicks incrementally (these come from queue)
          const totalViews = eventWithTickets.viewsCount + stats.views;
          const totalCTA = eventWithTickets.ctaClicksCount + stats.ctaClicks;

          // Calculate conversion rate from REAL data
          const conversionRate =
            totalViews > 0
              ? parseFloat(((realTicketsSold * 100) / totalViews).toFixed(2))
              : 0;

          // Update Event with incremental views/clicks but REAL sales data
          await prisma.event.update({
            where: { eventId },
            data: {
              viewsCount: { increment: stats.views },
              ctaClicksCount: { increment: stats.ctaClicks },
              ticketsSold: realTicketsSold, // Set to real value
              revenue: realRevenue, // Set to real value
              conversionRate,
            },
          });

          // Update EventAnalytics with REAL values
          await prisma.eventAnalytics.upsert({
            where: { eventId },
            create: {
              eventId,
              views: totalViews,
              clicks: totalCTA,
              ticketsSold: realTicketsSold,
              revenue: realRevenue,
              conversionRate,
              lastUpdated: new Date(),
            },
            update: {
              views: totalViews,
              clicks: totalCTA,
              ticketsSold: realTicketsSold,
              revenue: realRevenue,
              conversionRate,
              lastUpdated: new Date(),
            },
          });

          console.log(
            `✅ Event ${eventId}: +${stats.views} views, +${stats.ctaClicks} CTA, ` +
              `${realTicketsSold} sold (real), ₹${realRevenue.toFixed(2)} revenue (real), CR ${conversionRate}%`,
          );
        } catch (err) {
          console.error(`❌ Failed analytics update for ${eventId}:`, err);
        }
      },
    );

    await Promise.allSettled(updates);
    console.log(`✅ Completed processing ${batch.length} analytics events`);
  } catch (err) {
    console.error("❌ Analytics worker error:", err);
  }
}

async function startWorker() {
  console.log("🚀 Analytics worker started");
  await processAnalyticsQueue();
  setInterval(processAnalyticsQueue, POLLING_INTERVAL);
}

process.on("SIGTERM", async () => {
  console.log("📊 Worker shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("📊 Worker shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

startWorker().catch((err) => {
  console.error("❌ Failed to start worker:", err);
  process.exit(1);
});

if (parentPort) parentPort.postMessage({ status: "ready" });
