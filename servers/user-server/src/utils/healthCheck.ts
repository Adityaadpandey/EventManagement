import os from "node:os";
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
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  system: {
    hostname: string;
    platform: string;
    arch: string;
  };
  version: string;
  services: {
    postgres: ServiceCheckResult;
    redis: ServiceCheckResult;
  };
}

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

export const healthCheck = async (): Promise<FullHealthReport> => {
  const [postgres, redisStatus] = await Promise.all([
    measure(() => prisma.$queryRaw`SELECT 1`),
    measure(() =>
      redis.ping().then((res) => {
        if (res !== "PONG") throw new Error("Invalid PONG");
      }),
    ),
  ]);

  const allHealthy = postgres.status && redisStatus.status;

  return {
    name: config.SERVICE_NAME || "auth-service",
    status: allHealthy ? "ok" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()), // seconds
    memoryUsage: process.memoryUsage(),
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
    },
    version: packageJson.version || "unknown",
    services: {
      postgres,
      redis: redisStatus,
    },
  };
};
