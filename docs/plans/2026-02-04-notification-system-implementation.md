# Notification System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a complete dual notification system (web push + in-app notifications) with BullMQ queue processing, cron-based event reminders, and integrate into payment/event workflows.

**Architecture:** Queue-driven notification system where services add jobs to `notificationQueue`, worker processes jobs to create database records and send web push notifications, cron jobs handle scheduled reminders and cleanup.

**Tech Stack:** BullMQ, Redis, web-push, Prisma, node-cron, React/Next.js, Service Workers

---

## Task 1: Database Schema Update

**Files:**
- Modify: `servers/user-server/prisma/schema.prisma:997-1016`

**Step 1: Add metadata field to Notification model**

In `schema.prisma` at line 1008 (after `sent Boolean @default(false)`), add:

```prisma
metadata Json?
```

The complete Notification model should look like:

```prisma
model Notification {
    notificationId String    @id @default(uuid())
    userId         String
    user           User      @relation(fields: [userId], references: [userId])

    title          String
    message        String
    link           String?
    type           String?   @default("info")

    read           Boolean   @default(false)
    sent           Boolean   @default(false)
    metadata       Json?

    createdAt      DateTime  @default(now())
    readAt         DateTime?
    sentAt         DateTime?

    @@index([userId, read, createdAt(sort: Desc)])
    @@index([sent, createdAt])
}
```

**Step 2: Generate Prisma migration**

Run:
```bash
cd servers/user-server
npx prisma migrate dev --name add_notification_metadata
```

Expected: Migration created successfully, database updated

**Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add metadata field to Notification model"
```

---

## Task 2: Add Notification Queue

**Files:**
- Modify: `servers/user-server/src/lib/queues.ts:1-37`

**Step 1: Add notificationQueue export**

At the end of `queues.ts` (after otpQueue definition), add:

```typescript
export const notificationQueue = new Queue("notifications", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
```

**Step 2: Verify the file compiles**

Run:
```bash
cd servers/user-server
npm run build
```

Expected: Build succeeds with no TypeScript errors

**Step 3: Commit**

```bash
git add src/lib/queues.ts
git commit -m "feat(queue): add notification queue for BullMQ"
```

---

## Task 3: Create Notification Worker

**Files:**
- Create: `servers/user-server/src/workers/notification.worker.ts`

**Step 1: Create notification worker file**

Create `src/workers/notification.worker.ts` with:

```typescript
import { getLogger } from "@repo/logger";
import { Job, Worker } from "bullmq";
import webpush from "web-push";
import { config } from "../config";
import { prisma } from "../config/db";
import { redis } from "../config/redis";

const logger: any = getLogger("Notification Worker", "debug");

// Configure VAPID details
webpush.setVapidDetails(
  "mailto:support@tixin.in",
  config.VAPID_PUBLIC_KEY!,
  config.VAPID_PRIVATE_KEY!,
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
          metadata: metadata || {},
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
          logger.error(
            `Failed to send push to subscription ${sub.subscriptionId}:`,
            error,
          );

          // Mark subscription as inactive if it failed
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.update({
              where: { subscriptionId: sub.subscriptionId },
              data: { isActive: false },
            });
            logger.info(
              `Marked subscription ${sub.subscriptionId} as inactive`,
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
```

**Step 2: Verify worker compiles**

Run:
```bash
cd servers/user-server
npm run build
```

Expected: Build succeeds with no TypeScript errors

**Step 3: Commit**

```bash
git add src/workers/notification.worker.ts
git commit -m "feat(worker): add notification worker for dual notifications"
```

---

## Task 4: Extend Notification Service with CRUD Methods

**Files:**
- Modify: `servers/user-server/src/services/notification.service.ts`

**Step 1: Add createNotification method**

After the `subscribe` method (around line 60), add:

```typescript
/**
 * Create an in-app notification
 */
async createNotification(
  userId: string,
  data: {
    title: string;
    body: string;
    link?: string;
    type?: string;
    metadata?: any;
  },
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title: data.title,
        message: data.body,
        link: data.link,
        type: data.type || "info",
        metadata: data.metadata || {},
      },
    });

    logger.info(`Created notification ${notification.notificationId}`);
    return notification;
  } catch (error) {
    logger.error("Error creating notification:", error);
    throw error;
  }
}
```

**Step 2: Add getUserNotifications method**

```typescript
/**
 * Get user's notifications with pagination
 */
