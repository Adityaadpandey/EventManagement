import api from "@/lib/api";
import { EventSummary } from "@/lib/features/eventsSlice";

export async function fetchPublicEventsSSR(): Promise<{
  items: EventSummary[];
  meta: { page: number; totalPages: number; limit: number };
}> {
  try {
    const res = await api.get(`/event/public?page=1&limit=10`);
    const items = res.data?.data ?? [];
    const meta = res.data?.meta ?? {
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
