import cron from "node-cron";
import { prisma } from "../config/db";
import logger from "../config/logger";

/**
 * Cron job to clean up expired push notification subscriptions
 * Runs daily at 2:00 AM
 */
export function startSubscriptionCleanupJob() {
  // Run daily at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    logger.info("Running subscription cleanup job");

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Delete subscriptions older than 30 days that haven't been updated
      const result = await prisma.pushSubscription.deleteMany({
        where: {
          updatedAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      logger.info(
        `Subscription cleanup completed: removed ${result.count} expired subscriptions`,
      );
    } catch (error) {
      logger.error("Error in subscription cleanup job:", error);
    }
  });

  logger.info("Subscription cleanup cron job scheduled (daily at 2:00 AM)");
}
