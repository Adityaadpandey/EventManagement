import { NextResponse } from "next/server";

async function fetchPublicEvents({ page = 1, limit = 100 }) {
  try {
    const allEvents: any[] = [];
    let currentPage = page;

    while (true) {
      const response = await fetch(
        `https://api.tunyt.com/api/v1/event/public?page=${currentPage}&limit=${limit}`,
        { next: { revalidate: 3600 } },
      );
      if (!response.ok)
        throw new Error(`API request failed with status ${response.status}`);
      const json = await response.json();
      const items = json?.data ?? [];
      if (!Array.isArray(items) || items.length === 0) break;
      allEvents.push(...items);
      if (items.length < limit) break;
      currentPage++;
    }
    return { items: allEvents };
  } catch (error) {
    console.error("Error fetching events for sitemap:", error);
    return { items: [] };
  }
}

export async function GET() {
  const events = await fetchPublicEvents({ page: 1, limit: 100 });

  const urls = [
    {
      loc: "https://www.tunyt.com",
      lastmod: new Date().toISOString(),
      changefreq: "daily",
      priority: 1.0,
    },
    ...events.items.map((ev: any) => ({
      loc: `https://www.tunyt.com/event/${ev.eventId}`,
      lastmod:
        ev.date && !isNaN(Number(new Date(ev.date)))
          ? new Date(ev.date).toISOString()
          : new Date().toISOString(),
      changefreq: "daily",
      priority: 0.9,
    })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
