import { NextResponse } from "next/server";

async function fetchPublicEvents({ page = 1, limit = 100 }) {
  try {
    let allEvents = [];
    let currentPage = page;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(
        `https://api.tixin.in/api/v1/event/public?page=${currentPage}&limit=${limit}`,
        { next: { revalidate: 3600 } }, // Cache for 1 hour
      );
      if (!response.ok)
        throw new Error(`API request failed with status ${response.status}`);
      const data = await response.json();
      allEvents = [...allEvents, ...data.items];
      hasMore = data.items.length === limit && data.totalPages > currentPage;
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
      loc: "https://www.tixin.in",
      lastmod: new Date().toISOString(),
      changefreq: "daily",
      priority: 1.0,
    },
    ...events.items.map((ev: any) => ({
      loc: `https://www.tixin.in/event/${ev.eventId}`,
      lastmod: new Date(
        ev.date && !isNaN(new Date(ev.date)) ? ev.date : new Date(),
      ).toISOString(),
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
