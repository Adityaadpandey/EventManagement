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
      f = { module: { uri: n }, exports: t, require: r };
    s[n] = Promise.all(c.map((e) => f[e] || r(e))).then((e) => (i(...e), t));
  };
}
define(["./workbox-495fd258"], function (e) {
  "use strict";
  (importScripts("worker-bLulPIiwGSMbJPJW_FYZM.js"),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: "/_next/static/bLulPIiwGSMbJPJW_FYZM/_buildManifest.js",
          revision: "968687aa7a2e77b7863f1ee081e64a02",
        },
        {
          url: "/_next/static/bLulPIiwGSMbJPJW_FYZM/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/chunks/0198aeb4-6f7024e1bccc7d70.js",
          revision: "6f7024e1bccc7d70",
        },
        {
          url: "/_next/static/chunks/0c36021b-0784d3ecfb682d8b.js",
          revision: "0784d3ecfb682d8b",
        },
        {
          url: "/_next/static/chunks/1375.a2fd97ee92c9262e.js",
          revision: "a2fd97ee92c9262e",
        },
        {
          url: "/_next/static/chunks/1902-4fa579c86483de4b.js",
          revision: "4fa579c86483de4b",
        },
        {
          url: "/_next/static/chunks/213-7b32cc610b74dffd.js",
          revision: "7b32cc610b74dffd",
        },
        {
          url: "/_next/static/chunks/2507-e470f228f4246c55.js",
          revision: "e470f228f4246c55",
        },
        {
          url: "/_next/static/chunks/2899-d788de087a2e61f5.js",
          revision: "d788de087a2e61f5",
        },
        {
          url: "/_next/static/chunks/2ab7be93-8a5ff372eda8033e.js",
          revision: "8a5ff372eda8033e",
        },
        {
          url: "/_next/static/chunks/3446-9f5cbfb6f601f5ba.js",
          revision: "9f5cbfb6f601f5ba",
        },
        {
          url: "/_next/static/chunks/3547-226e53d61999756f.js",
          revision: "226e53d61999756f",
        },
        {
          url: "/_next/static/chunks/3667-32fab7ef204181cf.js",
          revision: "32fab7ef204181cf",
        },
        {
          url: "/_next/static/chunks/3686-68bfa025e25fb033.js",
          revision: "68bfa025e25fb033",
        },
        {
          url: "/_next/static/chunks/4458-29eaa7c27f7abc17.js",
          revision: "29eaa7c27f7abc17",
        },
        {
          url: "/_next/static/chunks/4516-dc0c227cecae1f73.js",
          revision: "dc0c227cecae1f73",
        },
        {
          url: "/_next/static/chunks/5280-98e60f76bafa2eeb.js",
          revision: "98e60f76bafa2eeb",
        },
        {
          url: "/_next/static/chunks/5305-f26df7f7941633c1.js",
          revision: "f26df7f7941633c1",
        },
        {
          url: "/_next/static/chunks/692-c9cad54619155f42.js",
          revision: "c9cad54619155f42",
        },
        {
          url: "/_next/static/chunks/6951.48e912f89589949c.js",
          revision: "48e912f89589949c",
        },
        {
          url: "/_next/static/chunks/7031-b9acf0c76c1df85c.js",
          revision: "b9acf0c76c1df85c",
        },
        {
          url: "/_next/static/chunks/7261-ee2412f9ac70ca5c.js",
          revision: "ee2412f9ac70ca5c",
        },
        {
          url: "/_next/static/chunks/7834-917a2f9eb303b4f4.js",
          revision: "917a2f9eb303b4f4",
        },
        {
          url: "/_next/static/chunks/8600-e06bf125c4c4a3b0.js",
          revision: "e06bf125c4c4a3b0",
        },
        {
          url: "/_next/static/chunks/87c73c54-3c195070c5cbb22b.js",
          revision: "3c195070c5cbb22b",
        },
        {
          url: "/_next/static/chunks/9329-c4c39ec30e05fb54.js",
          revision: "c4c39ec30e05fb54",
        },
        {
          url: "/_next/static/chunks/9369.5c7f23c416744d4d.js",
          revision: "5c7f23c416744d4d",
        },
        {
          url: "/_next/static/chunks/a6646c5e-b1244d0599fae90e.js",
          revision: "b1244d0599fae90e",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-0a6ee461d6c2e3af.js",
          revision: "0a6ee461d6c2e3af",
        },
        {
          url: "/_next/static/chunks/app/about-us/page-787a70c88b11fec3.js",
          revision: "787a70c88b11fec3",
        },
        {
          url: "/_next/static/chunks/app/admin/events/%5BeventId%5D/page-51eafd9a9b18ac58.js",
          revision: "51eafd9a9b18ac58",
        },
        {
          url: "/_next/static/chunks/app/admin/events/page-bd17cc066fae42d3.js",
          revision: "bd17cc066fae42d3",
        },
        {
          url: "/_next/static/chunks/app/admin/events/pending/page-6738ab7b753f3b35.js",
          revision: "6738ab7b753f3b35",
        },
        {
          url: "/_next/static/chunks/app/admin/layout-6981f7574a398d22.js",
          revision: "6981f7574a398d22",
        },
        {
          url: "/_next/static/chunks/app/admin/page-026e6d1c83412e32.js",
          revision: "026e6d1c83412e32",
        },
        {
          url: "/_next/static/chunks/app/admin/payouts/page-a17e5e2e5e485cad.js",
          revision: "a17e5e2e5e485cad",
        },
        {
          url: "/_next/static/chunks/app/auth/page-5f2fb24a328ba12a.js",
          revision: "5f2fb24a328ba12a",
        },
        {
          url: "/_next/static/chunks/app/cancellation-policy/page-31202d849926dd74.js",
          revision: "31202d849926dd74",
        },
        {
          url: "/_next/static/chunks/app/checker/page-bf7ec75385e513b6.js",
          revision: "bf7ec75385e513b6",
        },
        {
          url: "/_next/static/chunks/app/event/%5BeventId%5D/attendees/page-c0861d756f4c0d48.js",
          revision: "c0861d756f4c0d48",
        },
        {
          url: "/_next/static/chunks/app/event/%5BeventId%5D/edit/page-702d35ba1e01aae5.js",
          revision: "702d35ba1e01aae5",
        },
        {
          url: "/_next/static/chunks/app/event/%5BeventId%5D/loading-1cf542c6d0ce2814.js",
          revision: "1cf542c6d0ce2814",
        },
        {
          url: "/_next/static/chunks/app/event/%5BeventId%5D/not-found-9e568a53ffd0dd00.js",
          revision: "9e568a53ffd0dd00",
        },
        {
          url: "/_next/static/chunks/app/event/%5BeventId%5D/page-1ae76623ed81ec4f.js",
          revision: "1ae76623ed81ec4f",
        },
        {
          url: "/_next/static/chunks/app/layout-bbb0acacbc52c344.js",
          revision: "bbb0acacbc52c344",
        },
        {
          url: "/_next/static/chunks/app/lister/edit/page-8c0057c8e58d1958.js",
          revision: "8c0057c8e58d1958",
        },
        {
          url: "/_next/static/chunks/app/lister/events/%5BeventId%5D/page-0cdb769aef95708c.js",
          revision: "0cdb769aef95708c",
        },
        {
          url: "/_next/static/chunks/app/lister/events/create/page-5199e2a456acf3cd.js",
          revision: "5199e2a456acf3cd",
        },
        {
          url: "/_next/static/chunks/app/lister/events/page-ab3f6e38b1144cc6.js",
          revision: "ab3f6e38b1144cc6",
        },
        {
          url: "/_next/static/chunks/app/lister/page-b44dcd94e5ac7d1e.js",
          revision: "b44dcd94e5ac7d1e",
        },
        {
          url: "/_next/static/chunks/app/notifications/page-c383ab36d3c4ba4f.js",
          revision: "c383ab36d3c4ba4f",
        },
        {
          url: "/_next/static/chunks/app/page-8583a5c82baf4255.js",
          revision: "8583a5c82baf4255",
        },
        {
          url: "/_next/static/chunks/app/privacy-policy/page-fee4cf0078859632.js",
          revision: "fee4cf0078859632",
        },
        {
          url: "/_next/static/chunks/app/profile/page-929e3257043b80a4.js",
          revision: "929e3257043b80a4",
        },
        {
          url: "/_next/static/chunks/app/server-sitemap.xml/route-1cf542c6d0ce2814.js",
          revision: "1cf542c6d0ce2814",
        },
        {
          url: "/_next/static/chunks/app/terms-and-conditions/page-a180b1b7759e3e12.js",
          revision: "a180b1b7759e3e12",
        },
        {
          url: "/_next/static/chunks/app/tickets/%5BticketId%5D/page-17aa88d4bcd5708c.js",
          revision: "17aa88d4bcd5708c",
        },
        {
          url: "/_next/static/chunks/app/tickets/my-tickets/page-ede3df66522be66e.js",
          revision: "ede3df66522be66e",
        },
        {
          url: "/_next/static/chunks/e89fb3a8.52ff3afe23c7019c.js",
          revision: "52ff3afe23c7019c",
        },
        {
          url: "/_next/static/chunks/framework-bf8bdb2eeeecd294.js",
          revision: "bf8bdb2eeeecd294",
        },
        {
          url: "/_next/static/chunks/main-3b8da6664e21d345.js",
          revision: "3b8da6664e21d345",
        },
        {
          url: "/_next/static/chunks/main-app-1df503ed777f4bf0.js",
          revision: "1df503ed777f4bf0",
        },
        {
          url: "/_next/static/chunks/pages/_app-27ea33a82010308b.js",
          revision: "27ea33a82010308b",
        },
        {
          url: "/_next/static/chunks/pages/_error-af9c9e8d00c97230.js",
          revision: "af9c9e8d00c97230",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-e6fb252602874ae8.js",
          revision: "e6fb252602874ae8",
        },
        {
          url: "/_next/static/css/081a0afca5a9bd20.css",
          revision: "081a0afca5a9bd20",
        },
        {
          url: "/_next/static/css/176cdeffa693ec48.css",
          revision: "176cdeffa693ec48",
        },
        {
          url: "/_next/static/css/1de76be520b4de19.css",
          revision: "1de76be520b4de19",
        },
        {
          url: "/_next/static/css/5ffc76fbbe15378a.css",
          revision: "5ffc76fbbe15378a",
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
        {
          url: "/_next/static/media/layers-2x.9859cd12.png",
          revision: "9859cd12",
        },
        {
          url: "/_next/static/media/layers.ef6db872.png",
          revision: "ef6db872",
        },
        {
          url: "/_next/static/media/marker-icon.d577052a.png",
          revision: "d577052a",
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
        { url: "/sitemap-0.xml", revision: "9a227254af941db924c751bdfbab6914" },
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
