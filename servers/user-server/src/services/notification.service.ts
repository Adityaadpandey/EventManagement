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

      // Remove failed subscriptions (expired or invalid)
      const failedSubscriptions = results
        .map((result: any, index: number) => ({
          result,
          subscription: subscriptions[index],
        }))
        .filter(({ result }: any) => result.status === "rejected")
        .map(({ subscription }: any) => subscription);

      if (failedSubscriptions.length > 0) {
        await prisma.pushSubscription.updateMany({
          where: {
            subscriptionId: {
              in: failedSubscriptions.map((sub: any) => sub.subscriptionId),
            },
          },
          data: {
            isActive: false,
          },
        });
        logger.info(
          `Deactivated ${failedSubscriptions.length} invalid subscriptions`,
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
   * Send notification to all users
   */
  async sendToAll(payload: NotificationPayload) {
    try {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          isActive: true,
        },
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

      // Remove failed subscriptions
      const failedSubscriptions = results
        .map((result: any, index: number) => ({
          result,
          subscription: subscriptions[index],
        }))
        .filter(({ result }: any) => result.status === "rejected")
        .map(({ subscription }: any) => subscription);

      if (failedSubscriptions.length > 0) {
        await prisma.pushSubscription.updateMany({
          where: {
            subscriptionId: {
              in: failedSubscriptions.map((sub: any) => sub.subscriptionId),
            },
          },
          data: {
            isActive: false,
          },
        });
      }

      const successCount = results.filter(
        (r: any) => r.status === "fulfilled",
      ).length;
      logger.info(
        `Broadcast notification sent to ${successCount}/${subscriptions.length} devices`,
      );

      return {
        success: true,
        sent: successCount,
        total: subscriptions.length,
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
   * Core method to send push notification
   */
  private async sendNotification(
    subscription: PushSubscription,
    payload: NotificationPayload,
  ) {
    try {
      const pushPayload = JSON.stringify(payload);

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
        },
      );

      return { success: true };
    } catch (error: any) {
      // Handle specific errors
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription expired or not found
        logger.warn("Push subscription expired or not found");
        throw error; // Will be caught and subscription removed
      }

      logger.error("Error sending push notification:", error);
      throw error;
    }
  }
}
