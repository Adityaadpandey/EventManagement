/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return (
      registry[uri] ||
      new Promise((resolve) => {
        if ("document" in self) {
          const script = document.createElement("script");
          script.src = uri;
          script.onload = resolve;
          document.head.appendChild(script);
        } else {
          nextDefineUri = uri;
          importScripts(uri);
          resolve();
        }
      }).then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri =
      nextDefineUri ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = (depUri) => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require,
    };
    registry[uri] = Promise.all(
      depsNames.map((depName) => specialDeps[depName] || require(depName)),
    ).then((deps) => {
      factory(...deps);
      return exports;
    });
  };
}
define(["./workbox-2cbdcaae"], function (workbox) {
  "use strict";

  importScripts();
  self.skipWaiting();
  workbox.clientsClaim();
  workbox.registerRoute(
    "/",
    new workbox.NetworkFirst({
      cacheName: "start-url",
      plugins: [
        {
          cacheWillUpdate: async ({ request, response, event, state }) => {
            if (response && response.type === "opaqueredirect") {
              return new Response(response.body, {
                status: 200,
                statusText: "OK",
                headers: response.headers,
              });
            }
            return response;
          },
        },
      ],
    }),
    "GET",
  );
  workbox.registerRoute(
    /.*/i,
    new workbox.NetworkOnly({
      cacheName: "dev",
      plugins: [],
    }),
    "GET",
  );

  // Push notification handlers
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
});