async getUserNotifications(
  userId: string,
  options: { limit?: number; offset?: number } = {},
) {
  try {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.notification.count({
      where: { userId },
    });

    return {
      notifications,
      total,
      limit,
      offset,
    };
  } catch (error) {
    logger.error("Error fetching notifications:", error);
    throw error;
  }
}
```

**Step 3: Add markAsRead method**

```typescript
/**
 * Mark a notification as read
 */
async markAsRead(notificationId: string, userId: string) {
  try {
    const notification = await prisma.notification.updateMany({
      where: {
        notificationId,
        userId, // Ensure user owns the notification
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    if (notification.count === 0) {
      throw new Error("Notification not found or unauthorized");
    }

    logger.info(`Marked notification ${notificationId} as read`);
    return notification;
  } catch (error) {
    logger.error("Error marking notification as read:", error);
    throw error;
  }
}
```

**Step 4: Add markAllAsRead method**

```typescript
/**
 * Mark all user's notifications as read
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

    logger.info(`Marked ${result.count} notifications as read for user ${userId}`);
    return result;
  } catch (error) {
    logger.error("Error marking all notifications as read:", error);
    throw error;
  }
}
```

**Step 5: Add deleteNotification method**

```typescript
/**
 * Delete a notification
 */
async deleteNotification(notificationId: string, userId: string) {
  try {
    const notification = await prisma.notification.deleteMany({
      where: {
        notificationId,
        userId, // Ensure user owns the notification
      },
    });

    if (notification.count === 0) {
      throw new Error("Notification not found or unauthorized");
    }

    logger.info(`Deleted notification ${notificationId}`);
    return notification;
  } catch (error) {
    logger.error("Error deleting notification:", error);
    throw error;
  }
}
```

**Step 6: Add cleanupStaleSubscriptions method**

```typescript
/**
 * Cleanup stale push subscriptions (inactive for >90 days)
 */
async cleanupStaleSubscriptions() {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await prisma.pushSubscription.deleteMany({
      where: {
        isActive: false,
        lastUsedAt: {
          lt: ninetyDaysAgo,
        },
      },
    });

    logger.info(`Cleaned up ${result.count} stale push subscriptions`);
    return result;
  } catch (error) {
    logger.error("Error cleaning up stale subscriptions:", error);
    throw error;
  }
}
```

**Step 7: Verify service compiles**

Run:
```bash
cd servers/user-server
npm run build
```

Expected: Build succeeds

**Step 8: Commit**

```bash
git add src/services/notification.service.ts
git commit -m "feat(service): add notification CRUD and cleanup methods"
```

---

## Task 5: Add Notification API Endpoints

**Files:**
- Modify: `servers/user-server/src/controllers/notification.controller.ts`
- Modify: `servers/user-server/src/routes/v1/notification.router.ts`

**Step 1: Add getNotifications controller method**

In `notification.controller.ts`, after the existing methods, add:

```typescript
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

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await notificationService.getUserNotifications(userId, {
      limit,
      offset,
    });

    return sendSuccess(res, "Notifications fetched successfully", result);
  } catch (error) {
    logger.error("Error fetching notifications:", error);
    return sendError(res, "Failed to fetch notifications", 500);
  }
}
```

**Step 2: Add markAsRead controller method**

```typescript
/**
 * Mark notification as read
 * PATCH /api/v1/notification/:id/read
 */
async markAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return sendError(res, "Unauthorized", 401);
    }

    const result = await notificationService.markAsRead(id, userId);
    return sendSuccess(res, "Notification marked as read", result);
  } catch (error: any) {
    logger.error("Error marking notification as read:", error);
    if (error.message.includes("not found")) {
      return sendError(res, error.message, 404);
    }
    return sendError(res, "Failed to mark notification as read", 500);
  }
}
```

**Step 3: Add markAllAsRead controller method**

```typescript
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
    return sendSuccess(res, "All notifications marked as read", result);
  } catch (error) {
    logger.error("Error marking all notifications as read:", error);
    return sendError(res, "Failed to mark all notifications as read", 500);
  }
}
```

**Step 4: Add deleteNotification controller method**

```typescript
/**
 * Delete a notification
 * DELETE /api/v1/notification/:id
 */
async deleteNotification(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return sendError(res, "Unauthorized", 401);
    }

    const result = await notificationService.deleteNotification(id, userId);
    return sendSuccess(res, "Notification deleted", result);
  } catch (error: any) {
    logger.error("Error deleting notification:", error);
    if (error.message.includes("not found")) {
      return sendError(res, error.message, 404);
    }
    return sendError(res, "Failed to delete notification", 500);
  }
}
```

**Step 5: Add routes to notification router**

In `notification.router.ts`, add these routes before the existing routes:

```typescript
// Get user's notifications
router.get(
  "/",
  authMiddleware,
  notificationController.getNotifications.bind(notificationController),
);

// Mark notification as read
router.patch(
  "/:id/read",
  authMiddleware,
  notificationController.markAsRead.bind(notificationController),
);

// Mark all notifications as read
router.patch(
  "/read-all",
  authMiddleware,
  notificationController.markAllAsRead.bind(notificationController),
);

// Delete notification
router.delete(
  "/:id",
  authMiddleware,
  notificationController.deleteNotification.bind(notificationController),
);
```

**Step 6: Verify endpoints compile**

Run:
```bash
cd servers/user-server
npm run build
```

Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/controllers/notification.controller.ts src/routes/v1/notification.router.ts
git commit -m "feat(api): add notification CRUD endpoints"
```

---

## Task 6: Fix Payment Service Field Names

**Files:**
- Modify: `servers/user-server/src/services/payment.service.ts:141`

**Step 1: Find and fix field name mismatches**

Search for lines with incorrect capitalization (around line 141):

Find:
```typescript
InstagramLink: lister.InstagramLink,
FacebookLink: lister.FacebookLink,
XLink: lister.XLink,
```

Replace with:
```typescript
instagramLink: lister.instagramLink,
facebookLink: lister.facebookLink,
xLink: lister.xLink,
```

**Step 2: Verify payment service compiles**

Run:
```bash
cd servers/user-server
npm run build
```

Expected: Build succeeds, no undefined field errors

**Step 3: Commit**

```bash
git add src/services/payment.service.ts
git commit -m "fix(payment): correct field name capitalization for lister links"
```

---

## Task 7: Integrate Notifications into Payment Service

**Files:**
- Modify: `servers/user-server/src/services/payment.service.ts`

**Step 1: Import notificationQueue at the top of the file**

Add after existing imports:

```typescript
import { notificationQueue } from "../lib/queues";
```

**Step 2: Add notification after ticket creation**

Find the code where tickets are created (after `prisma.ticket.create()` calls in the payment completion logic).

After successful ticket creation (around where you see ticket records being created), add:

```typescript
// Send ticket purchase notification
await notificationQueue.add("ticket-purchase", {
  userId: ticket.userId,
  title: "Ticket Purchase Confirmed",
  body: `Your ticket for ${event.title} has been confirmed`,
  link: `/events/${event.eventId}`,
  type: "ticket_purchase",
  metadata: {
    eventId: event.eventId,
    ticketId: ticket.ticketId,
    quantity: ticket.quantity,
    amount: ticket.totalPrice,
  },
});
```

**Step 3: Add notification after payment success**

