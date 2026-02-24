(self.addEventListener("push", (o) => {
  if ((console.log("Push SW: Push event received", o), o.data))
    try {
      const t = o.data.json();
      console.log("Push SW: Push notification data:", t);
      const i = t.title || "Tixin",
        n = {
          body: t.body || "You have a new notification",
          icon: t.icon || "/logos/pwa-icon-192.png",
          badge: t.badge || "/logos/pwa-icon-192.png",
          image: t.image,
          data: t.data || {},
          actions: t.actions || [],
          tag: t.tag || "default",
          requireInteraction: t.requireInteraction || !1,
          vibrate: [200, 100, 200],
          timestamp: Date.now(),
        };
      o.waitUntil(
        self.registration
          .showNotification(i, n)
          .then(() => console.log("Push SW: Notification shown"))
          .catch((o) =>
            console.error("Push SW: Error showing notification:", o),
          ),
      );
    } catch (t) {
      console.error("Push SW: Error handling push event:", t);
      try {
        const t = o.data.text();
        o.waitUntil(
          self.registration.showNotification("Tixin", {
            body: t,
            icon: "/logos/pwa-icon-192.png",
          }),
        );
      } catch (o) {
        console.error("Push SW: Fallback also failed:", o);
      }
    }
  else console.log("Push SW: Push event but no data");
}),
  self.addEventListener("notificationclick", (o) => {
    (console.log("Push SW: Notification clicked", o), o.notification.close());
    const t = o.notification.data || {},
      i = o.action;
    let n = t.url || "/";
    if ("view" === i && t.url) n = t.url;
    else if ("dismiss" === i) return;
    (console.log("Push SW: Opening URL:", n),
      o.waitUntil(
        clients
          .matchAll({ type: "window", includeUncontrolled: !0 })
          .then((o) => {
            for (let t = 0; t < o.length; t++) {
              const i = o[t];
              if (i.url.includes(n) && "focus" in i) return i.focus();
            }
            for (let t = 0; t < o.length; t++) {
              const i = o[t];
              if ("focus" in i && "navigate" in i)
                return i.focus().then(() => i.navigate(n));
            }
            if (clients.openWindow) return clients.openWindow(n);
          }),
      ));
  }),
  self.addEventListener("notificationclose", (o) => {
    console.log("Push SW: Notification closed", o);
  }),
  self.addEventListener("message", (o) => {
    if (o.data && "SHOW_NOTIFICATION" === o.data.type) {
      const { title: t, options: i } = o.data;
      self.registration.showNotification(t, i);
    }
  }));
