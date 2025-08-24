"use client";

import { useEffect, useState } from "react";
import {
  hydrateSession,
  logout,
  requestOtp,
  verifyOtp,
} from "@/lib/features/authSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

export default function Auth() {
  const dispatch = useAppDispatch();
  const { user, token, loading, error, otpSent } = useAppSelector(
    (s) => s.auth,
  );

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    otp: "",
  });

  // Hydrate session on first load
  useEffect(() => {
    dispatch(hydrateSession());
  }, [dispatch]);

  // Prefill when user loads
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        otp: "",
      });
    }
  }, [user]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSendOtp = () => {
    if (!form.phone) return alert("Phone is required");
    dispatch(requestOtp(form.phone));
  };

  const onVerify = () => {
    if (!form.phone || !form.otp) return alert("Phone and OTP are required");
    dispatch(
      verifyOtp({
        phone: form.phone,
        otp: form.otp,
        name: form.name,
        email: form.email,
      }),
    );
  };

  // Logged-in view: prefilled, disabled, logout only
  if (token && user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 space-y-6 border border-indigo-100 transition-all duration-300 hover:shadow-xl">
          <div className="text-center">
            <h1 className="font-bold text-3xl text-indigo-800 mb-2">
              Welcome Back!
            </h1>
            <p className="text-gray-600">
              You're ready to explore exciting events
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Your Name
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 p-3 bg-gray-50 text-gray-800"
                value={form.name}
                disabled
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 p-3 bg-gray-50 text-gray-800"
                value={form.email}
                disabled
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 p-3 bg-gray-50 text-gray-800"
                value={form.phone}
                disabled
              />
            </div>
          </div>

          <button
            className="w-full rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 p-3 text-white font-medium shadow-md hover:from-rose-600 hover:to-rose-700 transition-all duration-300 focus:ring-4 focus:ring-rose-200"
            onClick={() => dispatch(logout())}
            disabled={loading}
          >
            {loading ? "Processing..." : "Sign Out"}
          </button>

          {error ? (
            <p className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // Not logged in view: name, email, phone; OTP after request
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 space-y-6 border border-indigo-100 transition-all duration-300 hover:shadow-xl">
        <div className="text-center">
          <h1 className="font-bold text-3xl text-indigo-800 mb-2">
            Join the Experience
          </h1>
          <p className="text-gray-600">
            Sign in to discover and book amazing events
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              name="name"
              placeholder="Enter your name"
              value={form.name}
              onChange={onChange}
              className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={onChange}
              className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              name="phone"
              placeholder="+91 98XXXXXXXX"
              value={form.phone}
              onChange={onChange}
              className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
            />
          </div>
        </div>

        {!otpSent ? (
          <button
            className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 p-3 text-white font-medium shadow-md hover:from-indigo-600 hover:to-blue-700 transition-all duration-300 focus:ring-4 focus:ring-indigo-200"
            onClick={onSendOtp}
            disabled={loading}
          >
            {loading ? "Sending Code..." : "Get Verification Code"}
          </button>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                name="otp"
                placeholder="Enter the code we sent you"
                value={form.otp}
                onChange={onChange}
                className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
              />
            </div>
            <button
              className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 p-3 text-white font-medium shadow-md hover:from-emerald-600 hover:to-green-700 transition-all duration-300 focus:ring-4 focus:ring-green-200"
              onClick={onVerify}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify & Explore Events"}
            </button>
          </>
        )}

        {error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
