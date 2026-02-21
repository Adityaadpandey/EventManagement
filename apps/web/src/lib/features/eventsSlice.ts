import api from "@/lib/api";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

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
  status?: string;
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
  CustomField?: CustomField[];
};

export type EventAnalytics = {
  views: number;
  ticketsSold: number;
  revenue: number;
  conversionRate: number;
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

type ListerState = {
  items: EventSummary[];
  loading: boolean;
  error: string | null;
};

type UpdateState = {
  loading: boolean;
  error: string | null;
  updatingEventId: string | null;
};

type AnalyticsState = {
  byEventId: Record<string, EventAnalytics>;
  loadingEventId: string | null;
  error: string | null;
};

type NotificationState = {
  loading: boolean;
  error: string | null;
  lastSent: { eventId: string; timestamp: string } | null;
};

type EventsState = {
  list: ListState;
  details: DetailsState;
  create: CreateState;
  lister: ListerState;
  update: UpdateState;
  analytics: AnalyticsState;
  notification: NotificationState;
};

// =====================================================================
// INITIAL STATE
// =====================================================================

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
  lister: {
    items: [],
    loading: false,
    error: null,
  },
  update: {
    loading: false,
    error: null,
    updatingEventId: null,
  },
  analytics: {
    byEventId: {},
    loadingEventId: null,
    error: null,
  },
  notification: {
    loading: false,
    error: null,
    lastSent: null,
  },
};

// =====================================================================
// THUNKS - PUBLIC EVENTS
// =====================================================================

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

      if (latitude !== undefined && longitude !== undefined) {
        params.append("latitude", latitude.toString());
        params.append("longitude", longitude.toString());
      }

      params.append("includeGlobal", includeGlobal.toString());

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

// =====================================================================
// THUNKS - LISTER OPERATIONS
// =====================================================================

export const fetchListerEvents = createAsyncThunk<
  EventSummary[],
  void,
  { rejectValue: string }
>("events/fetchListerEvents", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/event/lister");
    return res.data?.data ?? [];
  } catch (err: any) {
    return rejectWithValue(
      err?.response?.data?.message || "Failed to fetch your events",
    );
  }
});

export const fetchListerEventDetails = createAsyncThunk<
  { eventId: string; details: EventDetails },
  { eventId: string },
  { rejectValue: string }
>("events/fetchListerDetails", async ({ eventId }, { rejectWithValue }) => {
  try {
    const res = await api.get(`/event/${eventId}/lister`);
    return { eventId, details: res.data?.data };
  } catch (err: any) {
    return rejectWithValue(
      err?.response?.data?.message || "Failed to fetch event details",
    );
  }
});

