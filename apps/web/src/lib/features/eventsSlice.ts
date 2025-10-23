import api from "@/lib/api";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export type TicketType = {
  ticketTypeId: string;
  name: string;
  description?: string | null;
  price: number;
  discountedPrice?: number | null;
  discountReason?: string | null;
  quantity: number;
  salesCutoff?: string | null;
};

export type CustomField = {
  label: string;
  fieldType: string;
  required: boolean;
  options?: string;
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
  latitude?: number | null;
  longitude?: number | null;
  tags?: string[] | null;
  chips?: string[] | null;
  restrictions?: string | null;
  TicketType?: TicketType[] | null;
  capacity?: number | null;
};

export type EventDetails = EventSummary & {
  description?: string | null;
  ticketTypes?: TicketType[];
  customFields?: CustomField[];
  samplePoster?: string | null;
  socialMediaGraphic?: string | null;
  eventFormat?: string | null;
  requestedVenue?: string | null;
  termsConditions?: string | null;
  rulesRegulations?: string | null;
  policies?: string | null;
  dutyLeavesDetails?: string | null;
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

// GET /event/public?cursor=&limit=&latitude=&longitude=&includeGlobal=
export const fetchPublicEvents = createAsyncThunk<
  {
    events: EventSummary[];
    nextCursor: string | null;
    hasNextPage: boolean;
    limit: number;
  },
  {
    cursor?: string;
    limit?: number;
    latitude?: number;
    longitude?: number;
    includeGlobal?: boolean;
    append?: boolean;
  },
  { rejectValue: string }
>(
  "events/fetchPublic",
  async (
    { cursor, limit = 10, latitude, longitude, includeGlobal = true },
    { rejectWithValue },
  ) => {
    try {
      const params = new URLSearchParams();
      if (cursor) params.append("cursor", cursor);
      params.append("limit", limit.toString());

      // Add latitude and longitude if provided
      if (latitude !== undefined && longitude !== undefined) {
        params.append("latitude", latitude.toString());
        params.append("longitude", longitude.toString());
      }

      // Add includeGlobal parameter
      params.append("includeGlobal", includeGlobal.toString());

      console.log("Fetching events with params:", params.toString());

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
  // Basic Info
  title: string;
  description: string;

  // Banners
  banner_horizontal: string;
  banner_vertical: string;
  banner_square: string;

  // Date & Time
  date: string;
  time: string;

  // Location
  location: string;
  latitude?: number | null;
  longitude?: number | null;

  // Additional Info
  capacity?: number;
  tags?: string[];
  chips?: string[];
  restrictions?: string;

  // Ticket Types
  ticketTypes: {
    name: string;
    description?: string;
    price: number;
    discountedPrice?: number;
    discountReason?: string;
    quantity: number;
    salesCutoff?: string; // ISO 8601 format
  }[];

  // Custom Fields - FIXED to include options
  customFields?: {
    label: string;
    fieldType: string;
    required: boolean;
    options?: string; // Comma-separated values for dropdown
  }[];

  // Optional Fields
  samplePoster?: string;
  socialMediaGraphic?: string;
  eventFormat?: string;
  requestedVenue?: string;
  termsConditions?: string;
  rulesRegulations?: string;
  policies?: string;
  dutyLeavesDetails?: string;
};

export const createEvent = createAsyncThunk<
  EventDetails,
  CreateEventRequest,
  { rejectValue: string }
>("events/createEvent", async (payload, { rejectWithValue }) => {
  try {
    // Validate payload before sending
    if (!payload.title?.trim()) {
      return rejectWithValue("Event title is required");
    }
    if (!payload.description?.trim()) {
      return rejectWithValue("Event description is required");
    }
    if (
      !payload.banner_horizontal ||
      !payload.banner_vertical ||
      !payload.banner_square
    ) {
      return rejectWithValue("All three banners are required");
    }
    if (!payload.date || !payload.time) {
      return rejectWithValue("Event date and time are required");
    }
    if (!payload.location?.trim()) {
      return rejectWithValue("Event location is required");
    }
    if (!payload.ticketTypes || payload.ticketTypes.length === 0) {
      return rejectWithValue("At least one ticket type is required");
    }

    // Validate ticket types
    for (const ticket of payload.ticketTypes) {
      if (!ticket.name?.trim()) {
        return rejectWithValue("All ticket types must have a name");
      }
      if (ticket.price < 0) {
        return rejectWithValue("Ticket price cannot be negative");
      }
      if (ticket.quantity <= 0) {
        return rejectWithValue("Ticket quantity must be greater than 0");
      }
      if (
        ticket.discountedPrice !== undefined &&
        ticket.discountedPrice >= ticket.price
      ) {
        return rejectWithValue(
          "Discounted price must be less than original price",
        );
      }
    }

    // Validate custom fields
    if (payload.customFields) {
      for (const field of payload.customFields) {
        if (!field.label?.trim()) {
          return rejectWithValue("All custom fields must have a label");
        }
        if (field.fieldType === "dropdown" && !field.options?.trim()) {
          return rejectWithValue("Dropdown fields must have options");
        }
      }
    }

    console.log(
      "Creating event with payload:",
      JSON.stringify(payload, null, 2),
    );

    const res = await api.post("/event", payload);

    if (!res.data?.data) {
      return rejectWithValue("Invalid response from server");
    }

    return res.data.data;
  } catch (err: any) {
    console.error("Create event error:", err);

    // Handle different error types
    if (err.response?.status === 401) {
      return rejectWithValue("You must be logged in to create events");
    }
    if (err.response?.status === 403) {
      return rejectWithValue("You don't have permission to create events");
    }
    if (err.response?.status === 400) {
      return rejectWithValue(
        err.response?.data?.message || "Invalid event data",
      );
    }
    if (err.response?.status === 413) {
      return rejectWithValue("Image files are too large");
    }

    return rejectWithValue(
      err?.response?.data?.message ||
        "Failed to create event. Please try again.",
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
    clearCreateError: (state) => {
      state.create.error = null;
    },
    clearCreateState: (state) => {
      state.create = initialState.create;
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

      if (a.payload.eventId) {
        s.list.items.unshift(a.payload);

        s.details.byId[a.payload.eventId] = a.payload;
      }
    });
    b.addCase(createEvent.rejected, (s, a) => {
      s.create.loading = false;
      s.create.error = a.payload || "Failed to create event";
    });
  },
});

export const { resetEventsList, clearCreateError, clearCreateState } =
  eventsSlice.actions;
export default eventsSlice.reducer;
