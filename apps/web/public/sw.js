if (!self.define) {
  let e,
    s = {};
  const c = (c, a) => (
    (c = new URL(c + ".js", a).href),
    s[c] ||
      new Promise((s) => {
        if ("document" in self) {
          const e = document.createElement("script");
          ((e.src = c), (e.onload = s), document.head.appendChild(e));
        } else ((e = c), importScripts(c), s());
      }).then(() => {
        let e = s[c];
        if (!e) throw new Error(`Module ${c} didn’t register its module`);
        return e;
      })
  );
  self.define = (a, i) => {
    const n =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (s[n]) return;
    let t = {};
    const f = (e) => c(e, n),
      r = { module: { uri: n }, exports: t, require: f };
    s[n] = Promise.all(a.map((e) => r[e] || f(e))).then((e) => (i(...e), t));
  };
}
define(["./workbox-495fd258"], function (e) {
  "use strict";
  (importScripts("worker-W6aAqPinUY3pakwev4vhN.js"),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: "/_next/static/W6aAqPinUY3pakwev4vhN/_buildManifest.js",
          revision: "934ca2c3d96812696fbc3dc28235cde8",
        },
        {
          url: "/_next/static/W6aAqPinUY3pakwev4vhN/_ssgManifest.js",
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
          url: "/_next/static/chunks/2507-deb8dc9940d30502.js",
          revision: "deb8dc9940d30502",
        },
        {
          url: "/_next/static/chunks/251-63dba2c4cf8be428.js",
          revision: "63dba2c4cf8be428",
        },
        {
          url: "/_next/static/chunks/2696.ca30e5efd8c5ed9e.js",
          revision: "ca30e5efd8c5ed9e",
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
          url: "/_next/static/chunks/3446-1df2d005d0c60cf0.js",
          revision: "1df2d005d0c60cf0",
        },
        {
          url: "/_next/static/chunks/3686-36d9e8dbe4bac1a7.js",
          revision: "36d9e8dbe4bac1a7",
        },
        {
          url: "/_next/static/chunks/4314.8f579be2d2a0385b.js",
          revision: "8f579be2d2a0385b",
        },
        {
          url: "/_next/static/chunks/4458-29eaa7c27f7abc17.js",
          revision: "29eaa7c27f7abc17",
        },
        {
          url: "/_next/static/chunks/4891.c95fdee35b851242.js",
          revision: "c95fdee35b851242",
        },
        {
          url: "/_next/static/chunks/5058.920fe20c589f7c42.js",
          revision: "920fe20c589f7c42",
        },
        {
          url: "/_next/static/chunks/5280-20e363e8e03c81dc.js",
          revision: "20e363e8e03c81dc",
        },
        {
          url: "/_next/static/chunks/5305-f26df7f7941633c1.js",
          revision: "f26df7f7941633c1",
        },
        {
          url: "/_next/static/chunks/544.77a55d8b63b25f81.js",
          revision: "77a55d8b63b25f81",
        },
        {
          url: "/_next/static/chunks/5755.f3492c88955e53f5.js",
          revision: "f3492c88955e53f5",
        },
        {
          url: "/_next/static/chunks/692-c9cad54619155f42.js",
          revision: "c9cad54619155f42",
        },
        {
          url: "/_next/static/chunks/6941-441c84d3a7202318.js",
          revision: "441c84d3a7202318",
        },
        {
          url: "/_next/static/chunks/6951.6d4bfb39f80d26b5.js",
          revision: "6d4bfb39f80d26b5",
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
          url: "/_next/static/chunks/7697.90ce4edba12be027.js",
          revision: "90ce4edba12be027",
        },
        {
          url: "/_next/static/chunks/8194-0c38528a96696cb9.js",
          revision: "0c38528a96696cb9",
        },
        {
          url: "/_next/static/chunks/8322-959f47799df9126f.js",
          revision: "959f47799df9126f",
        },
        {
          url: "/_next/static/chunks/8575.d36de2e126e25931.js",
          revision: "d36de2e126e25931",
        },
        {
          url: "/_next/static/chunks/87c73c54-3c195070c5cbb22b.js",
          revision: "3c195070c5cbb22b",
        },
        {
          url: "/_next/static/chunks/928.3aa9ad718239ea1b.js",
          revision: "3aa9ad718239ea1b",
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
          url: "/_next/static/chunks/9726-bb0855d38494b47a.js",
          revision: "bb0855d38494b47a",
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
          url: "/_next/static/chunks/app/about-us/page-eccfac86c8683aa8.js",
          revision: "eccfac86c8683aa8",
        },
        {
          url: "/_next/static/chunks/app/admin/buyers/page-696312c14b40d750.js",
          revision: "696312c14b40d750",
        },
        {
          url: "/_next/static/chunks/app/admin/events/%5BeventId%5D/page-573fcfb3214fcbb6.js",
          revision: "573fcfb3214fcbb6",
        },
        {
          url: "/_next/static/chunks/app/admin/events/page-bd17cc066fae42d3.js",
          revision: "bd17cc066fae42d3",
        },
        {
          url: "/_next/static/chunks/app/admin/events/pending/page-1f162826fecfe9f9.js",
          revision: "1f162826fecfe9f9",
        },
        {
          url: "/_next/static/chunks/app/admin/layout-d4e8f42e012e8433.js",
          revision: "d4e8f42e012e8433",
        },
        {
          url: "/_next/static/chunks/app/admin/notifications/page-52f216f9ff82c42d.js",
          revision: "52f216f9ff82c42d",
        },
        {
          url: "/_next/static/chunks/app/admin/page-ab7c51837044400a.js",
          revision: "ab7c51837044400a",
        },
        {
          url: "/_next/static/chunks/app/admin/payouts/page-dc78d6391faff5dc.js",
          revision: "dc78d6391faff5dc",
        },
        {
          url: "/_next/static/chunks/app/auth/page-2e37873fae5d655a.js",
          revision: "2e37873fae5d655a",
        },
        {
          url: "/_next/static/chunks/app/cancellation-policy/page-79367f66d618f332.js",
          revision: "79367f66d618f332",
        },
        {
          url: "/_next/static/chunks/app/checker/layout-fe1b725f02fdce6f.js",
          revision: "fe1b725f02fdce6f",
        },
        {
          url: "/_next/static/chunks/app/checker/page-77a5867041f1d6f8.js",
          revision: "77a5867041f1d6f8",
        },
        {
          url: "/_next/static/chunks/app/event/%5BeventId%5D/edit/page-072b4b6bcb3d715b.js",
          revision: "072b4b6bcb3d715b",
        },
        {
          url: "/_next/static/chunks/app/event/%5BeventId%5D/loading-fe1b725f02fdce6f.js",
          revision: "fe1b725f02fdce6f",
        },
        {
          url: "/_next/static/chunks/app/event/%5BeventId%5D/not-found-9e568a53ffd0dd00.js",
          revision: "9e568a53ffd0dd00",
        },
        {
          url: "/_next/static/chunks/app/event/%5BeventId%5D/page-8868cadebb776861.js",
          revision: "8868cadebb776861",
        },
        {
          url: "/_next/static/chunks/app/layout-7b5b5b5cdf4f9b3e.js",
          revision: "7b5b5b5cdf4f9b3e",
        },
        {
          url: "/_next/static/chunks/app/lister/apply/page-8f6c762b50b29ea0.js",
          revision: "8f6c762b50b29ea0",
        },
        {
          url: "/_next/static/chunks/app/lister/edit/page-1773a112eac8f3b1.js",
          revision: "1773a112eac8f3b1",
        },
        {
          url: "/_next/static/chunks/app/lister/events/%5BeventId%5D/attendees/page-afebfe55263abfdc.js",
          revision: "afebfe55263abfdc",
        },
        {
          url: "/_next/static/chunks/app/lister/events/%5BeventId%5D/page-3e2ad9a16c91faca.js",
          revision: "3e2ad9a16c91faca",
        },
        {
          url: "/_next/static/chunks/app/lister/events/create/page-a4b676e7709bb9df.js",
          revision: "a4b676e7709bb9df",
        },
        {
          url: "/_next/static/chunks/app/lister/events/page-32f7a3b06d7c6e19.js",
          revision: "32f7a3b06d7c6e19",
        },
        {
          url: "/_next/static/chunks/app/lister/page-9f81697f44feb213.js",
          revision: "9f81697f44feb213",
        },
        {
          url: "/_next/static/chunks/app/lister/payouts/page-b7abd1ddff4c2176.js",
          revision: "b7abd1ddff4c2176",
        },
        {
          url: "/_next/static/chunks/app/notifications/page-3b1cab2d48b4bc54.js",
          revision: "3b1cab2d48b4bc54",
        },
        {
          url: "/_next/static/chunks/app/page-f12bffd52c035e94.js",
          revision: "f12bffd52c035e94",
        },
        {
          url: "/_next/static/chunks/app/privacy-policy/page-f7ba99151ef78538.js",
          revision: "f7ba99151ef78538",
        },
        {
          url: "/_next/static/chunks/app/profile/page-f295a67bf442d4cd.js",
          revision: "f295a67bf442d4cd",
        },
        {
          url: "/_next/static/chunks/app/robots.txt/route-fe1b725f02fdce6f.js",
          revision: "fe1b725f02fdce6f",
        },
        {
          url: "/_next/static/chunks/app/server-sitemap.xml/route-fe1b725f02fdce6f.js",
          revision: "fe1b725f02fdce6f",
        },
        {
          url: "/_next/static/chunks/app/sitemap.xml/route-fe1b725f02fdce6f.js",
          revision: "fe1b725f02fdce6f",
        },
        {
          url: "/_next/static/chunks/app/terms-and-conditions/page-dee274ea69e5c702.js",
          revision: "dee274ea69e5c702",
        },
        {
          url: "/_next/static/chunks/app/tickets/%5BticketId%5D/page-29842065a8619b35.js",
          revision: "29842065a8619b35",
        },
        {
          url: "/_next/static/chunks/app/tickets/my-tickets/page-3f6008298c7714b0.js",
          revision: "3f6008298c7714b0",
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
          url: "/_next/static/chunks/webpack-5e0ac32f187b0f5c.js",
          revision: "5e0ac32f187b0f5c",
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
          url: "/_next/static/css/ef0eb7bae85f2b50.css",
          revision: "ef0eb7bae85f2b50",
        },
        {
          url: "/_next/static/css/f122eb5736c93ee8.css",
          revision: "f122eb5736c93ee8",
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
        {
          url: "/svgs/DraswerDash.svg",
          revision: "7e5aed928b8bfbc4d6155e33b4f57a9c",
        },
        {
          url: "/svgs/addToCalendar.svg",
          revision: "64b3c480b221bf395ff154a669cfd0e8",
        },
        {
          url: "/svgs/admin-pending.svg",
          revision: "8acac12c38d7c70cd27167987113d9e0",
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
          url: "/svgs/create-event.svg",
          revision: "e21d09f75637b4921b5453d16d445405",
        },
        {
          url: "/svgs/download.svg",
          revision: "c7408e27f56921a37abb6f0de0f1e283",
        },
        {
          url: "/svgs/events.svg",
          revision: "b1685b0a7b7680f8a24df7dcaf7e55fc",
        },
        { url: "/svgs/home.svg", revision: "93f1bc055fcd587e70e472454b50913c" },
        {
          url: "/svgs/homeGradient.svg",
          revision: "abf4ddf4c4ca78a21e3822723c612059",
        },
        {
          url: "/svgs/lister-apply.svg",
          revision: "bd84dbe88720300b74cee6137ab807c3",
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
              event: c,
              state: a,
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
