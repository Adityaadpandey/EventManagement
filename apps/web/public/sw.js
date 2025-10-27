if (!self.define) {
  let e,
    s = {};
  const a = (a, c) => (
    (a = new URL(a + ".js", c).href),
    s[a] ||
      new Promise((s) => {
        if ("document" in self) {
          const e = document.createElement("script");
          ((e.src = a), (e.onload = s), document.head.appendChild(e));
        } else ((e = a), importScripts(a), s());
      }).then(() => {
        let e = s[a];
        if (!e) throw new Error(`Module ${a} didn’t register its module`);
        return e;
      })
  );
  self.define = (c, i) => {
    const n =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (s[n]) return;
    let t = {};
    const d = (e) => a(e, n),
      f = { module: { uri: n }, exports: t, require: d };
    s[n] = Promise.all(c.map((e) => f[e] || d(e))).then((e) => (i(...e), t));
  };
}
define(["./workbox-495fd258"], function (e) {
  "use strict";
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: "/_next/app-build-manifest.json",
          revision: "0c5360dbbf89f567502026a2e6cf053d",
        },
        {
          url: "/_next/dynamic-css-manifest.json",
          revision: "d751713988987e9331980363e24189ce",
        },
        {
          url: "/_next/static/chunks/0198aeb4-69d7993db6b58c12.js",
          revision: "69d7993db6b58c12",
        },
        {
          url: "/_next/static/chunks/0c36021b-0245ac4a43281bc8.js",
          revision: "0245ac4a43281bc8",
        },
        {
          url: "/_next/static/chunks/261-3dec694c348fac9b.js",
          revision: "3dec694c348fac9b",
        },
        {
          url: "/_next/static/chunks/2ab7be93-dfe1f01508f6b856.js",
          revision: "dfe1f01508f6b856",
        },
        {
          url: "/_next/static/chunks/305-595e08aa2b052c97.js",
          revision: "595e08aa2b052c97",
        },
        {
          url: "/_next/static/chunks/31-fdfd2fe188add3c8.js",
          revision: "fdfd2fe188add3c8",
        },
        {
          url: "/_next/static/chunks/329-3649ee9a5576f009.js",
          revision: "3649ee9a5576f009",
        },
        {
          url: "/_next/static/chunks/369.7c6d6d433ac3b35f.js",
          revision: "7c6d6d433ac3b35f",
        },
        {
          url: "/_next/static/chunks/375.17a55721cbdd09ec.js",
          revision: "17a55721cbdd09ec",
        },
        {
          url: "/_next/static/chunks/389-5a7facbfb8b6ca58.js",
          revision: "5a7facbfb8b6ca58",
        },
        {
          url: "/_next/static/chunks/521-0bedca8833d6066d.js",
          revision: "0bedca8833d6066d",
        },
        {
          url: "/_next/static/chunks/547-a9ce4ac9d6383ff3.js",
          revision: "a9ce4ac9d6383ff3",
        },
        {
          url: "/_next/static/chunks/556-fd8d3ab85c5c3240.js",
          revision: "fd8d3ab85c5c3240",
        },
        {
          url: "/_next/static/chunks/634-1ff701594379912a.js",
          revision: "1ff701594379912a",
        },
        {
          url: "/_next/static/chunks/692-c9cad54619155f42.js",
          revision: "c9cad54619155f42",
        },
        {
          url: "/_next/static/chunks/87c73c54-3c195070c5cbb22b.js",
          revision: "3c195070c5cbb22b",
        },
        {
          url: "/_next/static/chunks/888-1c91bf3afb69cd88.js",
          revision: "1c91bf3afb69cd88",
        },
        {
          url: "/_next/static/chunks/899-d77953d7de47667d.js",
          revision: "d77953d7de47667d",
        },
        {
          url: "/_next/static/chunks/a6646c5e-b6cde98459ca6af8.js",
          revision: "b6cde98459ca6af8",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-7bef03e1a265d20e.js",
          revision: "7bef03e1a265d20e",
        },
        {
          url: "/_next/static/chunks/app/about-us/page-e8e95d6cef15b38c.js",
          revision: "e8e95d6cef15b38c",
        },
        {
          url: "/_next/static/chunks/app/admin/events/pending/page-29226623dda4191c.js",
          revision: "29226623dda4191c",
        },
        {
          url: "/_next/static/chunks/app/auth/page-cc10a8db58dbbbb2.js",
          revision: "cc10a8db58dbbbb2",
        },
        {
          url: "/_next/static/chunks/app/cancellation-policy/page-642060f10b32f1ff.js",
          revision: "642060f10b32f1ff",
        },
        {
          url: "/_next/static/chunks/app/checker/page-93dcbd86cd089aa3.js",
          revision: "93dcbd86cd089aa3",
        },
        {
          url: "/_next/static/chunks/app/event/%5BeventId%5D/loading-a432de3753affe46.js",
          revision: "a432de3753affe46",
        },
        {
          url: "/_next/static/chunks/app/event/%5BeventId%5D/not-found-4b5e719b569cd485.js",
          revision: "4b5e719b569cd485",
        },
        {
          url: "/_next/static/chunks/app/event/%5BeventId%5D/page-a3b66401f7fcd482.js",
          revision: "a3b66401f7fcd482",
        },
        {
          url: "/_next/static/chunks/app/layout-6402ed9d27130682.js",
          revision: "6402ed9d27130682",
        },
        {
          url: "/_next/static/chunks/app/lister/edit/page-a8c5d7cd95d74246.js",
          revision: "a8c5d7cd95d74246",
        },
        {
          url: "/_next/static/chunks/app/lister/events/create/page-1ea30a73692ff2da.js",
          revision: "1ea30a73692ff2da",
        },
        {
          url: "/_next/static/chunks/app/lister/events/page-2f3cd456150ef864.js",
          revision: "2f3cd456150ef864",
        },
        {
          url: "/_next/static/chunks/app/lister/page-19223f385893d5ac.js",
          revision: "19223f385893d5ac",
        },
        {
          url: "/_next/static/chunks/app/page-7799b3f54ee12b2c.js",
          revision: "7799b3f54ee12b2c",
        },
        {
          url: "/_next/static/chunks/app/privacy-policy/page-4a31ca9f22d107f0.js",
          revision: "4a31ca9f22d107f0",
        },
        {
          url: "/_next/static/chunks/app/profile/page-1f5a34bbf6e2a068.js",
          revision: "1f5a34bbf6e2a068",
        },
        {
          url: "/_next/static/chunks/app/server-sitemap.xml/route-a432de3753affe46.js",
          revision: "a432de3753affe46",
        },
        {
          url: "/_next/static/chunks/app/terms-and-conditions/page-81530943252ad242.js",
          revision: "81530943252ad242",
        },
        {
          url: "/_next/static/chunks/app/tickets/%5BticketId%5D/page-d6956dc840c01bbf.js",
          revision: "d6956dc840c01bbf",
        },
        {
          url: "/_next/static/chunks/app/tickets/my-tickets/page-ee8a187fbf3f1a06.js",
          revision: "ee8a187fbf3f1a06",
        },
        {
          url: "/_next/static/chunks/framework-ef1c9154eda82147.js",
          revision: "ef1c9154eda82147",
        },
        {
          url: "/_next/static/chunks/main-1fea0893c54c7714.js",
          revision: "1fea0893c54c7714",
        },
        {
          url: "/_next/static/chunks/main-app-db094b9ef331a6d5.js",
          revision: "db094b9ef331a6d5",
        },
        {
          url: "/_next/static/chunks/pages/_app-3f856393629b8585.js",
          revision: "3f856393629b8585",
        },
        {
          url: "/_next/static/chunks/pages/_error-ba8edd62fb63d5c5.js",
          revision: "ba8edd62fb63d5c5",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-15e4043eb3c056a8.js",
          revision: "15e4043eb3c056a8",
        },
        {
          url: "/_next/static/css/583c44aebf2f2258.css",
          revision: "583c44aebf2f2258",
        },
        {
          url: "/_next/static/css/5ffc76fbbe15378a.css",
          revision: "5ffc76fbbe15378a",
        },
        {
          url: "/_next/static/gJoRoLX7O77S5XinnMqvP/_buildManifest.js",
          revision: "c5edf2fe70dfa3213a3d9808aa49a3fa",
        },
        {
          url: "/_next/static/gJoRoLX7O77S5XinnMqvP/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/media/19cfc7226ec3afaa-s.woff2",
          revision: "9dda5cfc9a46f256d0e131bb535e46f8",
        },
        {
          url: "/_next/static/media/21350d82a1f187e9-s.woff2",
          revision: "4e2553027f1d60eff32898367dd4d541",
        },
        {
          url: "/_next/static/media/8e9860b6e62d6359-s.woff2",
          revision: "01ba6c2a184b8cba08b0d57167664d75",
        },
        {
          url: "/_next/static/media/93a6e477e1480c92-s.woff2",
          revision: "63a7e6a745b18221c0c3b486a3317ae4",
        },
        {
          url: "/_next/static/media/9d5a263311222317-s.p.woff2",
          revision: "b7df97614c8e4bd077a00d424ba42b1d",
        },
        {
          url: "/_next/static/media/ba9851c3c22cd980-s.woff2",
          revision: "9e494903d6b0ffec1a1e14d34427d44d",
        },
        {
          url: "/_next/static/media/c5fe6dc8356a8c31-s.woff2",
          revision: "027a89e9ab733a145db70f09b8a18b42",
        },
        {
          url: "/_next/static/media/c7e0cf6c760983e7-s.woff2",
          revision: "deca0e4e8d0eee8cc1264e48d7a4e42f",
        },
        {
          url: "/_next/static/media/df0a9ae256c0569c-s.woff2",
          revision: "d54db44de5ccb18886ece2fda72bdfe0",
        },
        {
          url: "/_next/static/media/e4af272ccee01ff0-s.p.woff2",
          revision: "65850a373e258f1c897a2b3d75eb74de",
        },
        { url: "/favicon.ico", revision: "319fb0118da21e1a57aebe6c6d1ab105" },
        { url: "/file.svg", revision: "d09f95206c3fa0bb9bd9fefabfd0ea71" },
        {
          url: "/logos/circleLogo.svg",
          revision: "9a8bfc99b13330ccbca7a6c462607b0b",
        },
        {
          url: "/logos/icon.png",
          revision: "a21bd8bd7db815b606994baeabfa901e",
        },
        {
          url: "/logos/logoOnBlack.png",
          revision: "70808153e959f30eb1fce81eb14d1172",
        },
        {
          url: "/logos/logoOnWhite.png",
          revision: "b4d5441d0554fbd4adfc1be22c3ce718",
        },
        {
          url: "/logos/primaryLogo.png",
          revision: "60528af7f471ce3f19207bac7211f1bd",
        },
        {
          url: "/logos/pwa-icon-192.png",
          revision: "a21bd8bd7db815b606994baeabfa901e",
        },
        {
          url: "/logos/pwa-icon-512.png",
          revision: "70808153e959f30eb1fce81eb14d1172",
        },
        {
          url: "/logos/roundedLogo.svg",
          revision: "a8b84668311e92bc3950e2c61ad6d362",
        },
        { url: "/manifest.json", revision: "482bb23f14bb69d0f2681299e40ffcd8" },
        { url: "/robots.txt", revision: "830b62988b91e450d42658284476ef74" },
        { url: "/sitemap-0.xml", revision: "5019d5a73d250fca1f6a3efa9f8f466f" },
        { url: "/sitemap.xml", revision: "05a7e4c9b5cd66441f73de132244a1f8" },
        {
          url: "/svgs/DraswerDash.svg",
          revision: "7e5aed928b8bfbc4d6155e33b4f57a9c",
        },
        {
          url: "/svgs/addToCalendar.svg",
          revision: "64b3c480b221bf395ff154a669cfd0e8",
        },
        {
          url: "/svgs/arrowRight.svg",
          revision: "73f233d8791f9ae871d156ad2342739a",
        },
        {
          url: "/svgs/calendar.svg",
          revision: "6020b0e6e4ebe7b7546277697b8b719f",
        },
        {
          url: "/svgs/clock.svg",
          revision: "bc7a122c645a0c76f51112fe5fc87908",
        },
        {
          url: "/svgs/download.svg",
          revision: "c7408e27f56921a37abb6f0de0f1e283",
        },
        { url: "/svgs/home.svg", revision: "93f1bc055fcd587e70e472454b50913c" },
        {
          url: "/svgs/homeGradient.svg",
          revision: "abf4ddf4c4ca78a21e3822723c612059",
        },
        {
          url: "/svgs/location.svg",
          revision: "15ab839c375d148ebdc7db3ba4bd3b01",
        },
        {
          url: "/svgs/notification.svg",
          revision: "7241317ff0eea1df0c5c1ef95d389ff2",
        },
        {
          url: "/svgs/searchIcon.svg",
          revision: "9df4f00875174ab7410e205c8d3d08bb",
        },
        {
          url: "/svgs/shine.svg",
          revision: "9cc0d570d9aef2cc41730a515aec0106",
        },
        {
          url: "/svgs/ticket.svg",
          revision: "4fc41559d8122dea405df98808b6e949",
        },
        { url: "/window.svg", revision: "a2760511c65806022ad20adf74370ff3" },
      ],
      { ignoreURLParametersMatching: [] },
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      "/",
      new e.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({
              request: e,
              response: s,
              event: a,
              state: c,
            }) =>
              s && "opaqueredirect" === s.type
                ? new Response(s.body, {
                    status: 200,
                    statusText: "OK",
                    headers: s.headers,
                  })
                : s,
          },
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: "static-audio-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:mp4)$/i,
      new e.CacheFirst({
        cacheName: "static-video-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: "static-data-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        const s = e.pathname;
        return !s.startsWith("/api/auth/") && !!s.startsWith("/api/");
      },
      new e.NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        return !e.pathname.startsWith("/api/");
      },
      new e.NetworkFirst({
        cacheName: "others",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: e }) => !(self.origin === e.origin),
      new e.NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      "GET",
    ));
});
