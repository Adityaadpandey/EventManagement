import "dotenv/config";

import { PrismaClient } from "@repo/database";
import { parentPort } from "worker_threads";
import { config } from "../config";
import { redis } from "../config/redis";

const prisma = new PrismaClient({
  log: ["error"], // Log only errors to reduce noise
  datasources: {
    db: {
      url: config.DATABASE_URL,
    },
  },
});

interface AnalyticsData {
  eventId: string;
  type: "event_view" | "event_cta_click" | "ticket_purchase";
  userId?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

interface EventStats {
  views: number;
  ctaClicks: number;
  ticketsSold: number;
  revenue: number;
}

const BATCH_SIZE = 100; // Process 100 events at a time
const POLLING_INTERVAL = 10000; // Poll every 10 seconds

/**
 * Process analytics queue and batch update the database
 */
async function processAnalyticsQueue() {
  try {
    // Get batch of analytics events from Redis queue
    const batch = await redis.rpop("analytics:queue", BATCH_SIZE);

    if (!batch || batch.length === 0) {
      return;
    }

    console.log(`📊 Processing ${batch.length} analytics events...`);

    // Parse all events
    const events: AnalyticsData[] = batch
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch (error) {
          console.error("Failed to parse analytics event:", error);
          return null;
        }
      })
      .filter((e): e is AnalyticsData => e !== null);

    // Group events by eventId for batch updates
    const eventStatsMap = new Map<string, EventStats>();

    events.forEach((event) => {
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
          stats.ctaClicks++;
          break;
        case "ticket_purchase":
          stats.ticketsSold += event.metadata?.quantity || 1;
          stats.revenue += event.metadata?.amount || 0;
          break;
      }

      eventStatsMap.set(event.eventId, stats);
    });

    // Batch update database
    const updatePromises = Array.from(eventStatsMap.entries()).map(
      async ([eventId, stats]) => {
        try {
          // Update Event model
          await prisma.event.update({
            where: { eventId },
            data: {
              viewsCount: { increment: stats.views },
              ctaClicksCount: { increment: stats.ctaClicks },
              ticketsSold: { increment: stats.ticketsSold },
              revenue: { increment: stats.revenue },
              conversionRate:
                stats.views > 0 ? (stats.ticketsSold / stats.views) * 100 : 0,
            },
          });

          // Update EventAnalytics if it exists, create if it doesn't
          const analyticsData = events.filter((e) => e.eventId === eventId);

          await prisma.eventAnalytics.upsert({
            where: { eventId },
            create: {
              eventId,
              views: stats.views,
              clicks: stats.ctaClicks,
              ticketsSold: stats.ticketsSold,
              revenue: stats.revenue,
              conversionRate:
                stats.views > 0 ? (stats.ticketsSold / stats.views) * 100 : 0,
              lastUpdated: new Date(),
            },
            update: {
              views: { increment: stats.views },
              clicks: { increment: stats.ctaClicks },
              ticketsSold: { increment: stats.ticketsSold },
              revenue: { increment: stats.revenue },
              lastUpdated: new Date(),
            },
          });

          console.log(
            `✅ Updated analytics for event ${eventId}: +${stats.views} views, +${stats.ctaClicks} clicks, +${stats.ticketsSold} tickets sold`,
          );
        } catch (error) {
          console.error(
            `❌ Failed to update analytics for event ${eventId}:`,
            error,
          );

          // Re-queue failed events (with retry limit)
          const retryCount = (event as any).retryCount || 0;
          if (retryCount < 3) {
            const retryEvents = events
              .filter((e) => e.eventId === eventId)
              .map((e) => ({ ...e, retryCount: retryCount + 1 }));

            await redis.lpush(
              "analytics:queue",
              ...retryEvents.map((e) => JSON.stringify(e)),
            );
          }
        }
      },
    );

    await Promise.allSettled(updatePromises);

    console.log(`✅ Completed processing ${batch.length} analytics events`);
  } catch (error) {
    console.error("❌ Analytics worker error:", error);
  }
}

/**
 * Main worker loop
 */
async function startWorker() {
  console.log("🚀 Analytics worker started");

  // Initial run
  await processAnalyticsQueue();

  // Set up polling interval
  setInterval(async () => {
    await processAnalyticsQueue();
  }, POLLING_INTERVAL);
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("📊 Analytics worker shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("📊 Analytics worker shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

// Start the worker
startWorker().catch((error) => {
  console.error("❌ Failed to start analytics worker:", error);
  process.exit(1);
});

// Notify parent thread that worker is ready
if (parentPort) {
  parentPort.postMessage({ status: "ready" });
}
