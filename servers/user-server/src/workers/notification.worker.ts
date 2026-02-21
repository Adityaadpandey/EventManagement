import { getLogger } from "@repo/logger";
import { Job, Worker } from "bullmq";
import * as webpush from "web-push";
import { config } from "../config";
import { prisma } from "../config/db";
import { redis } from "../config/redis";

const logger: any = getLogger("Notification Worker", "debug");

// Validate VAPID keys are configured
if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) {
  logger.error(
    "❌ VAPID keys not configured! Generate with: node scripts/generate-vapid-keys.js",
  );
  throw new Error(
    "VAPID keys required for push notifications. Run: node scripts/generate-vapid-keys.js",
  );
}

logger.info("✅ VAPID keys validated successfully");

// Configure VAPID details
webpush.setVapidDetails(
  "mailto:noreply@tixin.in",
  config.VAPID_PUBLIC_KEY,
  config.VAPID_PRIVATE_KEY,
);

// Notification job data interface
interface NotificationJobData {
  userId: string;
  title: string;
  body: string;
  link?: string;
  type: string;
  metadata?: Record<string, any>;
}

export const notificationWorker = new Worker(
  "notifications",
  async (job: Job<NotificationJobData>) => {
    const { userId, title, body, link, type, metadata } = job.data;

    try {
      // Step 1: Create in-app notification record
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message: body,
          link,
          type,
          metadata: metadata ? metadata : undefined,
          sent: false,
          read: false,
        },
      });

      logger.info(
        `Created notification ${notification.notificationId} for user ${userId}`,
      );

      // Step 2: Get all active push subscriptions for the user
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      if (subscriptions.length === 0) {
        logger.info(`No active push subscriptions for user ${userId}`);
        return;
      }

      // Step 3: Send web push to all subscriptions
      const pushPayload = JSON.stringify({
        title,
        body,
        icon: "/logos/pwa-icon-192.png",
        badge: "/logos/pwa-icon-192.png",
        data: {
          url: link || "/",
          notificationId: notification.notificationId,
          ...metadata,
        },
        tag: type,
      });

      const pushPromises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            pushPayload,
            {
              TTL: 24 * 60 * 60, // 24 hours
              urgency: "high",
            },
          );

          // Update lastUsedAt on success
          await prisma.pushSubscription.update({
            where: { subscriptionId: sub.subscriptionId },
            data: { lastUsedAt: new Date() },
          });

          logger.info(`Push sent to subscription ${sub.subscriptionId}`);
        } catch (error: any) {
          const isGone = error.statusCode === 410 || error.statusCode === 404;
          if (isGone) {
            await prisma.pushSubscription.update({
              where: { subscriptionId: sub.subscriptionId },
              data: { isActive: false },
            });
            logger.info(
              `Marked subscription ${sub.subscriptionId} as inactive (expired)`,
            );
          } else {
            // Transient error (ETIMEDOUT, etc.) — keep subscription active for next attempt
            const code = error.code || error.statusCode || "UNKNOWN";
            logger.warn(
              `Transient push error for ${sub.subscriptionId}: ${code} — keeping active`,
            );
          }
        }
      });

      await Promise.allSettled(pushPromises);

      // Mark notification as sent
      await prisma.notification.update({
        where: { notificationId: notification.notificationId },
        data: {
          sent: true,
          sentAt: new Date(),
        },
      });

      logger.info(`Notification ${notification.notificationId} sent`);
    } catch (err) {
      logger.error(`Failed to process notification job:`, err);
      throw err; // For retry
    }
  },
  {
    connection: redis,
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // Per 1000ms = 1 sec
    },
  },
);

notificationWorker.on("failed", (job: any, err) => {
  logger.error(`Notification job ${job?.id} failed:`, err);
});

notificationWorker.on("completed", (job: any) => {
  logger.info(`Notification job ${job?.id} completed`);
});
