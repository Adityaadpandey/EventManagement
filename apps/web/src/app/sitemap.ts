import type { MetadataRoute } from "next";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.tixin.in/api/v1";

async function fetchAllEventIds(): Promise<
  { eventId: string; date?: string }[]
> {
  try {
    const allEvents: { eventId: string; date?: string }[] = [];
    let page = 1;
    const limit = 200;

    while (true) {
      const res = await fetch(
        `${API_URL}/event/public?page=${page}&limit=${limit}`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) return [];
      const data = await res.json();
      const pageEvents = data?.data ?? [];
      if (!Array.isArray(pageEvents) || pageEvents.length === 0) break;

      for (const e of pageEvents) {
        allEvents.push({ eventId: e.eventId, date: e.date });
      }

      if (pageEvents.length < limit) break;
      page += 1;
    }

    return allEvents;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await fetchAllEventIds();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: "https://www.tixin.in",
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: "https://www.tixin.in/about-us",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: "https://www.tixin.in/privacy-policy",
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
    url: `https://www.tixin.in/event/${event.eventId}`,
    lastModified: event.date ? new Date(event.date) : now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...eventRoutes];
}
