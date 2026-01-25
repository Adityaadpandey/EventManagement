/**
 * Custom Service Worker for Tixin PWA
 * Handles push notifications and notification clicks
 */

// Listen for push events
self.addEventListener("push", function (event) {
  console.log("Push event received:", event);

  if (!event.data) {
    console.log("Push event but no data");
    return;
  }

  try {
    const data = event.data.json();
    console.log("Push notification data:", data);

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

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error("Error handling push event:", error);
  }
});

// Listen for notification click events
self.addEventListener("notificationclick", function (event) {
  console.log("Notification clicked:", event);

  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  // Determine URL to open
  let urlToOpen = data.url || "/";

  // Handle specific actions
  if (action === "view" && data.url) {
    urlToOpen = data.url;
  } else if (action === "dismiss") {
    return; // Just close the notification
  }

  // Open or focus the app
  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(function (clientList) {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && "focus" in client) {
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

// Listen for notification close events
self.addEventListener("notificationclose", function (event) {
  console.log("Notification closed:", event);

  // You can track notification dismissals here
  const data = event.notification.data || {};

  // Optional: Send analytics about notification dismissal
  if (data.trackDismissal) {
    // Send to analytics endpoint
  }
});

// Handle background sync for failed notification sends
self.addEventListener("sync", function (event) {
  if (event.tag === "sync-notifications") {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Implement any background sync logic here
  console.log("Syncing notifications...");
}

// Handle messages from the main app
self.addEventListener("message", function (event) {
  console.log("Service Worker received message:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});

console.log("Custom Service Worker loaded");
