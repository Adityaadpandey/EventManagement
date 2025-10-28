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
  ctaClicks: number; // attempted purchases
  ticketsSold: number; // successful purchases
  revenue: number;
}

const BATCH_SIZE = 100;
const POLLING_INTERVAL = 10000; // 10s

async function processAnalyticsQueue() {
  try {
    const batch = await redis.rpop("analytics:queue", BATCH_SIZE);
    if (!batch || batch.length === 0) return;

    console.log(`📊 Processing ${batch.length} analytics events...`);

    // Parse and group events
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
          // User attempted to buy tickets (regardless of success)
          stats.ctaClicks += event.metadata?.quantity || 1;
          break;

        case "ticket_success":
          // Successful ticket payment
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
          const current = await prisma.event.findUnique({
            where: { eventId },
            select: {
              viewsCount: true,
              ctaClicksCount: true,
              ticketsSold: true,
              revenue: true,
            },
          });

          if (!current) {
            console.warn(`⚠️ Event ${eventId} not found, skipping`);
            return;
          }

          const totalViews = current.viewsCount + stats.views;
          const totalCTA = current.ctaClicksCount + stats.ctaClicks;
          const totalTicketsSold = current.ticketsSold + stats.ticketsSold;
          const totalRevenue = current.revenue + stats.revenue;

          const conversionRate =
            totalCTA > 0
              ? Math.round((totalTicketsSold / totalCTA) * 10000) / 100
              : 0;

          // Update main event
          await prisma.event.update({
            where: { eventId },
            data: {
              viewsCount: { increment: stats.views },
              ctaClicksCount: { increment: stats.ctaClicks },
              ticketsSold: { increment: stats.ticketsSold },
              revenue: { increment: stats.revenue },
              conversionRate,
            },
          });

          // Update analytics table (absolute sync)
          await prisma.eventAnalytics.upsert({
            where: { eventId },
            create: {
              eventId,
              views: totalViews,
              clicks: totalCTA,
              ticketsSold: totalTicketsSold,
              revenue: totalRevenue,
              conversionRate,
              lastUpdated: new Date(),
            },
            update: {
              views: totalViews,
              clicks: totalCTA,
              ticketsSold: totalTicketsSold,
              revenue: totalRevenue,
              conversionRate,
              lastUpdated: new Date(),
            },
          });

          console.log(
            `✅ Event ${eventId}: +${stats.views} views, +${stats.ctaClicks} CTA, +${stats.ticketsSold} sold, ₹${stats.revenue} revenue, CR ${conversionRate}%`,
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
