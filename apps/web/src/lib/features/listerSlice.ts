import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";

// Types
interface User {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  profileComplete: boolean;
  createdAt: string;
}

interface ListerAnalytics {
  totalEvents: number;
  totalRevenue: number;
  totalTicketsSold: number;
  lastUpdated: string;
}

interface Event {
  eventId: string;
  title: string;
  date: string;
  banner_horizontal?: string;
  banner_vertical?: string;
  banner_square?: string;
  status: string;
  ticketsSold: number;
  revenue: number;
}

interface Lister {
  listerId: string;
  userId?: string;
  companyName: string;
  companyLogo?: string;
  bio: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  user?: User;
  ListerAnalytics?: ListerAnalytics;
  Event?: Event[];
}

interface ListerState {
  currentLister: Lister | null;
  analytics: ListerAnalytics | null;
  listerProfile: Lister | null;
  loading: boolean;
  error: string | null;
  applyLoading: boolean;
  updateLoading: boolean;
}

const initialState: ListerState = {
  currentLister: null,
  analytics: null,
  listerProfile: null,
  loading: false,
  error: null,
  applyLoading: false,
  updateLoading: false,
};

// Async Thunks
export const applyForLister = createAsyncThunk<
  Lister,
  { companyName: string; companyLogo?: string; bio: string }
>("lister/apply", async (data, { rejectWithValue }) => {
  try {
    const response = await api.post("/lister/apply", data);
    return response.data.data;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Failed to apply for lister",
    );
  }
});

export const fetchMyLister = createAsyncThunk<Lister, void>(
  "lister/fetchMe",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/lister/me");
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch lister data",
      );
    }
  },
);

export const updateLister = createAsyncThunk<
  Lister,
  { companyName?: string; companyLogo?: string; bio?: string }
>("lister/update", async (data, { rejectWithValue }) => {
  try {
    const response = await api.patch("/lister/me", data);
    return response.data.data;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Failed to update lister",
    );
  }
});

export const fetchListerById = createAsyncThunk<Lister, string>(
  "lister/fetchById",
  async (listerId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/lister/${listerId}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch lister",
      );
    }
  },
);

export const fetchListerAnalytics = createAsyncThunk<ListerAnalytics, void>(
  "lister/fetchAnalytics",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/lister/analytics/me");
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch analytics",
      );
    }
  },
);

// Slice
const listerSlice = createSlice({
  name: "lister",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearListerProfile: (state) => {
      state.listerProfile = null;
    },
    resetListerState: (state) => {
      state.currentLister = null;
      state.analytics = null;
      state.listerProfile = null;
      state.loading = false;
      state.error = null;
      state.applyLoading = false;
      state.updateLoading = false;
    },
  },
  extraReducers: (builder) => {
    // Apply for Lister
    builder
      .addCase(applyForLister.pending, (state) => {
        state.applyLoading = true;
        state.error = null;
      })
      .addCase(
        applyForLister.fulfilled,
        (state, action: PayloadAction<Lister>) => {
          state.applyLoading = false;
          state.currentLister = action.payload;
        },
      )
      .addCase(applyForLister.rejected, (state, action) => {
        state.applyLoading = false;
        state.error = action.payload as string;
      });

    // Fetch My Lister
    builder
      .addCase(fetchMyLister.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchMyLister.fulfilled,
        (state, action: PayloadAction<Lister>) => {
          state.loading = false;
          state.currentLister = action.payload;
        },
      )
      .addCase(fetchMyLister.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Lister
    builder
      .addCase(updateLister.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(
        updateLister.fulfilled,
        (state, action: PayloadAction<Lister>) => {
          state.updateLoading = false;
          state.currentLister = action.payload;
        },
      )
      .addCase(updateLister.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Lister by ID
    builder
      .addCase(fetchListerById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchListerById.fulfilled,
        (state, action: PayloadAction<Lister>) => {
          state.loading = false;
          state.listerProfile = action.payload;
        },
      )
      .addCase(fetchListerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Analytics
    builder
      .addCase(fetchListerAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchListerAnalytics.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.analytics = action.payload;
        },
      )
      .addCase(fetchListerAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearListerProfile, resetListerState } =
  listerSlice.actions;
export default listerSlice.reducer;
