# Testing Push Notifications in Development

## ✅ Setup Complete - No More Warnings!

The annoying PWA warnings are gone. Here's how to test notifications in development.

## 🚀 Quick Test (3 Steps)

### 1. Start Your Servers

```bash
# Terminal 1 - Backend
cd servers/user-server
pnpm dev

# Terminal 2 - Frontend  
cd apps/web
pnpm dev
```

### 2. Open Test Page

Navigate to: **http://localhost:3000/test-notifications**

### 3. Follow the On-Screen Steps

1. Click "Register Service Worker"
2. Click "Request Permission" → Allow
3. Paste your auth token
4. Click "Subscribe to Push"
5. Click "Test Local Notification" (browser only)
6. Click "Test Push Notification" (from server)

## 🔑 Getting Your Auth Token

### Option 1: From Browser Console

```javascript
// After logging in, check localStorage
localStorage.getItem('token')
// or
localStorage.getItem('authToken')
```

### Option 2: From Network Tab

1. Open DevTools → Network
2. Login to your app
3. Find the login request
4. Copy the token from the response

### Option 3: Temporary Test Token

For quick testing, you can temporarily log the token:

```typescript
// In your login component
console.log('Auth Token:', token);
```

## 📱 What Changed

### Before (With Warnings)
```
⚠ GenerateSW has been called multiple times...
⚠ GenerateSW has been called multiple times...
⚠ GenerateSW has been called multiple times...
```

### After (Clean)
```
✓ Ready in 2s
No warnings! 🎉
```

## 🔧 How It Works

### Development Mode
- PWA is **disabled** (no warnings)
- Uses `sw-dev.js` for testing
- Manual service worker registration
- Full push notification support

### Production Mode
- PWA is **enabled**
- Uses `sw.js` (auto-generated)
- Automatic service worker registration
- Full PWA features

## 🧪 Testing Different Scenarios

### Test 1: Local Notification (No Server)
```javascript
// In browser console
navigator.serviceWorker.register('/sw-dev.js').then(reg => {
  reg.showNotification('Test', {
    body: 'This is a test',
    icon: '/logos/pwa-icon-192.png'
  });
});
```

### Test 2: Check Service Worker Status
```javascript
// In browser console
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW Registration:', reg);
  console.log('SW Active:', reg?.active);
});
```

### Test 3: Check Push Subscription
```javascript
// In browser console
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push Subscription:', sub);
  });
});
```

### Test 4: Manual Subscribe
```javascript
// In browser console (replace YOUR_TOKEN)
fetch('http://localhost:7001/api/v1/notification/vapid-public-key')
  .then(r => r.json())
  .then(data => console.log('VAPID Key:', data));
```

## 🐛 Troubleshooting

### Service Worker Not Registering?

**Check 1: File exists**
```bash
ls apps/web/public/sw-dev.js
```

**Check 2: Console errors**
Open DevTools → Console → Look for errors

**Check 3: Manual registration**
```javascript
navigator.serviceWorker.register('/sw-dev.js')
  .then(reg => console.log('Success:', reg))
  .catch(err => console.error('Error:', err));
```

### Permission Denied?

- Click the 🔒 icon in address bar
- Go to Site Settings
- Change Notifications to "Allow"
- Refresh page

### Not Receiving Notifications?

**Check 1: Subscription exists**
```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscribed:', !!sub);
  });
});
```

**Check 2: Backend is running**
```bash
curl http://localhost:7001/api/v1/notification/vapid-public-key
```

**Check 3: Token is valid**
```bash
curl -X POST http://localhost:7001/api/v1/notification/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Still Having Issues?

1. Clear browser cache
2. Unregister all service workers:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(regs => {
     regs.forEach(reg => reg.unregister());
   });
   ```
3. Refresh page
4. Try again

## 📊 Test Checklist

- [ ] Backend server running
- [ ] Frontend server running
- [ ] VAPID keys generated and added to .env
- [ ] Can access test page: http://localhost:3000/test-notifications
- [ ] Service worker registers successfully
- [ ] Permission is granted
- [ ] Can subscribe to push notifications
- [ ] Local notifications work
- [ ] Push notifications from server work
- [ ] Clicking notification opens correct page

## 🎯 Next Steps

Once testing works:

1. ✅ Add NotificationPrompt to your main layout
2. ✅ Add NotificationSettings to user profile
3. ✅ Integrate with payment/ticket flows
4. ✅ Test on mobile devices
5. ✅ Deploy to production

## 📱 Testing on Mobile

### Android (Chrome)
1. Connect phone to same WiFi
2. Get your computer's IP: `ipconfig` or `ifconfig`
3. Open: `http://YOUR_IP:3000/test-notifications`
4. Follow same steps

### iOS (Safari 16.4+)
1. Same as Android
2. Note: iOS has stricter requirements
3. May need HTTPS even in dev (use ngrok)

## 🔗 Useful Links

- Test Page: http://localhost:3000/test-notifications
- Backend API: http://localhost:7001/api/v1/notification
- Service Worker: http://localhost:3000/sw-dev.js

## 💡 Pro Tips

1. **Keep DevTools open** - See console logs from service worker
2. **Use Application tab** - Check service worker status
3. **Test in incognito** - Fresh state every time
4. **Use test page** - Easier than manual testing
5. **Check backend logs** - See notification sends

---

**No more warnings! Happy testing! 🎉**