// =====================================================================
// THUNKS - CREATE EVENT
// =====================================================================

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
    salesCutoff?: string;
  }[];

  // Custom Fields
  customFields?: {
    label: string;
    fieldType: string;
    required: boolean;
    options?: string;
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
    // Validation
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

    const res = await api.post("/event", payload);

    if (!res.data?.data) {
      return rejectWithValue("Invalid response from server");
    }

    return res.data.data;
  } catch (err: any) {
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

// =====================================================================
// THUNKS - UPDATE EVENT
// =====================================================================

export type UpdateEventRequest = Partial<CreateEventRequest>;

export const updateEvent = createAsyncThunk<
  EventDetails,
  { eventId: string; updates: UpdateEventRequest },
  { rejectValue: string }
>("events/updateEvent", async ({ eventId, updates }, { rejectWithValue }) => {
  try {
    // Validate ticket types if provided
    if (updates.ticketTypes) {
      for (const ticket of updates.ticketTypes) {
        if (ticket.name && !ticket.name.trim()) {
          return rejectWithValue("Ticket type name cannot be empty");
        }
        if (ticket.price !== undefined && ticket.price < 0) {
          return rejectWithValue("Ticket price cannot be negative");
        }
        if (ticket.quantity !== undefined && ticket.quantity <= 0) {
          return rejectWithValue("Ticket quantity must be greater than 0");
        }
      }
    }

    // Validate custom fields if provided
    if (updates.customFields) {
      for (const field of updates.customFields) {
        if (!field.label?.trim()) {
          return rejectWithValue("Custom field label cannot be empty");
        }
        if (field.fieldType === "dropdown" && !field.options?.trim()) {
          return rejectWithValue("Dropdown fields must have options");
        }
      }
    }

    const res = await api.patch(`/event/${eventId}`, updates);

    if (!res.data?.data) {
      return rejectWithValue("Invalid response from server");
    }

    return res.data.data;
  } catch (err: any) {
    if (err.response?.status === 401) {
      return rejectWithValue("You must be logged in to update events");
    }
    if (err.response?.status === 403) {
      return rejectWithValue("You don't have permission to update this event");
    }
    if (err.response?.status === 404) {
      return rejectWithValue("Event not found");
    }
    if (err.response?.status === 400) {
      return rejectWithValue(
        err.response?.data?.message || "Invalid update data",
      );
    }

    return rejectWithValue(
      err?.response?.data?.message ||
        "Failed to update event. Please try again.",
    );
  }
});

// =====================================================================
// THUNKS - ANALYTICS
// =====================================================================

export const fetchEventAnalytics = createAsyncThunk<
  { eventId: string; analytics: EventAnalytics },
  { eventId: string },
  { rejectValue: string }
>("events/fetchAnalytics", async ({ eventId }, { rejectWithValue }) => {
  try {
    const res = await api.get(`/event/${eventId}/analytics`);
    return { eventId, analytics: res.data?.data };
  } catch (err: any) {
    if (err.response?.status === 403) {
      return rejectWithValue(
        "You don't have permission to view this event's analytics",
      );
    }
    if (err.response?.status === 404) {
      return rejectWithValue("Event not found");
    }
    return rejectWithValue(
      err?.response?.data?.message || "Failed to fetch analytics",
    );
  }
});

// =====================================================================
// THUNKS - NOTIFICATIONS
// =====================================================================

export const sendEventUpdate = createAsyncThunk<
  { success: boolean; message: string; eventId: string },
  { eventId: string; update: string },
  { rejectValue: string }
>("events/sendUpdate", async ({ eventId, update }, { rejectWithValue }) => {
  try {
    if (!update?.trim()) {
      return rejectWithValue("Update message cannot be empty");
    }

    const res = await api.post(`/event/info-update/${eventId}`, { update });

    return {
      success: res.data?.success ?? true,
      message: res.data?.message ?? "Update sent successfully",
      eventId,
    };
  } catch (err: any) {
    if (err.response?.status === 403) {
      return rejectWithValue(
        "You don't have permission to send updates for this event",
      );
    }
    if (err.response?.status === 404) {
      return rejectWithValue("Event not found");
    }
    return rejectWithValue(
      err?.response?.data?.message || "Failed to send update",
    );
  }
});

// =====================================================================
// SLICE
// =====================================================================

const eventsSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    // List management
    resetEventsList: (state) => {
      state.list = initialState.list;
    },

    // Create management
    clearCreateError: (state) => {
      state.create.error = null;
    },
    clearCreateState: (state) => {
      state.create = initialState.create;
    },

    // Update management
    clearUpdateError: (state) => {
      state.update.error = null;
    },
    clearUpdateState: (state) => {
      state.update = initialState.update;
    },

    // Details management
    clearDetailsError: (state) => {
      state.details.error = null;
    },
    removeEventFromCache: (state, action: PayloadAction<string>) => {
      delete state.details.byId[action.payload];
    },

    // Lister management
    clearListerError: (state) => {
      state.lister.error = null;
    },
    clearListerEvents: (state) => {
      state.lister = initialState.lister;
    },

    // Analytics management
    clearAnalyticsError: (state) => {
      state.analytics.error = null;
    },
    removeAnalyticsFromCache: (state, action: PayloadAction<string>) => {
      delete state.analytics.byEventId[action.payload];
    },

    // Notification management
    clearNotificationError: (state) => {
      state.notification.error = null;
    },
    clearNotificationState: (state) => {
      state.notification = initialState.notification;
    },

    // Global reset
    resetAllEventsState: () => initialState,
  },
  extraReducers: (builder) => {
    // ================================================================
    // PUBLIC EVENTS LIST
    // ================================================================
    builder
      .addCase(fetchPublicEvents.pending, (state, action) => {
        if (action.meta.arg.append) {
          state.list.loadingMore = true;
        } else {
          state.list.loading = true;
        }
        state.list.error = null;
      })
      .addCase(fetchPublicEvents.fulfilled, (state, action) => {
        state.list.loading = false;
        state.list.loadingMore = false;

        if (action.meta.arg.append) {
          state.list.items = [...state.list.items, ...action.payload.events];
        } else {
          state.list.items = action.payload.events;
        }

        state.list.nextCursor = action.payload.nextCursor;
        state.list.hasNextPage = action.payload.hasNextPage;
        state.list.limit = action.payload.limit;
      })
      .addCase(fetchPublicEvents.rejected, (state, action) => {
        state.list.loading = false;
        state.list.loadingMore = false;
        state.list.error = action.payload || "Failed to fetch events";
      });

    // ================================================================
    // PUBLIC EVENT DETAILS
    // ================================================================
    builder
      .addCase(fetchEventDetails.pending, (state, action) => {
        state.details.loadingId = action.meta.arg.eventId;
        state.details.error = null;
      })
      .addCase(fetchEventDetails.fulfilled, (state, action) => {
        state.details.loadingId = null;
        state.details.byId[action.payload.eventId] = action.payload.details;
      })
      .addCase(fetchEventDetails.rejected, (state, action) => {
        state.details.loadingId = null;
        state.details.error = action.payload || "Failed to fetch event details";
      });

    // ================================================================
    // LISTER EVENTS
    // ================================================================
    builder
      .addCase(fetchListerEvents.pending, (state) => {
        state.lister.loading = true;
        state.lister.error = null;
      })
      .addCase(fetchListerEvents.fulfilled, (state, action) => {
        state.lister.loading = false;
        state.lister.items = action.payload;
      })
      .addCase(fetchListerEvents.rejected, (state, action) => {
        state.lister.loading = false;
        state.lister.error = action.payload || "Failed to fetch your events";
      });

    // ================================================================
    // LISTER EVENT DETAILS
    // ================================================================
    builder
      .addCase(fetchListerEventDetails.pending, (state, action) => {
        state.details.loadingId = action.meta.arg.eventId;
        state.details.error = null;
      })
      .addCase(fetchListerEventDetails.fulfilled, (state, action) => {
        state.details.loadingId = null;
        state.details.byId[action.payload.eventId] = action.payload.details;
      })
      .addCase(fetchListerEventDetails.rejected, (state, action) => {
        state.details.loadingId = null;
        state.details.error = action.payload || "Failed to fetch event details";
      });

    // ================================================================
    // CREATE EVENT
    // ================================================================
    builder
      .addCase(createEvent.pending, (state) => {
        state.create.loading = true;
        state.create.error = null;
        state.create.lastCreated = null;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.create.loading = false;
        state.create.lastCreated = action.payload;

        // Add to lister events
        if (action.payload.eventId) {
          state.lister.items.unshift(action.payload);
          state.details.byId[action.payload.eventId] = action.payload;
        }
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.create.loading = false;
        state.create.error = action.payload || "Failed to create event";
      });

    // ================================================================
    // UPDATE EVENT
    // ================================================================
    builder
      .addCase(updateEvent.pending, (state, action) => {
        state.update.loading = true;
        state.update.error = null;
        state.update.updatingEventId = action.meta.arg.eventId;
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        state.update.loading = false;
        state.update.updatingEventId = null;

        const eventId = action.payload.eventId;

        // Update in details cache
        state.details.byId[eventId] = action.payload;

        // Update in lister events
        const listerIndex = state.lister.items.findIndex(
          (e) => e.eventId === eventId,
        );
        if (listerIndex !== -1) {
          state.lister.items[listerIndex] = action.payload;
        }

        // Update in public list if present
        const listIndex = state.list.items.findIndex(
          (e) => e.eventId === eventId,
        );
        if (listIndex !== -1) {
          state.list.items[listIndex] = action.payload;
        }
      })
      .addCase(updateEvent.rejected, (state, action) => {
        state.update.loading = false;
        state.update.updatingEventId = null;
        state.update.error = action.payload || "Failed to update event";
      });

    // ================================================================
    // ANALYTICS
    // ================================================================
    builder
      .addCase(fetchEventAnalytics.pending, (state, action) => {
        state.analytics.loadingEventId = action.meta.arg.eventId;
        state.analytics.error = null;
      })
      .addCase(fetchEventAnalytics.fulfilled, (state, action) => {
        state.analytics.loadingEventId = null;
        state.analytics.byEventId[action.payload.eventId] =
          action.payload.analytics;
      })
      .addCase(fetchEventAnalytics.rejected, (state, action) => {
        state.analytics.loadingEventId = null;
        state.analytics.error = action.payload || "Failed to fetch analytics";
      });

    // ================================================================
    // NOTIFICATIONS
    // ================================================================
    builder
      .addCase(sendEventUpdate.pending, (state) => {
        state.notification.loading = true;
        state.notification.error = null;
      })
      .addCase(sendEventUpdate.fulfilled, (state, action) => {
        state.notification.loading = false;
        state.notification.lastSent = {
          eventId: action.payload.eventId,
          timestamp: new Date().toISOString(),
        };
      })
      .addCase(sendEventUpdate.rejected, (state, action) => {
        state.notification.loading = false;
        state.notification.error = action.payload || "Failed to send update";
      });
  },
});

// =====================================================================
// EXPORTS
// =====================================================================

export const {
  // List
  resetEventsList,

  // Create
  clearCreateError,
  clearCreateState,

  // Update
  clearUpdateError,
  clearUpdateState,

  // Details
  clearDetailsError,
  removeEventFromCache,

  // Lister
  clearListerError,
  clearListerEvents,

  // Analytics
  clearAnalyticsError,
  removeAnalyticsFromCache,

  // Notifications
  clearNotificationError,
  clearNotificationState,

  // Global
  resetAllEventsState,
} = eventsSlice.actions;

export default eventsSlice.reducer;
