# Push Notifications Setup Guide

Complete implementation of push notifications for Tixin PWA (Progressive Web App).

## 🎯 Features

- ✅ Web Push Notifications (PWA)
- ✅ Service Worker integration
- ✅ Automatic subscription management
- ✅ Multiple notification types (ticket purchase, event reminders, payments, etc.)
- ✅ Admin broadcast notifications
- ✅ Subscription persistence in database
- ✅ Automatic cleanup of expired subscriptions
- ✅ React hooks for easy integration
- ✅ Beautiful UI components

## 📋 Prerequisites

### 1. Generate VAPID Keys

VAPID keys are required for web push notifications. Generate them using:

```bash
cd servers/user-server
npx web-push generate-vapid-keys
```

This will output:
```
Public Key: BKxxx...
Private Key: xxx...
```

### 2. Add Environment Variables

Add to `servers/user-server/.env`:

```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
```

Add to `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://api.tixin.in
```

## 🗄️ Database Setup

The `PushSubscription` model already exists in your Prisma schema. Run migration if needed:

```bash
cd servers/user-server
npx prisma migrate dev
```

## 🚀 Backend Implementation

### Files Created:

1. **`servers/user-server/src/services/notification.service.ts`**
   - Complete notification service with all methods
   - Handles subscription management
   - Sends different types of notifications
   - Auto-cleanup of expired subscriptions

2. **`servers/user-server/src/controllers/notification.controller.ts`**
   - API endpoints for notifications
   - Subscribe/unsubscribe
   - Send test notifications
   - Admin broadcast

3. **`servers/user-server/src/routes/v1/notification.router.ts`**
   - Routes configuration
   - Authentication middleware
   - Admin-only routes

### API Endpoints:

```
GET  /api/v1/notification/vapid-public-key  (Public)
POST /api/v1/notification/subscribe          (Auth required)
POST /api/v1/notification/unsubscribe        (Auth required)
POST /api/v1/notification/test               (Auth required)
POST /api/v1/notification/send               (Admin only)
```

## 🎨 Frontend Implementation

### Files Created:

1. **`apps/web/src/lib/notifications.ts`**
   - Core notification utilities
   - Service worker registration
   - Subscription management
   - Permission handling

2. **`apps/web/src/hooks/useNotifications.ts`**
   - React hook for notifications
   - State management
   - Easy integration

3. **`apps/web/src/components/NotificationSettings.tsx`**
   - Full-featured settings UI
   - Enable/disable notifications
   - Test notifications
   - Status display

4. **`apps/web/src/components/NotificationPrompt.tsx`**
   - Beautiful prompt banner
   - Auto-shows after 3 seconds
   - Dismissible with localStorage
   - Responsive design

5. **`apps/web/src/components/NotificationInitializer.tsx`**
   - Auto-initialization component
   - Background subscription
   - Silent setup

6. **`apps/web/public/sw-custom.js`**
   - Custom service worker
   - Push event handling
   - Notification click handling
   - Background sync

## 📱 Usage Examples

### 1. Add to Your App Layout

```tsx
// app/layout.tsx
import NotificationInitializer from '@/components/NotificationInitializer';
import NotificationPrompt from '@/components/NotificationPrompt';

export default function RootLayout({ children }) {
  const token = getUserToken(); // Your auth token

  return (
    <html>
      <body>
        {children}
        <NotificationInitializer token={token} autoSubscribe={false} />
        <NotificationPrompt token={token} />
      </body>
    </html>
  );
}
```

### 2. Add Settings Page

```tsx
// app/settings/notifications/page.tsx
import NotificationSettings from '@/components/NotificationSettings';

export default function NotificationsPage() {
  const token = getUserToken();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Notification Settings</h1>
      <NotificationSettings token={token} />
    </div>
  );
}
```

### 3. Use the Hook

```tsx
'use client';

import { useNotifications } from '@/hooks/useNotifications';

export default function MyComponent() {
  const token = getUserToken();
  const { supported, subscribed, subscribe, sendTest } = useNotifications(token);

  return (
    <div>
      {supported && !subscribed && (
        <button onClick={subscribe}>
          Enable Notifications
        </button>
      )}
      {subscribed && (
        <button onClick={sendTest}>
          Send Test
        </button>
      )}
    </div>
  );
}
```

## 🔔 Sending Notifications from Backend

### Send to Specific User

```typescript
import { NotificationService } from './services/notification.service';

const notificationService = new NotificationService();

// After ticket purchase
await notificationService.sendTicketPurchaseNotification(userId, {
  ticketId: 'ticket-123',
  eventId: 'event-456',
  eventName: 'Amazing Concert',
});

// Event reminder
await notificationService.sendEventReminderNotification(userId, {
  eventId: 'event-456',
  eventName: 'Amazing Concert',
});

// Payment success
await notificationService.sendPaymentSuccessNotification(userId, {
  paymentId: 'pay-789',
  amount: 1000,
});
```

### Send to Multiple Users

```typescript
// Event update to all ticket holders
await notificationService.sendEventUpdateNotification(
  ['user1', 'user2', 'user3'],
  {
    eventId: 'event-456',
    eventName: 'Amazing Concert',
  }
);
```

