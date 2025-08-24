import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "@/lib/api";

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
  banner_square?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
};

export type EventDetails = EventSummary & {
  description?: string | null;
  banner_vertical?: string | null;
  ticketTypes?: TicketType[];
};

type ListState = {
  items: EventSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  loading: boolean;
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
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    loading: false,
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

// GET /event/public?page=&limit=
export const fetchPublicEvents = createAsyncThunk<
  {
    items: EventSummary[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  { page?: number; limit?: number },
  { rejectValue: string }
>(
  "events/fetchPublic",
  async ({ page = 1, limit = 20 }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/event/public?page=${page}&limit=${limit}`);
      const data = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      return {
        items: data,
        page: meta.page ?? page,
        limit: meta.limit ?? limit,
        total: meta.total ?? data.length,
        totalPages: meta.totalPages ?? 1,
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
  reducers: {},
  extraReducers: (b) => {
    // ---- Public events list ----
    b.addCase(fetchPublicEvents.pending, (s) => {
      s.list.loading = true;
      s.list.error = null;
    });
    b.addCase(fetchPublicEvents.fulfilled, (s, a) => {
      s.list.loading = false;
      s.list.items = a.payload.items;
      s.list.page = a.payload.page;
      s.list.limit = a.payload.limit;
      s.list.total = a.payload.total;
      s.list.totalPages = a.payload.totalPages;
    });
    b.addCase(fetchPublicEvents.rejected, (s, a) => {
      s.list.loading = false;
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
      s.list.items.unshift(a.payload); // optional: show immediately in list
    });
    b.addCase(createEvent.rejected, (s, a) => {
      s.create.loading = false;
      s.create.error = a.payload || "Failed to create event";
    });
  },
});

export default eventsSlice.reducer;
