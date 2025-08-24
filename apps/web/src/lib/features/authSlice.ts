import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";

type User = {
  userId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  otpSent: boolean;
};

const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  otpSent: false,
};

export const requestOtp = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>("auth/requestOtp", async (phone, { rejectWithValue }) => {
  try {
    await api.post("/auth/otp/request", { phone });
  } catch (err: any) {
    const msg = err?.response?.data?.message || "Failed to send OTP";
    return rejectWithValue(msg);
  }
});

export const verifyOtp = createAsyncThunk<
  { token: string; user: User },
  { phone: string; otp: string; name?: string; email?: string },
  { rejectValue: string }
>("auth/verifyOtp", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post("/auth/otp/verify", {
      phone: payload.phone,
      otp: payload.otp,
    });
    const token = res?.data?.data?.token;
    if (!token) throw new Error("Token missing in response");

    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }

    const profRes = await api.get("/user/profile");
    let user: User = profRes?.data?.data;

    const needName = !user?.name && payload.name;
    const needEmail = !user?.email && payload.email;
    if (needName || needEmail) {
      const patchRes = await api.patch("/user/profile", {
        name: needName ? payload.name : undefined,
        email: needEmail ? payload.email : undefined,
      });
      user = patchRes?.data?.data;
    }

    return { token, user };
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || err?.message || "Failed to verify OTP";
    return rejectWithValue(msg);
  }
});

export const hydrateSession = createAsyncThunk<
  { token: string; user: User } | null,
  void,
  { rejectValue: string }
>("auth/hydrateSession", async (_, { rejectWithValue }) => {
  try {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("token");
    if (!token) return null;

    const res = await api.get("/user/profile");
    const user: User = res?.data?.data;
    return { token, user };
  } catch (err: any) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    return rejectWithValue("Session expired. Please log in again.");
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.otpSent = false;
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestOtp.fulfilled, (state) => {
        state.loading = false;
        state.otpSent = true;
      })
      .addCase(requestOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to send OTP";
      })
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.otpSent = false;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to verify OTP";
      })
      .addCase(hydrateSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(hydrateSession.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.token = action.payload.token;
          state.user = action.payload.user;
        }
      })
      .addCase(hydrateSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || null;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