Find where payment status is updated to completed/success.

After payment success update, add:

```typescript
// Send payment success notification
await notificationQueue.add("payment-success", {
  userId: payment.userId,
  title: "Payment Successful",
  body: `Your payment of ₹${payment.amount} has been processed`,
  link: `/payments/${payment.paymentId}`,
  type: "payment_success",
  metadata: {
    paymentId: payment.paymentId,
    amount: payment.amount,
  },
});
```

**Step 4: Verify payment service compiles**

Run:
```bash
cd servers/user-server
npm run build
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/services/payment.service.ts
git commit -m "feat(payment): add notification triggers for tickets and payments"
```

---

## Task 8: Integrate Notifications into Event Service

**Files:**
- Modify: `servers/user-server/src/services/event.service.ts`

**Step 1: Import notificationQueue**

Add at the top of the file:

```typescript
import { notificationQueue } from "../lib/queues";
```

**Step 2: Find event update method**

Look for the method that updates event details (likely `updateEvent` or similar).

**Step 3: Add notification trigger after event update**

After the event update is successful and before returning, add:

```typescript
// Get all users with tickets to this event
const ticketHolders = await prisma.ticket.findMany({
  where: {
    eventId,
    status: "SUCCESS",
  },
  select: { userId: true },
  distinct: ["userId"],
});

// Send notification to each ticket holder
for (const { userId } of ticketHolders) {
  await notificationQueue.add("event-update", {
    userId,
    title: "Event Updated",
    body: `${updatedEvent.title} has been updated. Check the latest details.`,
    link: `/events/${eventId}`,
    type: "event_update",
    metadata: {
      eventId,
      updatedAt: new Date().toISOString(),
    },
  });
}
```

**Step 4: Verify event service compiles**

Run:
```bash
cd servers/user-server
npm run build
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/services/event.service.ts
git commit -m "feat(event): add notification trigger for event updates"
```

---

## Task 9: Create Event Reminder Job

**Files:**
- Create: `servers/user-server/src/jobs/schedule-event-reminders.job.ts`

**Step 1: Create event reminder job file**

Create `src/jobs/schedule-event-reminders.job.ts`:

```typescript
import cron from "node-cron";
import { getLogger } from "@repo/logger";
import { prisma } from "../config/db";
import { notificationQueue } from "../lib/queues";

const logger: any = getLogger("Event Reminder Job", "debug");

/**
 * Schedule event reminders for events starting in 24 hours
 * Runs every hour
 */
export function startEventReminderJob() {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    try {
      logger.info("Running event reminder job");

      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      // Find events starting in 24-25 hours
      const upcomingEvents = await prisma.event.findMany({
        where: {
          startDateTime: {
            gte: in24Hours,
            lt: in25Hours,
          },
        },
        include: {
          Ticket: {
            where: { status: "SUCCESS" },
            select: {
              userId: true,
              ticketId: true,
            },
          },
        },
      });

      logger.info(`Found ${upcomingEvents.length} events starting in 24 hours`);

      for (const event of upcomingEvents) {
        // Get unique user IDs
        const uniqueUsers = [
          ...new Set(event.Ticket.map((ticket) => ticket.userId)),
        ];

        logger.info(
          `Sending reminders to ${uniqueUsers.length} users for event ${event.title}`,
        );

        // Send notification to each user
        for (const userId of uniqueUsers) {
          // Check if reminder already sent (check metadata)
          const existingReminder = await prisma.notification.findFirst({
            where: {
              userId,
              type: "event_reminder",
              metadata: {
                path: ["eventId"],
                equals: event.eventId,
              },
            },
          });

          if (existingReminder) {
            logger.info(
              `Reminder already sent to user ${userId} for event ${event.eventId}`,
            );
            continue;
          }

          // Add notification job
          await notificationQueue.add("event-reminder", {
            userId,
            title: "Event Reminder",
            body: `${event.title} starts tomorrow at ${event.startDateTime.toLocaleTimeString()}`,
            link: `/events/${event.eventId}`,
            type: "event_reminder",
            metadata: {
              eventId: event.eventId,
              startDateTime: event.startDateTime.toISOString(),
              reminderSent: true,
            },
          });

          logger.info(
            `Queued reminder for user ${userId} for event ${event.eventId}`,
          );
        }
      }

      logger.info("Event reminder job completed");
    } catch (error) {
      logger.error("Event reminder job failed:", error);
    }
  });

  logger.info("Event reminder job scheduled (runs hourly)");
}
```

