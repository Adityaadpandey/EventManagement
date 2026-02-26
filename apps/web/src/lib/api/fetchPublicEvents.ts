import type { EventSummary } from "@/lib/features/eventsSlice";

/**
 * Extended event data returned by the public API.
 * The API returns additional fields beyond the EventSummary type
 * that are useful for SEO structured data.
 */
export type SSREventData = EventSummary & {
  description?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  lister?: {
    listerId?: string;
    user?: { name?: string; email?: string };
    bio?: string;
  } | null;
  isGlobalEvent?: boolean;
  formattedDate?: string;
  formattedTime?: string;
};

export async function fetchPublicEventsSSR(): Promise<{
  items: SSREventData[];
  meta: {
    nextCursor: string | null;
    hasNextPage: boolean;
    limit: number;
  };
}> {
  const defaultMeta = { nextCursor: null, hasNextPage: false, limit: 10 };

  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "https://api.tixin.in/api/v1";
    const res = await fetch(`${apiUrl}/event/public?page=1&limit=10`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch events: ${res.statusText}`);
    }

    const json = await res.json();
    const items: SSREventData[] = json?.data ?? [];
    const meta = json?.meta ?? defaultMeta;

    return {
      items,
      meta: {
        nextCursor: meta.nextCursor ?? null,
        hasNextPage: meta.hasNextPage ?? false,
        limit: meta.limit ?? 10,
      },
    };
  } catch (err) {
    console.error("SSR fetch error:", err);
    return { items: [], meta: defaultMeta };
  }
}
