// src/middlewares/analytics.middleware.ts
import { NextFunction, Request, Response } from "express";
import { redis } from "../config/redis";

export enum AnalyticsEventType {
  EVENT_VIEW = "event_view",
  EVENT_CTA_CLICK = "event_cta_click",
  TICKET_PURCHASE = "ticket_purchase",
}

interface AnalyticsData {
  eventId: string;
  type: AnalyticsEventType;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

/**
 * Middleware to track event views
 * Usage: Add after eventId param is available
 */
export const trackEventView = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const eventId = req.params.eventId;

    if (eventId) {
      const analyticsData: AnalyticsData = {
        eventId,
        type: AnalyticsEventType.EVENT_VIEW,
        userId: (req as any).user?.userId,
        metadata: {
          userAgent: req.headers["user-agent"],
          ip: req.ip,
          referer: req.headers.referer,
        },
        timestamp: Date.now(),
      };

      // Push to Redis queue (non-blocking)
      await redis.lpush("analytics:queue", JSON.stringify(analyticsData));

      // Increment view counter in Redis (for real-time stats)
      await redis.hincrby(`event:${eventId}:stats`, "views", 1);
    }
  } catch (error) {
    console.error("Analytics tracking error:", error);
    // Don't block the request if analytics fail
  }

  next();
};

/**
 * Middleware to track CTA clicks (call-to-action like "Buy Ticket" button)
 * Usage: Add to ticket purchase route
 */
export const trackCTAClick = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const eventId = req.body.eventId;

    if (eventId) {
      const analyticsData: AnalyticsData = {
        eventId,
        type: AnalyticsEventType.EVENT_CTA_CLICK,
        userId: (req as any).user?.userId,
        metadata: {
          ticketTypeId: req.body.ticketTypeId,
          quantity: req.body.quantity,
        },
        timestamp: Date.now(),
      };

      await redis.lpush("analytics:queue", JSON.stringify(analyticsData));

      // Increment CTA clicks in Redis
      await redis.hincrby(`event:${eventId}:stats`, "ctaClicks", 1);
    }
  } catch (error) {
    console.error("CTA tracking error:", error);
  }

  next();
};

/**
 * Function to track ticket purchases (call after successful payment)
 * This should be called from your ticket controller after payment confirmation
 */
export const trackTicketPurchase = async (
  eventId: string,
  ticketData: {
    ticketId: string;
    userId: string;
    amount: number;
    quantity: number;
    ticketTypeId: string;
  },
) => {
  try {
    const analyticsData: AnalyticsData = {
      eventId,
      type: AnalyticsEventType.TICKET_PURCHASE,
      userId: ticketData.userId,
      metadata: {
        ticketId: ticketData.ticketId,
        amount: ticketData.amount,
        quantity: ticketData.quantity,
        ticketTypeId: ticketData.ticketTypeId,
      },
      timestamp: Date.now(),
    };

    await redis.lpush("analytics:queue", JSON.stringify(analyticsData));

    // Update real-time stats in Redis
    const eventStatsKey = `event:${eventId}:stats`;
    await Promise.all([
      redis.hincrby(eventStatsKey, "ticketsSold", ticketData.quantity),
      redis.hincrbyfloat(eventStatsKey, "revenue", ticketData.amount),
    ]);
  } catch (error) {
    console.error("Ticket purchase tracking error:", error);
  }
};

/**
 * Helper to get real-time stats from Redis
 */
export const getRealtimeStats = async (eventId: string) => {
  try {
    const stats = await redis.hgetall(`event:${eventId}:stats`);

    return {
      views: parseInt(stats.views || "0"),
      ctaClicks: parseInt(stats.ctaClicks || "0"),
      ticketsSold: parseInt(stats.ticketsSold || "0"),
      revenue: parseFloat(stats.revenue || "0"),
      conversionRate: stats.views
        ? (parseInt(stats.ticketsSold || "0") / parseInt(stats.views)) * 100
        : 0,
    };
  } catch (error) {
    console.error("Error fetching realtime stats:", error);
    return null;
  }
};
