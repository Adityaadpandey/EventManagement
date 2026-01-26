# Push Notifications - Quick Start Guide

Get push notifications working in 5 minutes! ⚡

## Step 1: Generate VAPID Keys (1 min)

```bash
cd servers/user-server
node scripts/generate-vapid-keys.js
```

Copy the output keys.

## Step 2: Add Environment Variables (1 min)

### Backend (`servers/user-server/.env`):
```env
VAPID_PUBLIC_KEY=BKxxx...your_public_key
VAPID_PRIVATE_KEY=xxx...your_private_key
```

### Frontend (`apps/web/.env.local`):
```env
NEXT_PUBLIC_API_URL=https://api.tixin.in
```

## Step 3: Run Database Migration (1 min)

```bash
cd servers/user-server
npx prisma migrate dev
```

The `PushSubscription` model already exists in your schema!

## Step 4: Restart Servers (1 min)

```bash
# Backend
cd servers/user-server
pnpm dev

# Frontend
cd apps/web
pnpm dev
```

## Step 5: Test It! (1 min)

1. Open your app in browser
2. You'll see a notification prompt after 3 seconds
3. Click "Enable"
4. Go to `/profile` or wherever you add the settings
5. Click "Send Test Notification"
6. You should see a notification! 🎉

## Integration Examples

### Send notification after ticket purchase:

```typescript
// In your payment service
import { NotificationService } from './services/notification.service';

const notificationService = new NotificationService();

// After successful payment
await notificationService.sendTicketPurchaseNotification(userId, {
  ticketId: ticket.id,
  eventId: event.id,
  eventName: event.title,
});
```

### Send event reminder:

```typescript
// In a cron job or scheduled task
await notificationService.sendEventReminderNotification(userId, {
  eventId: event.id,
  eventName: event.title,
});
```

### Broadcast to all users (Admin):

```typescript
await notificationService.sendToAll({
  title: '🎉 New Feature!',
  body: 'Check out our latest update!',
  icon: '/logos/pwa-icon-192.png',
  data: { url: '/new-feature' },
});
```

## Add to Your UI

### Option 1: Auto-prompt (Recommended)

Add to your main layout:

```tsx
// app/layout.tsx
import NotificationPrompt from '@/components/NotificationPrompt';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <NotificationPrompt token={userToken} />
      </body>
    </html>
  );
}
```

### Option 2: Settings Page

```tsx
// app/settings/page.tsx
import NotificationSettings from '@/components/NotificationSettings';

export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <NotificationSettings token={userToken} />
    </div>
  );
}
```

### Option 3: Use the Hook

```tsx
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const { subscribed, subscribe } = useNotifications(token);

  return (
    <button onClick={subscribe} disabled={subscribed}>
      {subscribed ? '✅ Enabled' : 'Enable Notifications'}
    </button>
  );
}
```

## API Endpoints

```
GET  /api/v1/notification/vapid-public-key  - Get public key
POST /api/v1/notification/subscribe          - Subscribe user
POST /api/v1/notification/unsubscribe        - Unsubscribe user
POST /api/v1/notification/test               - Send test notification
POST /api/v1/notification/send               - Send custom (Admin only)
```

## Testing

### Test from Browser Console:

```javascript
// Check if supported
console.log('Supported:', 'serviceWorker' in navigator && 'PushManager' in window);

// Check permission
console.log('Permission:', Notification.permission);

// Check subscription
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscribed:', !!sub);
  });
});
```

### Test from API:

```bash
# Send test notification
curl -X POST https://api.tixin.in/api/v1/notification/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Not seeing notifications?

1. ✅ Check browser permissions (should be "Allow")
2. ✅ Verify VAPID keys are set correctly
3. ✅ Check service worker is registered (DevTools > Application > Service Workers)
4. ✅ Ensure you're on HTTPS (required for push notifications)
5. ✅ Check browser console for errors

### Permission denied?

- User must manually enable in browser settings
- Show instructions: Browser Settings > Site Settings > Notifications

### Service worker not registering?

- Check `public/sw.js` exists
- Verify HTTPS is enabled
- Clear browser cache and reload

## Browser Support

✅ Chrome, Edge, Firefox, Safari (iOS 16.4+), Opera
❌ Internet Explorer

## What's Next?

1. ✅ Integrate with your payment flow
2. ✅ Set up event reminders (cron job)
3. ✅ Add notification preferences
4. ✅ Monitor subscription stats
5. ✅ Customize notification icons/sounds

## Need Help?

Check the full documentation: `PUSH_NOTIFICATIONS_SETUP.md`

---

**That's it! You now have a complete push notification system! 🚀**