**Step 2: Install node-cron if not already installed**

Run:
```bash
cd servers/user-server
npm install node-cron
npm install -D @types/node-cron
```

Expected: Packages installed successfully

**Step 3: Verify job compiles**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 4: Import and start the job in main server file**

Find the main server entry point (likely `src/index.ts` or `src/server.ts`).

Add import:
```typescript
import { startEventReminderJob } from "./jobs/schedule-event-reminders.job";
```

After server starts, add:
```typescript
startEventReminderJob();
```

**Step 5: Commit**

```bash
git add src/jobs/schedule-event-reminders.job.ts src/index.ts package.json package-lock.json
git commit -m "feat(jobs): add event reminder cron job"
```

---

## Task 10: Create Subscription Cleanup Job

**Files:**
- Create: `servers/user-server/src/jobs/cleanup-subscriptions.job.ts`

**Step 1: Create cleanup job file**

Create `src/jobs/cleanup-subscriptions.job.ts`:

```typescript
import cron from "node-cron";
import { getLogger } from "@repo/logger";
import { prisma } from "../config/db";

const logger: any = getLogger("Cleanup Job", "debug");

/**
 * Cleanup stale push subscriptions
 * Runs daily at 2 AM
 */
export function startCleanupJob() {
  // Run daily at 2 AM
  cron.schedule("0 2 * * *", async () => {
    try {
      logger.info("Running subscription cleanup job");

      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const result = await prisma.pushSubscription.deleteMany({
        where: {
          isActive: false,
          lastUsedAt: {
            lt: ninetyDaysAgo,
          },
        },
      });

      logger.info(`Cleaned up ${result.count} stale push subscriptions`);
    } catch (error) {
      logger.error("Subscription cleanup job failed:", error);
    }
  });

  logger.info("Subscription cleanup job scheduled (runs daily at 2 AM)");
}
```

**Step 2: Verify job compiles**

Run:
```bash
cd servers/user-server
npm run build
```

Expected: Build succeeds

**Step 3: Import and start the job in main server file**

In the main server entry point, add import:
```typescript
import { startCleanupJob } from "./jobs/cleanup-subscriptions.job";
```

After server starts, add:
```typescript
startCleanupJob();
```

**Step 4: Commit**

```bash
git add src/jobs/cleanup-subscriptions.job.ts src/index.ts
git commit -m "feat(jobs): add subscription cleanup cron job"
```

---

## Task 11: Fix Production Service Worker

**Files:**
- Modify: `apps/web/public/sw.js`
- Read: `apps/web/public/sw-dev.js` (for reference)

**Step 1: Read the current sw.js to understand structure**

Run:
```bash
cat apps/web/public/sw.js
```

Note: The file uses Workbox for caching.

**Step 2: Add push notification handlers to sw.js**

At the end of `apps/web/public/sw.js`, after Workbox setup, add:

