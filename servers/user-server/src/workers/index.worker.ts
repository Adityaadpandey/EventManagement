// src/workers/index.worker.ts
import path from "path";
import { Worker as NodeWorker } from "worker_threads";
import logger from "../config/logger";

const startWorker = (workerPath: string) => {
  const worker = new NodeWorker(workerPath);

  worker.on("online", () => {
    logger.info(`Started worker: ${workerPath}`);
  });

  worker.on("error", (err) => {
    logger.error(`Error in worker ${workerPath}:`, err);
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      logger.error(`❌ Worker ${workerPath} exited with code ${code}`);
    } else {
      logger.info(`Worker ${workerPath} exited cleanly`);
    }
  });
};

// Absolute paths are required for worker_threads
startWorker(path.resolve(__dirname, "./phoneOtp.worker.js"));
startWorker(path.resolve(__dirname, "./email.worker.js"));
startWorker(path.resolve(__dirname, "./analytics.worker.js"));
