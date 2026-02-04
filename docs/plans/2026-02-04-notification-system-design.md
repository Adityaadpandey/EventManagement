# Notification System Design

**Date:** 2026-02-04
**Status:** Approved
**Type:** Feature Implementation & Cleanup

## Overview

Implement a complete dual notification system (web push + in-app notifications) for the Event Management PWA. Fix existing incomplete implementation, remove unnecessary code, and integrate notifications into payment, ticketing, and event workflows.

## Current State

**What Exists:**
- Web push infrastructure (frontend utilities, backend service, database models)
- Service worker for push notifications (dev only)
- Unused in-app notification database model
- Notification methods that are never called

**Problems:**
- Production service worker doesn't handle push events
- No notification triggering in payment/ticket/event flows
- In-app notifications database table exists but has no implementation
- Three service worker files (only one works)
- Field name mismatches in payment service
- Test page for debugging only

## Architecture

### Dual Notification System

Every notification event creates BOTH:
1. **In-App Notification** - Stored in database, displayed in `/notifications` page
2. **Web Push Notification** - Sent to all user's subscribed devices via browser push API

**Flow:**
```
Event Occurs (ticket purchase, payment, etc.)
    ↓
Add job to notificationQueue
    ↓
Worker processes job:
    - Create notification record in Notification table
    - Send web push to all user's PushSubscription devices
    ↓
User sees browser notification (if online)
User sees notification in /notifications page (always)
```

**Benefits:**
- Immediate notifications when user is online
- Persistent notification history when user returns
- No lost notifications if push fails

## Notification Types

All notification types will be implemented:

### 1. Ticket Purchase Confirmation
- **Trigger:** After successful ticket creation in payment service
- **Title:** "Ticket Purchase Confirmed"
- **Body:** "Your ticket for [Event Name] has been confirmed"
- **Link:** `/tickets/[ticketId]` or `/events/[eventId]`
- **Type:** `ticket_purchase`

### 2. Payment Success
- **Trigger:** After payment is marked as completed
- **Title:** "Payment Successful"
- **Body:** "Your payment of $[amount] has been processed"
- **Link:** `/payments/[paymentId]`
- **Type:** `payment_success`

### 3. Event Reminders
- **Trigger:** Scheduled job finds events starting in 24 hours
- **Title:** "Event Reminder"
- **Body:** "[Event Name] starts tomorrow at [time]"
- **Link:** `/events/[eventId]`
- **Type:** `event_reminder`
- **Timing:** 24 hours before event start

### 4. Event Updates
- **Trigger:** When event details are modified (date, time, location, description)
- **Title:** "Event Updated"
- **Body:** "[Event Name] has been updated. Check the latest details."
- **Link:** `/events/[eventId]`
- **Type:** `event_update`
- **Recipients:** All users with tickets to that event

## Database Schema

### Notification Model (Modified)

```prisma
model Notification {
  notificationId  String    @id @default(uuid())
  userId          String
  user            User      @relation(...)

  title           String
  message         String
  link            String?
  type            String?   @default("info")

  read            Boolean   @default(false)
  sent            Boolean   @default(false)

  metadata        Json?     // NEW: Store event-specific data

  createdAt       DateTime  @default(now())
  readAt          DateTime?
  sentAt          DateTime?

  @@index([userId, read, createdAt(sort: Desc)])
  @@index([sent, createdAt])
}
```

**metadata field examples:**
- Ticket purchase: `{ eventId, ticketId, quantity, amount }`
- Payment: `{ paymentId, amount, currency }`
- Event reminder: `{ eventId, startDateTime, reminderSent: true }`
- Event update: `{ eventId, changedFields: ['date', 'location'] }`

### PushSubscription Model (No Changes)

Existing model is sufficient.

## Backend Implementation

### Queue Setup

**Add to `src/lib/queues.ts`:**

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

### Notification Worker

**New file: `src/workers/notification.worker.ts`**

- Pattern: Similar to `email.worker.ts`
- Queue name: `"notifications"`
- Job data interface:
  ```typescript
  interface NotificationJobData {
    userId: string;
    title: string;
    body: string;
    link?: string;
    type: string;
    metadata?: Record<string, any>;
  }
  ```
