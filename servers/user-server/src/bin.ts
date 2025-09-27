import cluster from "node:cluster";
import { cpus } from "node:os";
import { startServer } from "./app";
import logger from "./config/logger";

const numCPUs = Math.min(cpus().length);

if (cluster.isPrimary) {
  logger.info(`Primary process ${process.pid} is running`);
  logger.info(`Forking ${numCPUs} workers...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker exits with exponential backoff
  let restartCount = 0;
  cluster.on("exit", (worker, code, signal) => {
    logger.warn(
      `Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}).`,
    );

    // Exponential backoff for rapid restarts
    const delay = Math.min(1000 * Math.pow(2, restartCount), 30000);
    restartCount++;

    setTimeout(() => {
      cluster.fork();
      restartCount = Math.max(0, restartCount - 1); // Decay restart count
    }, delay);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("Primary received SIGTERM, shutting down workers...");
    for (const id in cluster.workers) {
      cluster.workers[id]?.kill("SIGTERM");
    }
  });
} else {
  logger.info(`Worker ${process.pid} started`);

  // Worker-specific optimizations
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", error);
    process.exit(1); // Let cluster restart this worker
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1); // Let cluster restart this worker
  });

  startServer();
}
