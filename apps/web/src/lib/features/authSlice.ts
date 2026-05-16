// src/lib/features/authSlice.ts
import api, { apiUtils } from "@/lib/api";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

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
  hydrated: boolean;
};

const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  otpSent: false,
  hydrated: false,
};

// 🔹 Request OTP (works for email OR phone). Sends { identifier } to backend.
export const requestOtp = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>("auth/requestOtp", async (identifier, { rejectWithValue }) => {
  try {
    await api.post("/auth/otp/request", { identifier });
  } catch (err: any) {
    const msg = err?.response?.data?.message || "Failed to send OTP";
    return rejectWithValue(msg);
  }
});

// 🔹 Verify OTP (works for email OR phone). Sends { identifier, otp } to backend.
// inside src/lib/features/authSlice.ts
export const verifyOtp = createAsyncThunk<
  { token: string; user: User },
  {
    identifier: string;
    otp: string;
    name?: string;
    email?: string;
    phone?: string;
  },
  { rejectValue: string }
>("auth/verifyOtp", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post("/auth/otp/verify", {
      identifier: payload.identifier,
      otp: payload.otp,
    });

    const token = res?.data?.data?.token;
    if (!token) throw new Error("Token missing in response");

    // persist token local
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }

    // fetch profile
    const profRes = await api.get("/user/profile");
    let user: User = profRes?.data?.data;

    // decide what we need to patch
    const needName = !user?.name && payload.name;
    const needEmail = !user?.email && payload.email;
    const needPhone = !user?.phone && payload.phone;

    // Try patching name/email first (treat as important)
    if (needName || needEmail) {
      const patchRes = await api.patch("/user/profile", {
        ...(needName ? { name: payload.name } : {}),
        ...(needEmail ? { email: payload.email } : {}),
      });
      user = patchRes?.data?.data;
    }

    // Try patching phone separately — if this fails, swallow the error
    // so OTP verification doesn't fail; log the problem for diagnostics.
    if (needPhone) {
      try {
        const patchPhoneRes = await api.patch("/user/profile", {
          phone: payload.phone,
        });
        user = patchPhoneRes?.data?.data;
      } catch (phoneErr: any) {
        // don't reject the entire flow because of phone patch failure
        /* eslint-disable no-console */
        console.warn(
          "Non-fatal: failed to patch phone during verifyOtp. Continuing without phone. error:",
          phoneErr?.response?.data || phoneErr?.message || phoneErr,
        );
      }
    }

    return { token, user };
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || err?.message || "Failed to verify OTP";
    return rejectWithValue(msg);
  }
});

// 🔹 Hydrate session on page load — reads token from localStorage and fetches profile
export const hydrateSession = createAsyncThunk<
  { token: string; user: User } | null,
  void,
  { rejectValue: string }
>("auth/hydrateSession", async (_, { rejectWithValue }) => {
  try {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("token");
    if (!token) return null;

    // attempt to fetch profile (your api instance should pick token from localStorage or an interceptor)
    const res = await api.get("/user/profile");
    const user: User = res?.data?.data;
    return { token, user };
  } catch (err: any) {
    // clear token on failure
    apiUtils.clearToken();
    return rejectWithValue("Session expired. Please log in again.");
  }
});

export const logoutAsync = createAsyncThunk<void, void>(
  "auth/logout",
  async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // best-effort — always clear client-side regardless
    } finally {
      apiUtils.clearToken();
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.otpSent = false;
      state.hydrated = true;
      apiUtils.clearToken();
    },
    // optional lightweight sync hydrate action (not required if you use hydrateSession)
    hydrateSync(state) {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) state.token = token;
      }
      state.hydrated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // requestOtp
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

      // verifyOtp
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.otpSent = false;
        state.hydrated = true;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to verify OTP";
      })

      // hydrateSession
      .addCase(hydrateSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(hydrateSession.fulfilled, (state, action) => {
        state.loading = false;
        state.hydrated = true;
        if (action.payload) {
          state.token = action.payload.token;
          state.user = action.payload.user;
        }
      })
      .addCase(hydrateSession.rejected, (state, action) => {
        state.loading = false;
        state.hydrated = true;
        state.error = action.payload || null;
      })

      // logoutAsync
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.otpSent = false;
        state.hydrated = true;
      })
      .addCase(logoutAsync.rejected, (state) => {
        // still clear client state even if server call failed
        state.user = null;
        state.token = null;
        state.otpSent = false;
        state.hydrated = true;
      });
  },
});

export const { logout, hydrateSync } = authSlice.actions;
export default authSlice.reducer;
