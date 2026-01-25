import { Request, Response } from "express";
import { NotificationService } from "../services/notification.service";
import logger from "../config/logger";
import { sendSuccess, sendError } from "../utils/responseMsg";
import { AuthenticatedRequest } from "../types/auth";

const notificationService = new NotificationService();

export class NotificationController {
  /**
   * Subscribe to push notifications
   * POST /api/v1/notification/subscribe
   */
  async subscribe(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { subscription } = req.body;

      if (!userId) {
        return sendError(res, "Unauthorized", 401);
      }

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return sendError(res, "Invalid subscription data", 400);
      }

      const result = await notificationService.subscribe(userId, subscription);
      return sendSuccess(res, "Subscribed to notifications", result);
    } catch (error) {
      logger.error("Error subscribing to notifications:", error);
      return sendError(res, "Failed to subscribe to notifications", 500);
    }
  }

  /**
   * Unsubscribe from push notifications
   * POST /api/v1/notification/unsubscribe
   */
  async unsubscribe(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { endpoint } = req.body;

      if (!userId) {
        return sendError(res, "Unauthorized", 401);
      }

      if (!endpoint) {
        return sendError(res, "Endpoint is required", 400);
      }

      const result = await notificationService.unsubscribe(userId, endpoint);
      return sendSuccess(res, "Unsubscribed from notifications", result);
    } catch (error) {
      logger.error("Error unsubscribing from notifications:", error);
      return sendError(res, "Failed to unsubscribe from notifications", 500);
    }
  }

  /**
   * Send test notification
   * POST /api/v1/notification/test
   */
  async sendTestNotification(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return sendError(res, "Unauthorized", 401);
      }

      const result = await notificationService.sendToUser(userId, {
        title: "🎉 Test Notification",
        body: "This is a test notification from Tixin!",
        icon: "/logos/pwa-icon-192.png",
        badge: "/logos/pwa-icon-192.png",
        data: {
          type: "TEST",
          url: "/",
        },
      });

      return sendSuccess(res, "Test notification sent", result);
    } catch (error) {
      logger.error("Error sending test notification:", error);
      return sendError(res, "Failed to send test notification", 500);
    }
  }

  /**
   * Send custom notification (Admin only)
   * POST /api/v1/notification/send
   */
  async sendCustomNotification(req: Request, res: Response) {
    try {
      const { userIds, title, body, data, actions } = req.body;

      if (!title || !body) {
        return sendError(res, "Title and body are required", 400);
      }

      let result;
      if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        // Send to specific users
        result = await notificationService.sendToUsers(userIds, {
          title,
          body,
          icon: "/logos/pwa-icon-192.png",
          badge: "/logos/pwa-icon-192.png",
          data,
          actions,
        });
      } else {
        // Broadcast to all users
        result = await notificationService.sendToAll({
          title,
          body,
          icon: "/logos/pwa-icon-192.png",
          badge: "/logos/pwa-icon-192.png",
          data,
          actions,
        });
      }

      return sendSuccess(res, "Notification sent successfully", result);
    } catch (error) {
      logger.error("Error sending custom notification:", error);
      return sendError(res, "Failed to send notification", 500);
    }
  }

  /**
   * Get VAPID public key
   * GET /api/v1/notification/vapid-public-key
   */
  async getVapidPublicKey(req: Request, res: Response) {
    try {
      const publicKey = process.env.VAPID_PUBLIC_KEY;

      if (!publicKey) {
        return sendError(res, "VAPID public key not configured", 500);
      }

      return sendSuccess(res, "VAPID public key retrieved", { publicKey });
    } catch (error) {
      logger.error("Error getting VAPID public key:", error);
      return sendError(res, "Failed to get VAPID public key", 500);
    }
  }
}
