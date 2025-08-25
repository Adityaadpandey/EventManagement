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

  const [form, setForm] = useState({ name: "", email: "", phone: "", otp: "" });
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    dispatch(hydrateSession());
  }, [dispatch]);

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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSendOtp = () => {
    if (!form.phone) return alert("Phone number is required");
    dispatch(requestOtp(form.phone));
    setResendTimer(300);
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

  const InputField = ({
    label,
    name,
    type = "text",
    value,
    disabled = false,
    placeholder,
  }: {
    label: string;
    name: string;
    type?: string;
    value: string;
    disabled?: boolean;
    placeholder?: string;
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-300">{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full rounded-lg border ${
          disabled ? "bg-zinc-800 text-zinc-400" : "bg-zinc-900 text-white"
        } border-zinc-700 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all`}
      />
    </div>
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center text-white px-4">
      <div className="w-full max-w-2xl bg-zinc-900 rounded-xl shadow-xl p-8 border border-zinc-800 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-indigo-400 mb-2">
            {token && user ? "Welcome Back!" : "Join Tixin"}
          </h1>
          <p className="text-sm text-zinc-400">
            {token && user
              ? "You're ready to explore exciting events 🎉"
              : "Sign in to discover and book amazing events"}
          </p>
        </div>

        <div className="space-y-4">
          <InputField
            label="Full Name"
            name="name"
            value={form.name}
            disabled={!!token}
            placeholder="Your name"
          />
          <InputField
            label="Email Address"
            name="email"
            type="email"
            value={form.email}
            disabled={!!token}
            placeholder="you@example.com"
          />
          <InputField
            label="Phone Number"
            name="phone"
            value={form.phone}
            disabled={!!token}
            placeholder="+91 98XXXXXXXX"
          />
        </div>

        {!token ? (
          !otpSent ? (
            <button
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold p-3 transition duration-300 focus:ring-4 focus:ring-indigo-400"
              onClick={onSendOtp}
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Get Verification Code"}
            </button>
          ) : (
            <>
              <InputField
                label="Verification Code"
                name="otp"
                value={form.otp}
                placeholder="Enter OTP"
              />

              <div className="flex gap-3">
                <button
                  className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold p-3 transition duration-300 focus:ring-4 focus:ring-emerald-400"
                  onClick={onVerify}
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </button>

                {otpSent &&
                  (resendTimer > 0 ? (
                    <button
                      className="flex-1 rounded-lg bg-zinc-800 text-zinc-400 font-semibold p-3 cursor-not-allowed"
                      disabled
                    >
                      Resend in {resendTimer}s
                    </button>
                  ) : (
                    <button
                      className="flex-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-semibold p-3 transition duration-300 focus:ring-4 focus:ring-zinc-500"
                      onClick={onSendOtp}
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  ))}
              </div>
            </>
          )
        ) : (
          <button
            className="w-full rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold p-3 transition duration-300 focus:ring-4 focus:ring-rose-400"
            onClick={() => dispatch(logout())}
            disabled={loading}
          >
            {loading ? "Processing..." : "Sign Out"}
          </button>
        )}

        {error && (
          <div className="bg-red-900/40 text-red-400 border border-red-700 rounded p-3 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
