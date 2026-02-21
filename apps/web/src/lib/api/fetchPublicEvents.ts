import { EventSummary } from "@/lib/features/eventsSlice";

export async function fetchPublicEventsSSR(): Promise<{
  items: EventSummary[];
  meta: { page: number; totalPages: number; limit: number };
}> {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "https://api.tixin.in/api/v1";
    const res = await fetch(`${apiUrl}/event/public?page=1&limit=10`, {
      mode: "cors",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch events: ${res.statusText}`);
    }

    const data = await res.json();
    const items = data?.data ?? [];
    const meta = data?.meta ?? {
      page: 1,
      totalPages: 1,
      limit: 10,
    };
    return { items, meta };
  } catch (err) {
    console.error("SSR fetch error:", err);
    return { items: [], meta: { page: 1, totalPages: 1, limit: 10 } };
  }
}