- Processing:
  1. Create notification record in database
  2. Send web push to all user's active subscriptions
  3. Update subscription `lastUsedAt` on success
  4. Mark subscription `isActive = false` on failure

### Notification Service Methods

**Add to `src/services/notification.service.ts`:**

1. `createNotification(userId, data)` - Create in-app notification record
2. `getUserNotifications(userId, options)` - Get paginated notifications
3. `markAsRead(notificationId, userId)` - Mark single as read
4. `markAllAsRead(userId)` - Mark all as read
5. `deleteNotification(notificationId, userId)` - Delete notification
6. `cleanupStaleSubscriptions()` - Remove inactive subscriptions >90 days

**Modify existing `sendToUser()`:**
- Update to also create in-app notification
- Or delegate to notification worker

### API Endpoints

**Add to `src/controllers/notification.controller.ts` and router:**

```
GET    /api/v1/notification           - Get user's notifications (paginated)
PATCH  /api/v1/notification/:id/read  - Mark notification as read
PATCH  /api/v1/notification/read-all  - Mark all as read
DELETE /api/v1/notification/:id       - Delete notification
```

All require `authMiddleware`. No admin-only endpoints.

### Event Reminder Scheduling

**New file: `src/jobs/schedule-event-reminders.job.ts`**

- Uses `node-cron` to run every hour
- Query logic:
  ```typescript
  const upcomingEvents = await prisma.event.findMany({
    where: {
      startDateTime: {
        gte: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        lt: new Date(Date.now() + 25 * 60 * 60 * 1000),  // 25 hours from now
      },
    },
    include: {
      Ticket: {
        where: { status: 'SUCCESS' },
        select: { userId: true },
      },
    },
  });
  ```
- For each event, get unique users with tickets
- Check if reminder already sent (use `metadata` or separate flag in Ticket)
- Add job to `notificationQueue` for each user
- Mark reminder as sent

### Subscription Cleanup Job

**New file: `src/jobs/cleanup-subscriptions.job.ts`**

- Uses `node-cron` to run daily at 2 AM
- Query:
  ```typescript
  await prisma.pushSubscription.deleteMany({
    where: {
      isActive: false,
      lastUsedAt: {
        lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      },
    },
  });
  ```
- Log cleanup statistics

### Integration Points

**Payment Service (`src/services/payment.service.ts`):**

After successful ticket creation:
```typescript
await notificationQueue.add('ticket-purchase', {
  userId: ticket.userId,
  title: 'Ticket Purchase Confirmed',
  body: `Your ticket for ${event.title} has been confirmed`,
  link: `/events/${event.eventId}`,
  type: 'ticket_purchase',
  metadata: {
    eventId: event.eventId,
    ticketId: ticket.ticketId,
    quantity: ticket.quantity,
    amount: ticket.totalPrice,
  },
});
```

After payment completion:
```typescript
await notificationQueue.add('payment-success', {
  userId: payment.userId,
  title: 'Payment Successful',
  body: `Your payment of ₹${payment.amount} has been processed`,
  link: `/payments/${payment.paymentId}`,
  type: 'payment_success',
  metadata: {
    paymentId: payment.paymentId,
    amount: payment.amount,
  },
});
```

**Event Service (`src/services/event.service.ts`):**

After event update:
```typescript
// Get all users with tickets to this event
const ticketHolders = await prisma.ticket.findMany({
  where: { eventId, status: 'SUCCESS' },
  select: { userId: true },
  distinct: ['userId'],
});

// Send notification to each user
for (const { userId } of ticketHolders) {
  await notificationQueue.add('event-update', {
    userId,
    title: 'Event Updated',
    body: `${event.title} has been updated. Check the latest details.`,
    link: `/events/${eventId}`,
    type: 'event_update',
    metadata: { eventId, changedFields },
  });
}
```

## Frontend Implementation

### Service Worker Consolidation

**Modify `/apps/web/public/sw.js`:**
- Keep existing Workbox caching setup
- Add push event handlers from `sw-dev.js`:
  - `push` event: Parse notification data, call `showNotification()`
  - `notificationclick` event: Open link, focus window
  - `notificationclose` event: Log close event

