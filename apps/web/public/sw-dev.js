/**
 * Development Service Worker for Testing Push Notifications
 * Use this in development to test push notifications without PWA warnings
 *
 * To use: Register this SW manually in your browser console or component
 * navigator.serviceWorker.register('/sw-dev.js')
 */

console.log("🔧 Development Service Worker loaded");

// Install event
self.addEventListener("install", (event) => {
  console.log("🔧 SW: Install event");
  self.skipWaiting(); // Activate immediately
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("🔧 SW: Activate event");
  event.waitUntil(clients.claim()); // Take control immediately
});

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

  console.log("🔔 SW: Opening URL:", urlToOpen);

  // Open or focus the app
  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus();
          }
        }

        // If no window is open, open a new one
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

// Message event - Handle messages from the app
self.addEventListener("message", (event) => {
  console.log("🔧 SW: Message received", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});

console.log("🔧 Development Service Worker ready");
