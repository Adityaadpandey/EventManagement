/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://www.tixin.in",
  generateRobotsTxt: true,
  sitemapSize: 7000,
  async additionalPaths(config) {
    async function fetchPublicEvents({ page = 1, limit = 100 }) {
      try {
        let allEvents = [];
        let currentPage = page;
        let hasMore = true;

        while (hasMore) {
          const response = await fetch(
            `https://api.tixin.in/api/v1/event/public?page=${currentPage}&limit=${limit}`,
          );
          if (!response.ok) {
            throw new Error(
              `API request failed with status ${response.status}`,
            );
          }
          const data = await response.json();
          allEvents = [...allEvents, ...data.items];
          hasMore =
            data.items.length === limit && data.totalPages > currentPage;
          currentPage++;
        }
        return { items: allEvents };
      } catch (error) {
        console.error("Error fetching events for sitemap:", error);
        return { items: [] };
      }
    }

    const events = await fetchPublicEvents({ page: 1, limit: 100 });
    const categories = [
      "tech",
      "hackathon",
      "cultural",
      "edm",
      "concert",
      "ngo",
      "design",
      "sports",
    ];

    return [
      {
        loc: "/",
        lastmod: new Date().toISOString(),
        changefreq: "daily",
        priority: 1.0,
      },
      ...events.items.map((ev) => ({
        loc: `/event/${ev.eventId}`,
        lastmod: new Date(
          ev.date && !isNaN(new Date(ev.date)) ? ev.date : new Date(),
        ).toISOString(),
        changefreq: "daily",
        priority: 0.9,
      })),
    ];
  },
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/checker/*", "/admin/*"] },
    ],
  },
};
