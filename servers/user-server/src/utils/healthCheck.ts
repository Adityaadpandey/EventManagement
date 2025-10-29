import os from "node:os";
import { monitorEventLoopDelay } from "node:perf_hooks";
import packageJson from "../../package.json";
import { config } from "../config";
import { prisma } from "../config/db";
import { redis } from "../config/redis";

interface ServiceCheckResult {
  status: boolean;
  latencyUs: number;
  error?: string;
}

interface FullHealthReport {
  name: string;
  status: "ok" | "unhealthy";
  timestamp: string;
  uptimeSeconds: number;
  memoryUsage: NodeJS.MemoryUsage;
  runtime: {
    nodeVersion: string;
    pid: number;
    cpuUsage: NodeJS.CpuUsage;
    eventLoopDelayMs: number;
    activeHandles: number;
    activeRequests: number;
  };
  system: {
    hostname: string;
    platform: string;
    arch: string;
    cpuLoadAvg: number[];
    freeMem: number;
    totalMem: number;
    memUsagePercent: number;
    uptimeSeconds: number;
  };
  buildInfo: {
    version: string;
    buildDate: string;
    environment: string;
    serviceName: string;
  };
  services: {
    postgres: ServiceCheckResult;
    redis: ServiceCheckResult;
  };
}

// Measure latency of a function (microseconds)
const measure = async (
  fn: () => Promise<void>,
): Promise<ServiceCheckResult> => {
  const start = process.hrtime.bigint();
  try {
    await fn();
    const end = process.hrtime.bigint();
    const latencyUs = Number(end - start) / 1_000;
    return { status: true, latencyUs };
  } catch (error: any) {
    const end = process.hrtime.bigint();
    const latencyUs = Number(end - start) / 1_000;
    return {
      status: false,
      latencyUs,
      error: error?.message || "Unknown error",
    };
  }
};

// Measure Node.js event loop delay (average over 100ms)
const getEventLoopDelay = async (): Promise<number> => {
  const h = monitorEventLoopDelay();
  h.enable();
  await new Promise((resolve) => setTimeout(resolve, 100));
  h.disable();
  return h.mean / 1e6; // convert nanoseconds → ms
};

export const healthCheck = async (): Promise<FullHealthReport> => {
  // Check dependencies (Postgres + Redis)
  const [postgres, redisStatus] = await Promise.all([
    measure(() => prisma.$queryRaw`SELECT 1`),
    measure(() =>
      redis.ping().then((res) => {
        if (res !== "PONG") throw new Error("Invalid PONG");
      }),
    ),
  ]);

  const allHealthy = postgres.status && redisStatus.status;

  // Compute metrics
  const memory = process.memoryUsage();
  const cpu = process.cpuUsage();
  const eventLoopDelayMs = await getEventLoopDelay();

  return {
    name: config.SERVICE_NAME || "tixin-production",
    status: allHealthy ? "ok" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsage: memory,

    runtime: {
      nodeVersion: process.version,
      pid: process.pid,
      cpuUsage: cpu,
      eventLoopDelayMs,
      activeHandles: (process as any)._getActiveHandles()?.length || 0,
      activeRequests: (process as any)._getActiveRequests()?.length || 0,
    },

    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpuLoadAvg: os.loadavg(),
      freeMem: os.freemem(),
      totalMem: os.totalmem(),
      memUsagePercent: Math.round((1 - os.freemem() / os.totalmem()) * 100),
      uptimeSeconds: os.uptime(),
    },

    buildInfo: {
      version: process.env.APP_VERSION || packageJson.version || "unknown",
      buildDate: process.env.BUILD_DATE || "unknown",
      environment: config.NODE_ENV || "production",
      serviceName: config.SERVICE_NAME || "user-service",
    },

    services: {
      postgres,
      redis: redisStatus,
    },
  };
};
