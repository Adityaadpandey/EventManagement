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
    const r = (e) => a(e, n),
      d = { module: { uri: n }, exports: t, require: r };
    s[n] = Promise.all(c.map((e) => d[e] || r(e))).then((e) => (i(...e), t));
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
          revision: "e66cd21e4eb297e1b7faf0c6775acb07",
        },
        {
          url: "/_next/dynamic-css-manifest.json",
          revision: "d751713988987e9331980363e24189ce",
        },
        {
          url: "/_next/static/FMYX3zEuhhtcrEvdboqcy/_buildManifest.js",
          revision: "8efc858f0fcd6917b3b7d03102ddcab2",
        },
        {
          url: "/_next/static/FMYX3zEuhhtcrEvdboqcy/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/chunks/0198aeb4-82bf26b7c723cac6.js",
          revision: "82bf26b7c723cac6",
        },
        {
          url: "/_next/static/chunks/0c36021b-1dc5b7d3e87b5350.js",
          revision: "1dc5b7d3e87b5350",
        },
        {
          url: "/_next/static/chunks/24-3057b856653b13a7.js",
          revision: "3057b856653b13a7",
        },
        {
          url: "/_next/static/chunks/2ab7be93-931b325d289bb83a.js",
          revision: "931b325d289bb83a",
        },
        {
          url: "/_next/static/chunks/464-d9722b0741d08720.js",
          revision: "d9722b0741d08720",
        },
        {
          url: "/_next/static/chunks/4bd1b696-cf72ae8a39fa05aa.js",
          revision: "cf72ae8a39fa05aa",
        },
        {
          url: "/_next/static/chunks/540-2a93f53e474e907d.js",
          revision: "2a93f53e474e907d",
        },
        {
          url: "/_next/static/chunks/66-624b913f79e6f665.js",
          revision: "624b913f79e6f665",
        },
        {
          url: "/_next/static/chunks/677-52295bbacce64455.js",
          revision: "52295bbacce64455",
        },
        {
          url: "/_next/static/chunks/766-41587ae232ab9347.js",
          revision: "41587ae232ab9347",
        },
        {
          url: "/_next/static/chunks/852-ea34b8cb1f468aa5.js",
          revision: "ea34b8cb1f468aa5",
        },
        {
          url: "/_next/static/chunks/874-437a265a67d6cfee.js",
          revision: "437a265a67d6cfee",
        },
        {
          url: "/_next/static/chunks/964-7a34cadcb7695cec.js",
          revision: "7a34cadcb7695cec",
        },
        {
          url: "/_next/static/chunks/990-7938fd267ce3fed8.js",
          revision: "7938fd267ce3fed8",
        },
        {
          url: "/_next/static/chunks/a6646c5e-8e3d5f8feffc9d4f.js",
          revision: "8e3d5f8feffc9d4f",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-263c22365f900614.js",
          revision: "263c22365f900614",
        },
        {
          url: "/_next/static/chunks/app/about-us/page-b282f339ad82e800.js",
          revision: "b282f339ad82e800",
        },
        {
          url: "/_next/static/chunks/app/admin/events/pending/page-d82732244859724c.js",
          revision: "d82732244859724c",
        },
        {
          url: "/_next/static/chunks/app/auth/page-98b04be83ec10309.js",
          revision: "98b04be83ec10309",
        },
        {
          url: "/_next/static/chunks/app/cancellation-policy/page-c357a334d1c7c87d.js",
          revision: "c357a334d1c7c87d",
        },
        {
          url: "/_next/static/chunks/app/checker/page-3db5aa365222f27e.js",
          revision: "3db5aa365222f27e",
        },
        {
          url: "/_next/static/chunks/app/event/%5BeventId%5D/loading-6b81abbd26830ec5.js",
          revision: "6b81abbd26830ec5",
        },
        {
          url: "/_next/static/chunks/app/event/%5BeventId%5D/page-be8127db9ef9ee72.js",
          revision: "be8127db9ef9ee72",
        },
        {
          url: "/_next/static/chunks/app/layout-f5934afd411482dc.js",
          revision: "f5934afd411482dc",
        },
        {
          url: "/_next/static/chunks/app/lister/events/create/page-1016ca9322b6d09c.js",
          revision: "1016ca9322b6d09c",
        },
        {
          url: "/_next/static/chunks/app/lister/events/page-b3c155950da66be7.js",
          revision: "b3c155950da66be7",
        },
        {
          url: "/_next/static/chunks/app/page-e28b58ee6cd67768.js",
          revision: "e28b58ee6cd67768",
        },
        {
          url: "/_next/static/chunks/app/privacy-policy/page-e9550fe4bcb25e6f.js",
          revision: "e9550fe4bcb25e6f",
        },
        {
          url: "/_next/static/chunks/app/profile/page-c512fe2c2d3add5c.js",
          revision: "c512fe2c2d3add5c",
        },
        {
          url: "/_next/static/chunks/app/server-sitemap.xml/route-6b81abbd26830ec5.js",
          revision: "6b81abbd26830ec5",
        },
        {
          url: "/_next/static/chunks/app/terms-and-conditions/page-c461990748c5a450.js",
          revision: "c461990748c5a450",
        },
        {
          url: "/_next/static/chunks/app/tickets/%5BticketId%5D/page-b83d50d051e4ee7f.js",
          revision: "b83d50d051e4ee7f",
        },
        {
          url: "/_next/static/chunks/app/tickets/my-tickets/page-efdbfc942444d6b6.js",
          revision: "efdbfc942444d6b6",
        },
        {
          url: "/_next/static/chunks/framework-8eb392182014deb6.js",
          revision: "8eb392182014deb6",
        },
        {
          url: "/_next/static/chunks/main-af539531d6c74a42.js",
          revision: "af539531d6c74a42",
        },
        {
          url: "/_next/static/chunks/main-app-0c8576eb5f2ec27b.js",
          revision: "0c8576eb5f2ec27b",
        },
        {
          url: "/_next/static/chunks/pages/_app-a140863f8437812c.js",
          revision: "a140863f8437812c",
        },
        {
          url: "/_next/static/chunks/pages/_error-8d22a269f50c54d4.js",
          revision: "8d22a269f50c54d4",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-7d282e47fb654624.js",
          revision: "7d282e47fb654624",
        },
        {
          url: "/_next/static/css/1904dd7f19e8c1f5.css",
          revision: "1904dd7f19e8c1f5",
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
          url: "/logos/pwa-icon-192.png",
          revision: "70808153e959f30eb1fce81eb14d1172",
        },
        {
          url: "/logos/roundedLogo.svg",
          revision: "a8b84668311e92bc3950e2c61ad6d362",
        },
        { url: "/manifest.json", revision: "f66a2d4a3de192a60bb1d990b8fdb08e" },
        { url: "/robots.txt", revision: "830b62988b91e450d42658284476ef74" },
        { url: "/sitemap-0.xml", revision: "9ac10da647656a202d90a8026462eb09" },
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