```javascript
// ==================== PUSH NOTIFICATION HANDLERS ====================

console.log("🔔 Push notification handlers loaded");

// Push event - Handle incoming push notifications
self.addEventListener("push", (event) => {
  console.log("🔔 SW: Push event received", event);

  if (!event.data) {
    console.log("🔔 SW: Push event but no data");
    return;
  }

  try {
    const data = event.data.json();
    console.log("🔔 SW: Push notification data:", data);

    const title = data.title || "Tixin";
    const options = {
      body: data.body || "You have a new notification",
      icon: data.icon || "/logos/pwa-icon-192.png",
      badge: data.badge || "/logos/pwa-icon-192.png",
      image: data.image,
      data: data.data || {},
      actions: data.actions || [],
      tag: data.tag || "default",
      requireInteraction: data.requireInteraction || false,
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
    };

    event.waitUntil(
      self.registration
        .showNotification(title, options)
        .then(() => console.log("🔔 SW: Notification shown"))
        .catch((err) =>
          console.error("🔔 SW: Error showing notification:", err),
        ),
    );
  } catch (error) {
    console.error("🔔 SW: Error handling push event:", error);
  }
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("🔔 SW: Notification clicked", event);

  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  // Determine URL to open
  let urlToOpen = data.url || "/";

  if (action === "view" && data.url) {
    urlToOpen = data.url;
  } else if (action === "dismiss") {
    return;
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }

        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});

// Notification close event
self.addEventListener("notificationclose", (event) => {
  console.log("🔔 SW: Notification closed", event);
});
```

**Step 3: Verify sw.js syntax**

Open the file in browser dev tools or use a JS linter:
```bash
cd apps/web
npx eslint public/sw.js --no-ignore
```

Expected: No syntax errors (warnings are okay)

**Step 4: Commit**

```bash
git add public/sw.js
git commit -m "feat(sw): add push notification handlers to production service worker"
```

---

## Task 12: Simplify Frontend Notification Registration

**Files:**
- Modify: `apps/web/src/lib/notifications.ts`

**Step 1: Find registerServiceWorker function**

Locate the `registerServiceWorker` function in `notifications.ts`.

**Step 2: Simplify to always use /sw.js**

Replace the environment-based logic with:

```typescript
export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("Service worker registered:", registration);
    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}
```

**Step 3: Remove any references to sw-dev.js**

Search the file for "sw-dev" and remove any conditional logic.

**Step 4: Verify frontend compiles**

Run:
```bash
cd apps/web
npm run build
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/lib/notifications.ts
git commit -m "refactor(notifications): simplify SW registration to use single production worker"
```

---

## Task 13: Delete Unused Service Workers and Test Page

**Files:**
- Delete: `apps/web/public/sw-dev.js`
- Delete: `apps/web/public/sw-custom.js`
- Delete: `apps/web/src/app/test-notifications/page.tsx`

**Step 1: Delete sw-dev.js**

Run:
```bash
cd apps/web
git rm public/sw-dev.js
```

Expected: File staged for deletion

**Step 2: Delete sw-custom.js**

Run:
```bash
git rm public/sw-custom.js
```

Expected: File staged for deletion

**Step 3: Delete test-notifications page**

Run:
```bash
git rm -r src/app/test-notifications
```

Expected: Directory staged for deletion

**Step 4: Commit**

```bash
git commit -m "chore: remove unused service workers and test notification page"
```

---

## Task 14: Create Notification List UI

**Files:**
- Create: `apps/web/src/app/notifications/page.tsx`

**Step 1: Create notifications page directory and file**

Run:
```bash
mkdir -p apps/web/src/app/notifications
```