### Broadcast to All Users (Admin)

```typescript
await notificationService.sendToAll({
  title: '🎉 New Feature!',
  body: 'Check out our new event discovery feature!',
  icon: '/logos/pwa-icon-192.png',
  data: {
    type: 'ANNOUNCEMENT',
    url: '/discover',
  },
});
```

### Custom Notification

```typescript
await notificationService.sendToUser(userId, {
  title: 'Custom Title',
  body: 'Custom message',
  icon: '/logos/pwa-icon-192.png',
  badge: '/logos/pwa-icon-192.png',
  image: '/path/to/image.jpg',
  data: {
    type: 'CUSTOM',
    customData: 'anything',
    url: '/custom-page',
  },
  actions: [
    {
      action: 'view',
      title: 'View Details',
    },
    {
      action: 'dismiss',
      title: 'Dismiss',
    },
  ],
  tag: 'custom-tag',
  requireInteraction: true,
});
```

## 🧪 Testing

### 1. Test from Frontend

```bash
# Open your app
# Go to notification settings
# Click "Enable Notifications"
# Click "Send Test Notification"
```

### 2. Test from Backend (API)

```bash
# Get VAPID public key
curl https://api.tixin.in/api/v1/notification/vapid-public-key

# Subscribe (after getting subscription from browser)
curl -X POST https://api.tixin.in/api/v1/notification/subscribe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subscription": {...}}'

# Send test notification
curl -X POST https://api.tixin.in/api/v1/notification/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test Admin Broadcast

```bash
curl -X POST https://api.tixin.in/api/v1/notification/send \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Broadcast",
    "body": "This is a test broadcast message",
    "data": {"type": "TEST"}
  }'
```

## 🔧 Integration Points

### Integrate with Existing Features:

1. **Ticket Purchase** (`payment.service.ts`):
```typescript
// After successful payment
await notificationService.sendTicketPurchaseNotification(userId, ticketData);
```

2. **Event Reminders** (Create a cron job):
```typescript
// Run daily to check upcoming events
const upcomingEvents = await getEventsStartingIn24Hours();
for (const event of upcomingEvents) {
  const ticketHolders = await getTicketHolders(event.id);
  for (const user of ticketHolders) {
    await notificationService.sendEventReminderNotification(user.id, event);
  }
}
```

3. **Payment Status** (`payment.service.ts`):
```typescript
// After payment verification
await notificationService.sendPaymentSuccessNotification(userId, paymentData);
```

## 🎨 Customization

### Custom Notification Icons

Update in `apps/web/public/logos/`:
- `pwa-icon-192.png` - Notification icon
- `pwa-icon-512.png` - Large icon

### Custom Notification Sounds

Add to service worker:
```javascript
const options = {
  // ... other options
  sound: '/sounds/notification.mp3',
};
```

### Custom Actions

```typescript
actions: [
  {
    action: 'accept',
    title: 'Accept',
    icon: '/icons/accept.png',
  },
  {
    action: 'decline',
    title: 'Decline',
    icon: '/icons/decline.png',
  },
],
```

## 📊 Monitoring

### Check Subscription Stats

```sql
-- Total active subscriptions
SELECT COUNT(*) FROM "PushSubscription" WHERE "isActive" = true;

-- Subscriptions per user
SELECT "userId", COUNT(*) as count 
FROM "PushSubscription" 
WHERE "isActive" = true 
GROUP BY "userId";

-- Recent subscriptions
SELECT * FROM "PushSubscription" 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

### Logs

Check server logs for:
- Subscription events
- Notification sends
- Failed deliveries
- Expired subscriptions

## 🐛 Troubleshooting

### Notifications Not Showing

1. Check browser permissions
2. Verify VAPID keys are correct
3. Check service worker is registered
4. Verify subscription is saved in database
5. Check browser console for errors

### Service Worker Issues

```javascript
// Check service worker status
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg);
});

// Check subscription
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub);
  });
});
```

### Permission Denied

- User must manually enable in browser settings
- Cannot be programmatically changed
- Show instructions to user

## 🔒 Security

- VAPID keys are kept secret on server
- Subscriptions are tied to authenticated users
- Admin routes require admin role
- Expired subscriptions are automatically cleaned up
- Rate limiting on notification endpoints (already configured)

## 📱 Browser Support

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (iOS 16.4+, macOS)
- ✅ Opera
- ❌ IE (not supported)

## 🚀 Deployment

### Production Checklist:

1. ✅ Set VAPID keys in production environment
2. ✅ Update API_BASE_URL in frontend
3. ✅ Test service worker in production
4. ✅ Verify HTTPS is enabled (required for push)
5. ✅ Test on multiple devices/browsers
6. ✅ Set up monitoring/logging
7. ✅ Configure rate limits

## 📚 Resources

- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [VAPID](https://blog.mozilla.org/services/2016/08/23/sending-vapid-identified-webpush-notifications-via-mozillas-push-service/)

## ✅ Complete!

Your push notification system is now fully set up and ready to use! 🎉

Users will automatically be prompted to enable notifications, and you can send notifications from anywhere in your backend code.
