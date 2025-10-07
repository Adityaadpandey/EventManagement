import api from "@/lib/api";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export type TicketType = {
  ticketTypeId: string;
  name: string;
  price: number;
  quantity: number;
};

export type EventSummary = {
  eventId: string;
  title: string;
  banner_horizontal?: string | null;
  banner_vertical?: string | null;
  banner_square?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  tags?: string[] | null;
  TicketType?: TicketType[] | null;
  capacity?: string | null;
};

export type EventDetails = EventSummary & {
  description?: string | null;
  ticketTypes?: TicketType[];
};

type ListState = {
  items: EventSummary[];
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
};

type DetailsState = {
  byId: Record<string, EventDetails>;
  loadingId: string | null;
  error: string | null;
};

type CreateState = {
  loading: boolean;
  error: string | null;
  lastCreated: EventDetails | null;
};

type EventsState = {
  list: ListState;
  details: DetailsState;
  create: CreateState;
};

const initialState: EventsState = {
  list: {
    items: [],
    nextCursor: null,
    hasNextPage: false,
    limit: 10,
    loading: false,
    loadingMore: false,
    error: null,
  },
  details: {
    byId: {},
    loadingId: null,
    error: null,
  },
  create: {
    loading: false,
    error: null,
    lastCreated: null,
  },
};

// ----------------- THUNKS -----------------

// GET /event/public?cursor=&limit=&location=
export const fetchPublicEvents = createAsyncThunk<
  {
    events: EventSummary[];
    nextCursor: string | null;
    hasNextPage: boolean;
    limit: number;
  },
  { cursor?: string; limit?: number; location?: string; append?: boolean },
  { rejectValue: string }
>(
  "events/fetchPublic",
  async ({ cursor, limit = 10, location }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (cursor) params.append("cursor", cursor);
      params.append("limit", limit.toString());
      console.log(location);
      if (location) params.append("location", location);

      const res = await api.get(`/event/public?${params.toString()}`);
      const data = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};

      return {
        events: data,
        nextCursor: meta.nextCursor ?? null,
        hasNextPage: meta.hasNextPage ?? false,
        limit: meta.limit ?? limit,
      };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message || "Failed to load events",
      );
    }
  },
);

// GET /event/:eventId/public
export const fetchEventDetails = createAsyncThunk<
  { eventId: string; details: EventDetails },
  { eventId: string },
  { rejectValue: string }
>("events/fetchDetails", async ({ eventId }, { rejectWithValue }) => {
  try {
    const res = await api.get(`/event/${eventId}/public`);
    return { eventId, details: res.data?.data };
  } catch (err: any) {
    return rejectWithValue(
      err?.response?.data?.message || "Failed to load event details",
    );
  }
});

// POST /event
export type CreateEventRequest = {
  title: string;
  description: string;
  banner_horizontal: string;
  banner_vertical: string;
  banner_square: string;
  date: string;
  time: string;
  location: string;
  capacity?: number;
  samplePoster?: string;
  socialMediaGraphic?: string;
  eventFormat?: string;
  requestedVenue?: string;
  termsConditions?: string;
  rulesRegulations?: string;
  policies?: string;
  dutyLeavesDetails?: string;
  ticketTypes: { name: string; price: number; quantity: number }[];
  customFields?: { label: string; fieldType: string; required: boolean }[];
};

export const createEvent = createAsyncThunk<
  EventDetails,
  CreateEventRequest,
  { rejectValue: string }
>("events/createEvent", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post("/event", payload);
    return res.data?.data;
  } catch (err: any) {
    return rejectWithValue(
      err?.response?.data?.message || "Failed to create event",
    );
  }
});

// ----------------- SLICE -----------------
const eventsSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    resetEventsList: (state) => {
      state.list = initialState.list;
    },
  },
  extraReducers: (b) => {
    // ---- Public events list ----
    b.addCase(fetchPublicEvents.pending, (s, a) => {
      if (a.meta.arg.append) {
        s.list.loadingMore = true;
      } else {
        s.list.loading = true;
      }
      s.list.error = null;
    });
    b.addCase(fetchPublicEvents.fulfilled, (s, a) => {
      s.list.loading = false;
      s.list.loadingMore = false;

      if (a.meta.arg.append) {
        // Append new events for infinite scroll
        s.list.items = [...s.list.items, ...a.payload.events];
      } else {
        // Replace events for initial load or refresh
        s.list.items = a.payload.events;
      }

      s.list.nextCursor = a.payload.nextCursor;
      s.list.hasNextPage = a.payload.hasNextPage;
      s.list.limit = a.payload.limit;
    });
    b.addCase(fetchPublicEvents.rejected, (s, a) => {
      s.list.loading = false;
      s.list.loadingMore = false;
      s.list.error = a.payload || "Failed to fetch events";
    });

    // ---- Event details ----
    b.addCase(fetchEventDetails.pending, (s, a) => {
      s.details.loadingId = a.meta.arg.eventId;
      s.details.error = null;
    });
    b.addCase(fetchEventDetails.fulfilled, (s, a) => {
      s.details.loadingId = null;
      s.details.byId[a.payload.eventId] = a.payload.details;
    });
    b.addCase(fetchEventDetails.rejected, (s, a) => {
      s.details.loadingId = null;
      s.details.error = a.payload || "Failed to fetch event details";
    });

    // ---- Create event ----
    b.addCase(createEvent.pending, (s) => {
      s.create.loading = true;
      s.create.error = null;
      s.create.lastCreated = null;
    });
    b.addCase(createEvent.fulfilled, (s, a) => {
      s.create.loading = false;
      s.create.lastCreated = a.payload;
      s.list.items.unshift(a.payload);
    });
    b.addCase(createEvent.rejected, (s, a) => {
      s.create.loading = false;
      s.create.error = a.payload || "Failed to create event";
    });
  },
});

export const { resetEventsList } = eventsSlice.actions;
export default eventsSlice.reducer;
