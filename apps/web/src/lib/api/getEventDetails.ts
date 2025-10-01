import api from "@/lib/api";
import { EventDetails } from "@/lib/features/eventsSlice";

export async function getEventDetails(
  eventId: string,
): Promise<EventDetails | null> {
  try {
    const res = await api.get(`/event/${eventId}/public`);
    return res.data?.data ?? null;
  } catch (err) {
    console.error("Error fetching event details on server:", err);
    return null;
  }
}