**Delete:**
- `/apps/web/public/sw-dev.js`
- `/apps/web/public/sw-custom.js`

**Simplify `src/lib/notifications.ts`:**
- Remove environment-based SW selection
- Always register `/sw.js`
- Remove `sw-dev.js` references

### Notification List UI

**New file: `/apps/web/src/app/notifications/page.tsx`**

**Features:**
- Fetch notifications from `/api/v1/notification` on page load
- Display list with:
  - Title and body text
  - Timestamp (relative: "2 hours ago")
  - Read/unread visual indicator (opacity/styling)
  - Click notification to navigate to `notification.link`
- "Mark as read" button per notification
- "Mark all as read" button at top
- "Delete" button per notification
- No pagination initially (fetch latest 50)
- No bell icon, no badges, no dropdown

**Data Management:**
- Use React state or existing state management
- Optimistic updates for mark-as-read and delete
- Refresh on page load

**Delete Test Page:**
- `/apps/web/src/app/test-notifications/page.tsx`

## Critical Fixes

### 1. Production Service Worker
**Problem:** `sw.js` uses Workbox but has no push event handling
**Fix:** Merge push handlers from `sw-dev.js` into `sw.js`

### 2. Field Name Mismatch
**Problem:** `payment.service.ts` line 141 uses wrong capitalization
**Current:** `InstagramLink`, `FacebookLink`, `XLink`
**Schema:** `instagramLink`, `facebookLink`, `xLink`
**Fix:** Update to camelCase field names

### 3. No Notification Triggering
**Problem:** Payment/ticket creation doesn't trigger notifications
**Fix:** Add `notificationQueue.add()` calls in payment and event services

### 4. Unused In-App Notifications
**Problem:** `Notification` table exists but never used
**Fix:** Implement full CRUD and frontend display

## Cleanup & Data Retention

**Strategy:** User-controlled deletion + auto-cleanup stale subscriptions

**In-App Notifications:**
- Users can manually delete notifications
- Users can mark as read/unread
- No automatic deletion
- Notification history preserved

**Push Subscriptions:**
- Auto-cleanup: Delete subscriptions where `isActive = false` AND `lastUsedAt > 90 days`
- Runs daily at 2 AM via cron job
- Failed subscriptions marked inactive but kept for 90 days (allows recovery)

## Files Summary

### DELETE
- `/apps/web/public/sw-dev.js`
- `/apps/web/public/sw-custom.js`
- `/apps/web/src/app/test-notifications/page.tsx`

### CREATE
- `/servers/user-server/src/workers/notification.worker.ts`
- `/servers/user-server/src/jobs/schedule-event-reminders.job.ts`
- `/servers/user-server/src/jobs/cleanup-subscriptions.job.ts`
- `/apps/web/src/app/notifications/page.tsx`

### MODIFY (Backend)
- `src/lib/queues.ts` - Add `notificationQueue`
- `src/services/notification.service.ts` - Add CRUD methods
- `src/controllers/notification.controller.ts` - Add endpoints
- `src/routes/v1/notification.router.ts` - Add routes
- `src/services/payment.service.ts` - Add triggers, fix field names
- `src/services/event.service.ts` - Add triggers
- `prisma/schema.prisma` - Add `metadata Json?` field

### MODIFY (Frontend)
- `/apps/web/public/sw.js` - Add push handlers
- `/apps/web/src/lib/notifications.ts` - Simplify registration

## Success Criteria

- [ ] Users receive browser push notifications for all 4 event types
- [ ] Users see notification list at `/notifications` page
- [ ] Notifications persist after browser restart
- [ ] Production service worker handles push events correctly
- [ ] Event reminders sent 24 hours before event start
- [ ] Stale subscriptions cleaned up automatically
- [ ] No field name mismatches in payment service
- [ ] Test page removed from production build
- [ ] Single production-ready service worker

## Non-Goals

- Bell icon in navbar (out of scope)
- Notification badges/unread count (out of scope)
- User notification preferences/settings (future)
- Email fallback notifications (future)
- SMS notifications (future)
- Push notification scheduling UI (future)
- Analytics/tracking for notifications (future)
