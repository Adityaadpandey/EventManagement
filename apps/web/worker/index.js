/**
 * Custom push notification handlers injected into the main Workbox service worker
 * via next-pwa's customWorkerDir feature.
 *
 * This avoids registering a separate service worker for push notifications,
 * which would conflict with the main Workbox SW at the same scope.
 */

// Push event - Handle incoming push notifications
self.addEventListener("push", (event) => {
  console.log("Push SW: Push event received", event);

  if (!event.data) {
    console.log("Push SW: Push event but no data");
    return;
  }

  try {
    const data = event.data.json();
    console.log("Push SW: Push notification data:", data);

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
        .then(() => console.log("Push SW: Notification shown"))
        .catch((err) =>
          console.error("Push SW: Error showing notification:", err),
        ),
    );
  } catch (error) {
    console.error("Push SW: Error handling push event:", error);

    // Fallback: try to show notification with raw text
    try {
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification("Tixin", {
          body: text,
          icon: "/logos/pwa-icon-192.png",
        }),
      );
    } catch (fallbackError) {
      console.error("Push SW: Fallback also failed:", fallbackError);
    }
  }
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("Push SW: Notification clicked", event);

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

  console.log("Push SW: Opening URL:", urlToOpen);

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

        // If no matching window, try to find any window and navigate
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ("focus" in client && "navigate" in client) {
            return client.focus().then(() => client.navigate(urlToOpen));
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
  console.log("Push SW: Notification closed", event);
});

// Message event - Handle messages from the app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
