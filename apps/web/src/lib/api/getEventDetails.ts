import api from "@/lib/api";
import { EventDetails } from "@/lib/features/eventsSlice";

const eventCache = new Map<string, { data: EventDetails; timestamp: number }>();
const CACHE_TTL = 60000;
const STALE_TTL = 300000;

function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of eventCache.entries()) {
    if (now - value.timestamp > STALE_TTL) {
      eventCache.delete(key);
    }
  }
}

export async function getEventDetails(
  eventId: string,
): Promise<EventDetails | null> {
  // Return fresh cache if available
  const cached = eventCache.get(eventId);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await api.get(`/event/${eventId}/public`, {
      signal: controller.signal,
      ...(typeof window === "undefined" && {
        next: {
          revalidate: 60,
          tags: [`event-${eventId}`],
        },
      }),
    });

    clearTimeout(timeoutId);

    const eventData = res.data?.data ?? null;

    // Update cache
    if (eventData) {
      eventCache.set(eventId, {
        data: eventData,
        timestamp: now,
      });

      if (Math.random() < 0.05) {
        cleanupCache();
      }
    }

    return eventData;
  } catch (err: any) {
    if (cached && now - cached.timestamp < STALE_TTL) {
      console.warn(`Using stale cache for event ${eventId}`);
      return cached.data;
    }

    if (err.name !== "AbortError" && err.name !== "CanceledError") {
      console.error(
        "Error fetching event details on server:",
        err.message || err,
      );
    }

    return null;
  }
}
