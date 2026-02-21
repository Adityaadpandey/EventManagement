import webpush from "web-push";
import { config } from "../config";
import { prisma } from "../config/db";
import logger from "../config/logger";

// Configure VAPID details for web push
webpush.setVapidDetails(
  "mailto:support@tixin.in",
  config.VAPID_PUBLIC_KEY!,
  config.VAPID_PRIVATE_KEY!,
);

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
}

export class NotificationService {
  /**
   * Subscribe a user to push notifications
   */
  async subscribe(userId: string, subscription: PushSubscription) {
    try {
      // Store subscription in database
      await prisma.pushSubscription.upsert({
        where: {
          endpoint: subscription.endpoint,
        },
        create: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          isActive: true,
        },
        update: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          isActive: true,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info(`Push subscription saved for user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error("Error saving push subscription:", error);
      throw error;
    }
  }

  /**
   * Create an in-app notification
   */
  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: any;
    link?: string;
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          metadata: data.metadata,
          link: data.link,
          read: false,
        },
      });

      logger.info(`In-app notification created for user ${data.userId}`);
      return notification;
    } catch (error) {
      logger.error("Error creating in-app notification:", error);
      throw error;
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    try {
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      const where = { userId };

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
        }),
        prisma.notification.count({ where }),
      ]);

      return {
        notifications,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error(`Error fetching notifications for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          notificationId,
          userId, // Ensure user owns this notification
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new Error("Notification not found or unauthorized");
      }

      logger.info(`Notification ${notificationId} marked as read`);
      return result;
    } catch (error) {
      logger.error(`Error marking notification as read:`, error);
      throw error;
    }
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      logger.info(
        `Marked ${result.count} notifications as read for user ${userId}`,
      );
      return { success: true, count: result.count };
    } catch (error) {
      logger.error(`Error marking all notifications as read:`, error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          notificationId,
          userId, // Ensure user owns this notification
        },
      });

      if (result.count === 0) {
        throw new Error("Notification not found or unauthorized");
      }

