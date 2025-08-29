import { Queue } from "bullmq";
import { redis } from "../config/redis";

export const analyticsQueue = new Queue("analytics", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const emailQueue = new Queue("emails", {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 1000, // first retry after 1s, then 2s, 4s, etc.
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
