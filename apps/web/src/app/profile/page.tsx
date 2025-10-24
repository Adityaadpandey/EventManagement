"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { hydrateSession, logout } from "@/lib/features/authSlice";

type ProfileResp = {
  userId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: "USER" | "LISTER" | "ADMIN" | "SUPER_ADMIN";
  avatar?: string | null;
};

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || "";

// Base list — we will also allow adding the runtime country code if missing
const BASE_COUNTRY_CODES = [
  { code: "+1", flag: "🇺🇸" },
  { code: "+44", flag: "🇬🇧" },
  { code: "+91", flag: "🇮🇳" },
  { code: "+86", flag: "🇨🇳" },
  { code: "+81", flag: "🇯🇵" },
  { code: "+49", flag: "🇩🇪" },
  { code: "+33", flag: "🇫🇷" },
  { code: "+39", flag: "🇮🇹" },
  { code: "+61", flag: "🇦🇺" },
  { code: "+7", flag: "🇷🇺" },
  { code: "+82", flag: "🇰🇷" },
  { code: "+34", flag: "🇪🇸" },
  { code: "+52", flag: "🇲🇽" },
  { code: "+55", flag: "🇧🇷" },
  { code: "+27", flag: "🇿🇦" },
  { code: "+20", flag: "🇪🇬" },
  { code: "+234", flag: "🇳🇬" },
  { code: "+971", flag: "🇦🇪" },
  { code: "+966", flag: "🇸🇦" },
  { code: "+65", flag: "🇸🇬" },
  { code: "+60", flag: "🇲🇾" },
  { code: "+66", flag: "🇹🇭" },
  { code: "+84", flag: "🇻🇳" },
  { code: "+62", flag: "🇮🇩" },
  { code: "+63", flag: "🇵🇭" },
  { code: "+92", flag: "🇵🇰" },
  { code: "+880", flag: "🇧🇩" },
];

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const {
    user,
    token,
    hydrated,
    loading: authLoading,
  } = useAppSelector((s) => s.auth);

  const [initLoading, setInitLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    avatar: "",
    phone: "",
    role: "",
  });

  const [countryCodes, setCountryCodes] = useState(BASE_COUNTRY_CODES);
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isAuthed = useMemo(() => {
    if (token) return true;
    if (typeof window !== "undefined") return !!localStorage.getItem("token");
    return false;
  }, [token]);

  // Helper: normalize phone string and split into country + local
  const splitPhone = (raw?: string | null) => {
    if (!raw) return { code: "+91", local: "" };

    // Remove spaces, dashes, parentheses
    let p = raw.replace(/[\s()-]/g, "");

    // Known codes for reliable detection
    const KNOWN_CODES = [
      "+1",
      "+44",
      "+91",
      "+86",
      "+81",
      "+49",
      "+33",
      "+39",
      "+61",
      "+7",
      "+82",
      "+34",
      "+52",
      "+55",
      "+27",
      "+20",
      "+234",
      "+971",
      "+966",
      "+65",
      "+60",
      "+66",
      "+84",
      "+62",
      "+63",
      "+92",
      "+880",
    ];

    // ✅ Find a matching known code at the start of the string
    const match = KNOWN_CODES.find((code) => p.startsWith(code));
    if (match) {
      return { code: match, local: p.slice(match.length) };
    }

    // If it starts with "+", fallback: capture up to 3 digits only
    const plusMatch = p.match(/^(\+\d{1,3})(\d+)$/);
    if (plusMatch) {
      return { code: plusMatch[1], local: plusMatch[2] };
    }

    // Some systems store without "+", e.g. "918926913050"
    const digitsOnly = p.replace(/\D/g, "");
    if (/^\d{8,15}$/.test(digitsOnly)) {
      if (digitsOnly.length > 10) {
        const local = digitsOnly.slice(-10);
        const code = "+" + digitsOnly.slice(0, -10);
        return { code, local };
      } else {
        return { code: "+91", local: digitsOnly };
      }
    }

    return { code: "+91", local: "" };
  };

  // Prefill function used both for immediate Redux user and after API fetch
  const prefillFromProfile = (p?: ProfileResp | null) => {
    if (!p) return;
    const { code, local } = splitPhone(p.phone ?? null);

    // ensure the country code exists in the select options — if not, add it
    if (!countryCodes.find((c) => c.code === code)) {
      setCountryCodes((prev) => [{ code, flag: "🌐" }, ...prev]);
    }

    setCountryCode(code);
    // limit local to 15 digits (safe) and to 10 for UI display if you'd like
    setPhoneNumber(local ? local.slice(0, 15) : "");
    setForm({
      name: p.name ?? "",
      email: p.email ?? "",
      avatar: p.avatar ?? "",
      phone: p.phone ?? "",
      role: p.role ?? "USER",
    });
  };

  // On mount: immediately prefill from redux user (fast), then call API to refresh
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!hydrated) {
          await dispatch(hydrateSession())
            .unwrap()
            .catch(() => {});
        }

        // immediate prefill from redux user to avoid empty UI
        if (!cancelled && user) {
          prefillFromProfile(user as ProfileResp);
        }

        // fetch freshest profile from backend
        const res = await api.get("/user/profile");
        const p: ProfileResp | undefined = res?.data?.data;
        if (!cancelled && p) {
          prefillFromProfile(p);
        }
      } catch (err) {
        // if API fails, we already prefilled from redux user — keep that
        // (no-op)
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, hydrated]); // we intentionally do NOT put `user` here to avoid double-overwrites; we prefill from user once inside

  // Avatar upload (keeps your original UX but uses fetch and proper errors)
  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setSaveError("Cloudinary not configured properly");
      return;
    }
    setUploadingAvatar(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);

      const resp = await fetch(url, { method: "POST", body: fd });
      const data = await resp.json();
      if (!data?.secure_url) throw new Error("Upload failed");
      setForm((f) => ({ ...f, avatar: data.secure_url }));
      setSaveSuccess("Avatar uploaded");
    } catch (err: any) {
      setSaveError(err?.message || "Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onFileChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    // show preview while uploading
    const preview = URL.createObjectURL(f);
    setForm((s) => ({ ...s, avatar: preview }));
    uploadAvatar(f);
    ev.currentTarget.value = "";
  };

  const triggerFile = () => fileRef.current?.click();

  const onChange =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((s) => ({ ...s, [key]: e.target.value }));
      setSaveError(null);
      setSaveSuccess(null);
    };

  // allow only digits in local number (limit reasonable length)
  const onPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 15);
    setPhoneNumber(value);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const onCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCountryCode(e.target.value);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const onSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      if (!form.name.trim()) throw new Error("Name is required");

      const payload: Record<string, any> = {};
      payload.name = form.name.trim();
      if (form.email?.trim()) payload.email = form.email.trim();
      if (form.avatar?.trim()) payload.avatar = form.avatar.trim();

      // Combine country code and phone number if present
      if (phoneNumber.trim()) {
        const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, "")}`;
        if (fullPhone.length > 20) {
          throw new Error("Phone number is too long");
        }
        payload.phone = fullPhone;
      }

      await api.patch("/user/profile", payload);
      // update redux session if you rely on hydrateSession
      await dispatch(hydrateSession())
        .unwrap()
        .catch(() => {});
      setSaveSuccess("Profile updated successfully!");
    } catch (err: any) {
      setSaveError(err?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const onLogout = () => {
    dispatch(logout());
    router.push("/");
  };

  if (initLoading || authLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFC] p-6">
        <div className="text-zinc-600">Loading profile…</div>
      </div>
    );

  if (!isAuthed) return router.push("/auth");

  return (
    <div className="bg-[#FBFBFC] p-6 pb-32 min-h-screen overflow-y-auto">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-md overflow-hidden mb-6">
          <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="relative w-28 h-28 md:w-32 md:h-32 flex-shrink-0 rounded-full overflow-hidden border border-zinc-200 group">
                {form.avatar ? (
                  // preview or actual avatar
                  <img
                    src={form.avatar}
                    alt={form.name || "Avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-500 text-2xl font-semibold">
                    {form.name ? form.name[0] : "U"}
                  </div>
                )}

                <label className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFileChange}
                  />
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 5v14M5 12h14"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </label>

                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white text-sm font-medium">
                    Uploading…
                  </div>
                )}
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={triggerFile}
                  className="px-4 py-2 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50"
                >
                  {form.avatar
                    ? "Change Profile Picture"
                    : "Add Profile Picture"}
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-semibold">
                {form.name || "Unnamed"}
              </h1>
              <p className="text-zinc-500 mt-1">{form.email || "No email"}</p>
              <div className="mt-3">
                <span className="px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-sm">
                  {form.role || "USER"}
                </span>
              </div>
            </div>

            <div className="flex-shrink-0 flex gap-2">
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 rounded-full border border-zinc-200 hover:bg-zinc-50"
              >
                Home
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2 rounded-full bg-[#FFE348] border-b-2 border-[#FFDA0A] hover:brightness-95"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-medium mb-3">Personal Info</h2>
          <form onSubmit={onSave} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-600 mb-1">
                Full name
              </label>
              <input
                value={form.name}
                onChange={onChange("name")}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl bg-zinc-50"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-600 mb-1">Email</label>
              <input
                value={form.email}
                onChange={onChange("email")}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl bg-zinc-50"
                placeholder="you@example.com"
                type="email"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-600 mb-1">Phone</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={onCountryCodeChange}
                  className="sm:px-2 py-3 border border-zinc-200 rounded-xl bg-zinc-50 cursor-pointer sm:w-auto"
                >
                  {countryCodes.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>

                <input
                  value={phoneNumber}
                  onChange={onPhoneChange}
                  className="flex-1 px-4 py-3 border border-zinc-200 rounded-xl bg-zinc-50 w-full"
                  placeholder="87xxxx0933"
                  type="tel"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-full bg-[#FFE348] border-b-2 border-[#FFDA0A] font-medium"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>

              <button
                type="button"
                onClick={() => {
                  // reset to latest form values stored in state (re-fetch)
                  setInitLoading(true);
                  // re-run the fetch flow quickly
                  (async () => {
                    try {
                      const res = await api.get("/user/profile");
                      const p: ProfileResp | undefined = res?.data?.data;
                      if (p) prefillFromProfile(p);
                      else if (user) prefillFromProfile(user as ProfileResp);
                    } catch {
                      if (user) prefillFromProfile(user as ProfileResp);
                    } finally {
                      setInitLoading(false);
                      setSaveError(null);
                      setSaveSuccess(null);
                    }
                  })();
                }}
                className="px-4 py-3 rounded-full border border-zinc-200 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>

            {(saveError || saveSuccess) && (
              <div className="mt-2">
                {saveError && (
                  <div className="text-sm text-red-600">{saveError}</div>
                )}
                {saveSuccess && (
                  <div className="text-sm text-green-600">{saveSuccess}</div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