      logger.info(`Notification ${notificationId} deleted`);
      return result;
    } catch (error) {
      logger.error(`Error deleting notification:`, error);
      throw error;
    }
  }

  /**
   * Clear all notifications for a user (delete all)
   */
  async clearAllNotifications(userId: string) {
    try {
      const result = await prisma.notification.deleteMany({
        where: { userId },
      });

      logger.info(`Cleared ${result.count} notifications for user ${userId}`);
      return result;
    } catch (error) {
      logger.error("Error clearing all notifications:", error);
      throw error;
    }
  }

  /**
   * Cleanup stale push subscriptions (older than 90 days)
   */
  async cleanupStaleSubscriptions() {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await prisma.pushSubscription.deleteMany({
        where: {
          OR: [
            {
              isActive: false,
              updatedAt: {
                lt: ninetyDaysAgo,
              },
            },
            {
              lastUsedAt: {
                lt: ninetyDaysAgo,
              },
            },
          ],
        },
      });

      logger.info(`Cleaned up ${result.count} stale push subscriptions`);
      return { success: true, count: result.count };
    } catch (error) {
      logger.error("Error cleaning up stale subscriptions:", error);
      throw error;
    }
  }

  /**
   * Unsubscribe a user from push notifications
   */
  async unsubscribe(userId: string, endpoint: string) {
    try {
      await prisma.pushSubscription.updateMany({
        where: {
          userId,
          endpoint,
        },
        data: {
          isActive: false,
        },
      });

      logger.info(`Push subscription removed for user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error("Error removing push subscription:", error);
      throw error;
    }
  }

  /**
   * Send notification to a specific user
   */
  async sendToUser(userId: string, payload: NotificationPayload) {
    try {
      // Get all active subscriptions for the user
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      if (subscriptions.length === 0) {
        logger.warn(`No push subscriptions found for user ${userId}`);
        return { success: false, message: "No subscriptions found" };
      }

      const results = await Promise.allSettled(
        subscriptions.map((sub: any) =>
          this.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload,
          ),
        ),
      );

      // Only deactivate subscriptions confirmed gone (404/410), not transient failures
      const goneIds = results
        .map((result: any, index: number) => ({
          result,
          subscription: subscriptions[index],
        }))
        .filter(
          ({ result }: any) =>
            result.status === "rejected" &&
            result.reason?.subscriptionGone === true,
        )
        .map(({ subscription }: any) => subscription.subscriptionId);

      if (goneIds.length > 0) {
        await prisma.pushSubscription.updateMany({
          where: { subscriptionId: { in: goneIds } },
          data: { isActive: false },
        });
        logger.info(
          `Deactivated ${goneIds.length} expired subscriptions for user ${userId}`,
        );
      }

      const successCount = results.filter(
        (r: any) => r.status === "fulfilled",
      ).length;
      logger.info(
        `Sent notification to ${successCount}/${subscriptions.length} devices for user ${userId}`,
      );

      return {
        success: true,
        sent: successCount,
        total: subscriptions.length,
      };
    } catch (error) {
      logger.error(`Error sending notification to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(userIds: string[], payload: NotificationPayload) {
    try {
      const results = await Promise.allSettled(
        userIds.map((userId) => this.sendToUser(userId, payload)),
      );

      const successCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      logger.info(
        `Sent notification to ${successCount}/${userIds.length} users`,
      );

      return {
        success: true,
        sent: successCount,
        total: userIds.length,
      };
    } catch (error) {
      logger.error("Error sending notification to multiple users:", error);
      throw error;
    }
  }

  /**
   * Send notification to all users (batched to avoid rate limiting / ETIMEDOUT)
   */
  async sendToAll(payload: NotificationPayload) {
    try {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { isActive: true },
        select: {
          subscriptionId: true,
          endpoint: true,
          p256dh: true,
          auth: true,
        },
      });

      if (subscriptions.length === 0) {
        logger.warn("No push subscriptions found");
        return { success: false, message: "No subscriptions found" };
      }

      logger.info(
        `Broadcasting to ${subscriptions.length} subscriptions in batches of 50`,
      );

      const results = await this.sendInBatches(
        subscriptions,
        50,
        (sub: any) =>
          this.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          ),
        200,
      );

      // Only deactivate subscriptions confirmed gone (404/410), not transient failures
      const goneIds = results
        .map((result, index) => ({ result, sub: subscriptions[index] }))
        .filter(({ result }) => {
          if (result.status !== "rejected") return false;
          return (result.reason as any)?.subscriptionGone === true;
        })
        .map(({ sub }) => sub.subscriptionId);

      if (goneIds.length > 0) {
        await prisma.pushSubscription.updateMany({
          where: { subscriptionId: { in: goneIds } },
          data: { isActive: false },
        });
        logger.info(`Deactivated ${goneIds.length} expired subscriptions`);
      }

      const successCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const transientFails = results.filter(
        (r) =>
          r.status === "rejected" &&
          (r as any).reason?.subscriptionGone === false,
      ).length;

      logger.info(
        `Broadcast done: ${successCount}/${subscriptions.length} sent, ${goneIds.length} expired cleaned up, ${transientFails} transient errors`,
      );

      return {
        success: true,
        sent: successCount,
        total: subscriptions.length,
        expired: goneIds.length,
        transientErrors: transientFails,
      };
    } catch (error) {
      logger.error("Error broadcasting notification:", error);
      throw error;
    }
  }

  /**
   * Send notification for ticket purchase
   */
  async sendTicketPurchaseNotification(userId: string, ticketData: any) {
    const payload: NotificationPayload = {
      title: "🎉 Ticket Purchased!",
      body: `Your ticket for "${ticketData.eventName}" has been confirmed!`,
      icon: "/logos/pwa-icon-192.png",
      badge: "/logos/pwa-icon-192.png",
      data: {
        type: "TICKET_PURCHASE",
        ticketId: ticketData.ticketId,
        eventId: ticketData.eventId,
        url: `/tickets/${ticketData.ticketId}`,
      },
      actions: [
        {
          action: "view",
          title: "View Ticket",
        },
      ],
      tag: `ticket-${ticketData.ticketId}`,
      requireInteraction: true,
    };

    return this.sendToUser(userId, payload);
  }

  /**
   * Send notification for event reminder
   */
  async sendEventReminderNotification(userId: string, eventData: any) {
    const payload: NotificationPayload = {
      title: "📅 Event Reminder",
      body: `"${eventData.eventName}" is starting soon! Don't forget to check in.`,
      icon: "/logos/pwa-icon-192.png",
      badge: "/logos/pwa-icon-192.png",
      data: {
        type: "EVENT_REMINDER",
        eventId: eventData.eventId,
        url: `/event/${eventData.eventId}`,
      },
      actions: [
        {
          action: "view",
          title: "View Event",
        },
      ],
      tag: `event-reminder-${eventData.eventId}`,
    };

    return this.sendToUser(userId, payload);
  }

  /**
   * Send notification for payment success
   */
  async sendPaymentSuccessNotification(userId: string, paymentData: any) {
    const payload: NotificationPayload = {
      title: "✅ Payment Successful",
      body: `Your payment of ₹${paymentData.amount} has been processed successfully.`,
      icon: "/logos/pwa-icon-192.png",
      badge: "/logos/pwa-icon-192.png",
      data: {
        type: "PAYMENT_SUCCESS",
        paymentId: paymentData.paymentId,
        url: "/tickets/my-tickets",
      },
      tag: `payment-${paymentData.paymentId}`,
    };

    return this.sendToUser(userId, payload);
  }

  /**
   * Send notification for event update
   */
  async sendEventUpdateNotification(userIds: string[], eventData: any) {
    const payload: NotificationPayload = {
      title: "📢 Event Update",
      body: `"${eventData.eventName}" has been updated. Check the latest details.`,
      icon: "/logos/pwa-icon-192.png",
      badge: "/logos/pwa-icon-192.png",
      data: {
        type: "EVENT_UPDATE",
        eventId: eventData.eventId,
        url: `/event/${eventData.eventId}`,
      },
      actions: [
        {
          action: "view",
          title: "View Details",
        },
      ],
      tag: `event-update-${eventData.eventId}`,
    };

    return this.sendToUsers(userIds, payload);
  }

  /**
   * Send notifications in batches to avoid rate limiting and timeouts
   */
  private async sendInBatches<T>(
    items: T[],
    batchSize: number,
    fn: (item: T) => Promise<any>,
    delayMs = 200,
  ): Promise<PromiseSettledResult<any>[]> {
    const results: PromiseSettledResult<any>[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch.map(fn));
      results.push(...batchResults);
      if (i + batchSize < items.length) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    return results;
  }

  /**
   * Core method to send push notification.
   * Returns { success: true } on success.
   * Throws with `subscriptionGone = true` for 404/410 (deactivate subscription).
   * Throws with `subscriptionGone = false` for transient errors (keep subscription active).
   */
  private async sendNotification(
    subscription: PushSubscription,
    payload: NotificationPayload,
  ) {
    const pushPayload = JSON.stringify(payload);
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        },
        pushPayload,
        {
          TTL: 86400, // 24 hours
          urgency: "high",
          timeout: 10000, // 10 second timeout per request
        } as any,
      );
      return { success: true };
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        logger.warn("Push subscription expired or not found");
        const err = new Error("Subscription gone") as any;
        err.subscriptionGone = true;
        throw err;
      }
      // Transient errors (ETIMEDOUT, ECONNREFUSED, etc.) — keep subscription active
      const code = error.code || error.message || "UNKNOWN";
      logger.warn(
        `Transient push error (${code}) — keeping subscription active`,
      );
      const err = new Error(`Push transient error: ${code}`) as any;
      err.subscriptionGone = false;
      throw err;
    }
  }
}
