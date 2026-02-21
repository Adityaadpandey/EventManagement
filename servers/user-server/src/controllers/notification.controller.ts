import { Request, Response } from "express";
import { NotificationService } from "../services/notification.service";
import logger from "../config/logger";
import { sendSuccess, sendError } from "../utils/responseMsg";
import { AuthenticatedRequest } from "../types/auth";
import { config } from "../config";

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
   * Get subscription stats (Admin only)
   * GET /api/v1/notification/stats
   */
  async getSubscriptionStats(req: Request, res: Response) {
    try {
      const stats = await notificationService.getSubscriptionStats();
      return sendSuccess(res, "Subscription stats", stats);
    } catch (error) {
      logger.error("Error fetching subscription stats:", error);
      return sendError(res, "Failed to fetch stats", 500);
    }
  }

  /**
   * Get VAPID public key
   * GET /api/v1/notification/vapid-public-key
   */
  async getVapidPublicKey(req: Request, res: Response) {
    try {
      const publicKey = config.VAPID_PUBLIC_KEY;

      if (!publicKey) {
        return sendError(res, "VAPID public key not configured", 500);
      }

      return sendSuccess(res, "VAPID public key retrieved", { publicKey });
    } catch (error) {
      logger.error("Error getting VAPID public key:", error);
      return sendError(res, "Failed to get VAPID public key", 500);
    }
  }

  /**
   * Get user's notifications
   * GET /api/v1/notification
   */
  async getNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return sendError(res, "Unauthorized", 401);
      }

      // Parse pagination parameters
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Validate pagination
      if (limit < 1 || limit > 100) {
        return sendError(res, "Limit must be between 1 and 100", 400);
      }

      if (offset < 0) {
        return sendError(res, "Offset must be non-negative", 400);
      }

      const result = await notificationService.getUserNotifications(userId, {
        limit,
        offset,
      });

      return sendSuccess(res, "Notifications retrieved successfully", {
        notifications: result.notifications,
        total: result.total,
        pagination: {
          limit,
          offset,
          count: result.notifications.length,
        },
      });
    } catch (error) {
      logger.error("Error getting notifications:", error);
      return sendError(res, "Failed to get notifications", 500);
    }
  }

  /**
   * Mark notification as read
   * PATCH /api/v1/notification/:id/read
   */
  async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const notificationId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!userId) {
        return sendError(res, "Unauthorized", 401);
      }

      if (!notificationId) {
        return sendError(res, "Notification ID is required", 400);
      }

      const result = await notificationService.markAsRead(
        notificationId,
        userId,
      );

      return sendSuccess(res, "Notification marked as read", result);
    } catch (error: any) {
      logger.error("Error marking notification as read:", error);

      // Handle specific error cases
      if (error.message && error.message.includes("not found")) {
        return sendError(res, "Notification not found", 404);
      }
      if (error.message && error.message.includes("unauthorized")) {
        return sendError(res, "Unauthorized to modify this notification", 403);
      }

      return sendError(res, "Failed to mark notification as read", 500);
    }
  }

  /**
   * Mark all notifications as read
   * PATCH /api/v1/notification/read-all
   */
  async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return sendError(res, "Unauthorized", 401);
      }

      const result = await notificationService.markAllAsRead(userId);

      return sendSuccess(
        res,
        `Marked ${result.count} notifications as read`,
        result,
      );
    } catch (error) {
      logger.error("Error marking all notifications as read:", error);
      return sendError(res, "Failed to mark all notifications as read", 500);
    }
  }

  /**
   * Delete notification
   * DELETE /api/v1/notification/:id
   */
  async deleteNotification(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const notificationId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!userId) {
        return sendError(res, "Unauthorized", 401);
      }

      if (!notificationId) {
        return sendError(res, "Notification ID is required", 400);
      }

      const result = await notificationService.deleteNotification(
        notificationId,
        userId,
      );

      return sendSuccess(res, "Notification deleted successfully", result);
    } catch (error: any) {
      logger.error("Error deleting notification:", error);

      // Handle specific error cases
      if (error.message && error.message.includes("not found")) {
        return sendError(res, "Notification not found", 404);
      }
      if (error.message && error.message.includes("unauthorized")) {
        return sendError(res, "Unauthorized to delete this notification", 403);
      }

      return sendError(res, "Failed to delete notification", 500);
    }
  }

  /**
   * Clear all notifications
   * DELETE /api/v1/notification/clear-all
   */
  async clearAllNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return sendError(res, "Unauthorized", 401);
      }

      const result = await notificationService.clearAllNotifications(userId);
      return sendSuccess(res, "All notifications cleared", {
        count: result.count,
      });
    } catch (error) {
      logger.error("Error clearing all notifications:", error);
      return sendError(res, "Failed to clear all notifications", 500);
    }
  }
}
