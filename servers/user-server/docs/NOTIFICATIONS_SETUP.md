# Push Notifications Setup

This guide will help you set up push notifications for the Tixin platform.

## 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for web push notifications. They authenticate your server with push services.

```bash
cd servers/user-server
node scripts/generate-vapid-keys.js
```

This will output something like:

```
Generated VAPID Keys:
====================

Add these to your .env file:

VAPID_PUBLIC_KEY="BNxX..."
VAPID_PRIVATE_KEY="xyz..."

Public Key (for frontend):
BNxX...
```

## 2. Add Keys to .env

Copy the generated keys to your `.env` file in `servers/user-server/.env`:

```env
VAPID_PUBLIC_KEY="BNxX..."
VAPID_PRIVATE_KEY="xyz..."
```

**Important:**
- Keep the private key secret
- Never commit it to version control
- Each environment (dev, staging, production) should have its own keys

## 3. Restart Server

After adding the keys, restart your server:

```bash
cd servers/user-server
npm run dev
# or for production
npm run start:prod
```

The notification worker will validate the keys on startup. You should see:

```
✅ VAPID keys validated successfully
```

If keys are missing or invalid, you'll see an error:

```
❌ VAPID keys not configured! Generate with: node scripts/generate-vapid-keys.js
```

## 4. Test Notifications

### Frontend Testing

1. Visit your app at `https://your-domain.com` (must be HTTPS)
2. Log in to your account
3. You should see a notification permission modal
4. Click "Enable Notifications"
5. Grant permission when prompted by browser

### Send Test Notification

You can send a test notification via the API:

```bash
curl -X POST https://your-api-domain.com/api/v1/notification/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## Troubleshooting

### "Failed to fetch VAPID public key"

**Cause:** Server is not running, keys are not in .env, or API_URL is incorrect

**Solution:**
1. Check server is running: `curl https://your-api-domain.com/health`
2. Verify keys are in `.env` file
3. Check `NEXT_PUBLIC_API_URL` in frontend `.env` is correct

### "Notification permission denied"

**Cause:** User blocked notifications in browser settings

**Solution:**
1. In Chrome: Click padlock icon > Site settings > Notifications > Allow
2. In Firefox: Click shield icon > Permissions > Notifications > Allow
3. In Safari: Safari > Settings > Websites > Notifications > Allow
4. Clear site data and retry if needed

### "Push notifications are not supported"

**Cause:** Browser doesn't support push notifications or not using HTTPS

**Solution:**
1. Ensure site is accessed via HTTPS (required for push notifications)
2. Use modern browser: Chrome 50+, Firefox 44+, Safari 16+, Edge 17+
3. Push notifications don't work in:
   - Private/Incognito mode (some browsers)
   - Firefox on iOS (uses WebKit, limited support)
   - Older browsers

### Mobile Issues

**iOS:**
- Push notifications require iOS 16.4+ and Safari
- User must "Add to Home Screen" first
- Notifications only work when app is added to home screen

**Android:**
- Works in Chrome, Firefox, Edge, Samsung Internet
- Ensure browser notifications are not disabled in system settings
- Check battery optimization is not blocking notifications

### "Service Worker registration failed"

**Cause:** Service worker can't be registered (HTTPS issue, path issue, or browser restriction)

**Solution:**
1. Ensure site is HTTPS (required for service workers)
2. Check `public/sw.js` file exists
3. Clear browser cache and reload
4. Check browser console for detailed errors

### "Failed to save subscription on server"

**Cause:** Backend API error or authentication issue

**Solution:**
1. Check JWT token is valid
2. Verify API endpoint is accessible
3. Check server logs for errors
4. Ensure database is connected

## Browser Support

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome | ✅ 50+ | ✅ 50+ | Full support |
| Firefox | ✅ 44+ | ⚠️ Limited | iOS uses WebKit |
| Safari | ✅ 16+ | ✅ 16.4+ | Requires "Add to Home Screen" on iOS |
| Edge | ✅ 17+ | ✅ 17+ | Chromium-based |
| Opera | ✅ 37+ | ✅ 37+ | Chromium-based |

## Architecture

### Flow

1. User visits app and logs in
2. Frontend requests notification permission
3. Service worker is registered (`/sw.js`)
4. Frontend fetches VAPID public key from backend
5. Frontend subscribes to push notifications
6. Subscription is saved to database
7. Backend can now send push notifications to user

### Components

- **Frontend:** `apps/web/src/lib/notifications.ts`
- **Backend API:** `servers/user-server/src/api/notification/`
- **Worker:** `servers/user-server/src/workers/notification.worker.ts`
- **Service Worker:** `apps/web/public/sw.js`
- **Database:** `PushSubscription` and `Notification` models

## Security

- VAPID private key must be kept secret
- Use environment variables, never hardcode keys
- Validate JWT tokens on all notification endpoints
- Implement rate limiting on notification APIs
- Use HTTPS for all communication

## Development vs Production

### Development (localhost)

Push notifications **do not work** on localhost due to security restrictions. You have two options:

1. **Use tunneling service** (recommended):
   ```bash
   # Install ngrok
   npm install -g ngrok

   # Tunnel your localhost
   ngrok http 3000
   ```
   Then access your app via the HTTPS URL provided by ngrok.

2. **Test on production/staging only**

### Production

- Must use HTTPS (SSL certificate required)
- Configure proper domain in environment variables
- Use production VAPID keys (different from dev)
- Enable monitoring and logging

## Monitoring

Monitor these metrics:

- Subscription success rate
- Notification delivery rate
- Failed subscriptions (410/404 errors)
- User engagement with notifications

Check logs:

```bash
# Server logs
tail -f servers/user-server/logs/notification-worker.log

# Check Redis queue
redis-cli
> LLEN bull:notifications:wait
> LLEN bull:notifications:active
```

## Cleanup

Inactive subscriptions are automatically cleaned up:

- `src/jobs/subscription-cleanup.job.ts` runs daily
- Removes subscriptions inactive for 90+ days
- Marks subscriptions as inactive on 410/404 errors

## Additional Resources

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)
- [Push API MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