Create `apps/web/src/app/notifications/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  notificationId: string;
  title: string;
  message: string;
  link: string | null;
  type: string;
  read: boolean;
  createdAt: string;
  metadata?: any;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/notification", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data.data.notifications || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/v1/notification/${notificationId}/read`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to mark as read");
      }

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch("/api/v1/notification/read-all", {
        method: "PATCH",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to mark all as read");
      }

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/v1/notification/${notificationId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }

      // Optimistic update
      setNotifications((prev) =>
        prev.filter((n) => n.notificationId !== notificationId)
      );
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      router.push(notification.link);
    }

    // Mark as read on click
    if (!notification.read) {
      handleMarkAsRead(notification.notificationId);
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading notifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {notifications.some((n) => !n.read) && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No notifications yet
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.notificationId}
                className={`bg-white rounded-lg p-4 shadow-sm border transition-opacity ${
                  notification.read ? "opacity-60" : ""
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <h3 className="font-semibold text-gray-900">
                      {notification.title}
                    </h3>
                    <p className="text-gray-700 mt-1">{notification.message}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {getRelativeTime(notification.createdAt)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.notificationId);
                        }}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification.notificationId);
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify page compiles**

Run:
```bash
cd apps/web
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/notifications/page.tsx
git commit -m "feat(ui): add notification list page with CRUD actions"
```

---

## Task 15: Start Notification Worker in Server

**Files:**
- Modify: `servers/user-server/src/index.ts` (or main entry point)

**Step 1: Import notification worker**

At the top of the server entry file, add:

```typescript
import "./workers/notification.worker";
```

**Step 2: Verify import doesn't break server**

Run:
```bash
cd servers/user-server
npm run build
```

Expected: Build succeeds

**Step 3: Test server starts**

Run:
```bash
npm run dev
```

Expected: Server starts, worker logs appear showing "Notification Worker" started

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat(worker): start notification worker on server boot"
```

---

## Task 16: Manual Testing & Verification

**Files:**
- No file changes

**Step 1: Start backend server**

Run:
```bash
cd servers/user-server
npm run dev
```

Expected: Server starts, workers and cron jobs log startup messages

**Step 2: Start frontend**

Run:
```bash
cd apps/web
npm run dev
```

Expected: Frontend dev server starts

**Step 3: Test notification subscription**

1. Open browser to frontend
2. Open browser console
3. Call notification permission request
4. Subscribe to push notifications
5. Check backend logs for subscription saved

Expected: Subscription created in database

**Step 4: Test payment notification**

1. Complete a test ticket purchase
2. Check backend logs for notification job queued
3. Check notification worker logs for processing
4. Visit `/notifications` page
5. Verify notification appears

Expected: Notification created and displayed

**Step 5: Test marking as read**

1. Click "Mark read" on a notification
2. Verify opacity changes
3. Refresh page
4. Verify notification still shows as read

Expected: Read state persists

**Step 6: Test deletion**

1. Click "Delete" on a notification
2. Verify it disappears from list
3. Refresh page
4. Verify notification is gone

Expected: Notification deleted from database

**Step 7: Document any issues**

Create a file `TESTING.md` with test results and any bugs found.

**Step 8: Commit testing notes**

```bash
git add TESTING.md
git commit -m "docs: add manual testing results for notification system"
```

---

## Success Criteria Checklist

After completing all tasks, verify:

- [ ] Database has `metadata` field in Notification model
- [ ] `notificationQueue` exists and is exported from queues.ts
- [ ] Notification worker processes jobs and creates dual notifications
- [ ] Notification service has all CRUD methods
- [ ] API endpoints for GET, PATCH, DELETE notifications work
- [ ] Payment service triggers notifications on ticket purchase and payment success
- [ ] Event service triggers notifications on event updates
- [ ] Event reminder job runs hourly and sends 24-hour reminders
- [ ] Cleanup job runs daily and removes stale subscriptions
- [ ] Production service worker handles push events
- [ ] Frontend registers `/sw.js` only
- [ ] Unused service workers and test page deleted
- [ ] Notification list UI displays notifications
- [ ] Mark as read, mark all as read, and delete work
- [ ] Field name mismatches in payment service fixed
- [ ] All code compiles without errors
- [ ] Server starts with workers and cron jobs

---

## Notes

- **YAGNI:** Only implement what's in the design. No extra features.
- **DRY:** Reuse existing patterns (BullMQ workers, Prisma queries, API responses).
- **TDD:** While full TDD isn't required, verify each step compiles and basic functionality works.
- **Commits:** Small, frequent commits after each logical unit of work.
- **Testing:** Manual testing is sufficient for this implementation.

---

## Execution

This plan is ready for execution using `superpowers:executing-plans` or `superpowers:subagent-driven-development`.
