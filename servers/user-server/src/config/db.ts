import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";
import logger from "./logger";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Create a pg Pool so we can inspect pool stats
const pool = new Pool({
  connectionString,
});

// Use the pool in the PrismaPg adapter
const adapter = new PrismaPg(pool);

// Enable warn logs as events so $on('warn') is typed correctly
const prisma = new PrismaClient({
  adapter,
  log: [
    { level: "warn", emit: "event" },
    { level: "error", emit: "event" },
    // { level: 'info', emit: 'event' },
  ],
});

export { prisma };

// Graceful shutdown for Prisma + pool
process.on("beforeExit", async () => {
  try {
    clearInterval(poolMetricsInterval);
    await prisma.$disconnect();
    await pool.end();
  } catch (err) {
    logger.error("Error during graceful shutdown", err);
  }
});

// Warn handler (now correctly typed)
prisma.$on("warn", (e) => {
  if (e.message?.toLowerCase().includes("connection")) {
    logger.warn("Prisma connection warning", e);
  } else {
    logger.warn("Prisma warning", e);
  }
});

// Helper to get pool stats
function getPoolMetrics() {
  return {
    totalCount: pool.totalCount, // total clients
    idleCount: pool.idleCount, // idle clients
    waitingCount: pool.waitingCount, // queued requests
    activeCount: pool.totalCount - pool.idleCount, // active connections
    maxPool: pool.options.max, // configured max
  };
}

// Periodically log pool stats
const poolMetricsInterval = setInterval(() => {
  try {
    const metrics = getPoolMetrics();
    logger.info("Prisma pool stats", metrics);
  } catch (err) {
    logger.error("Failed to fetch pool metrics", err);
  }
}, 60_000);
