import api from "@/lib/api";
import { EventDetails } from "@/lib/features/eventsSlice";
import { cache } from "react";

// Cache the function for the duration of the request
export const getEventDetails = cache(
  async (eventId: string): Promise<EventDetails | null> => {
    try {
      const res = await api.get(`/event/${eventId}/public`);
      return res.data?.data ?? null;
    } catch (err) {
      console.error("Error fetching event details on server:", err);
      return null;
    }
  },
);
