"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { hydrateSession, logout } from "@/lib/features/authSlice";
import api from "@/lib/api";

type ProfileResp = {
  userId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: "USER" | "LISTER" | "ADMIN" | "SUPER_ADMIN";
  avatar?: string | null;
};

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const { user, token, loading: authLoading } = useAppSelector((s) => s.auth);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const localToken =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token && localToken) {
          await dispatch(hydrateSession())
            .unwrap()
            .catch(() => {});
        }

        const res = await api.get("/user/profile");
        const p: ProfileResp = res?.data?.data;
        if (!cancelled && p) {
          setForm({
            name: p.name ?? "",
            email: p.email ?? "",
            avatar: p.avatar ?? "",
            phone: p.phone ?? "",
            role: p.role ?? "",
          });
        }
      } catch {
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, dispatch]);

  const isAuthed = useMemo(() => {
    const hasReduxToken = !!token;
    const hasLocal =
      typeof window !== "undefined" && !!localStorage.getItem("token");
    return hasReduxToken || hasLocal;
  }, [token]);

  const onChange =
    (key: "name" | "email" | "avatar") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const payload: Record<string, string> = {};
      if (form.name.trim()) payload.name = form.name.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.avatar.trim()) payload.avatar = form.avatar.trim();

      await api.patch("/user/profile", payload);

      await dispatch(hydrateSession());
      setSaveSuccess("Profile updated!");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update profile";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const onLogout = () => {
    dispatch(logout());
    router.push("/");
  };

  if (initLoading || authLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-32 w-full bg-gray-200 rounded" />
          <div className="h-10 w-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Login required</h1>
        <p className="opacity-80 mb-4">
          Please log in to view and edit your profile.
        </p>
        <Link
          href="/auth"
          className="inline-block px-4 py-2 rounded border hover:bg-gray-50"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-zinc-800 dark:text-white">
          My Profile
        </h1>
        <button
          onClick={onLogout}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          Logout
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden w-4xl">
        <div className="p-6 md:flex md:gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="w-32 h-32 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-600 shadow-sm">
              {form.avatar ? (
                <img
                  src={form.avatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-sm text-zinc-500">
                  No avatar
                </div>
              )}
            </div>
            <input
              type="url"
              placeholder="Avatar URL"
              value={form.avatar}
              onChange={onChange("avatar")}
              className="w-full md:w-48 text-sm px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Paste a valid image URL (PNG/JPG).
            </p>
          </div>

          <form onSubmit={onSave} className="flex-1 mt-6 md:mt-0 space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={onChange("name")}
                placeholder="Your name"
                className="w-full text-sm px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={onChange("email")}
                placeholder="you@example.com"
                className="w-full text-sm px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                You can update email here. OTP login is tied to phone.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  disabled
                  className="w-full text-sm px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Managed by OTP login
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <input
                  type="text"
                  value={form.role}
                  disabled
                  className="w-full text-sm px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Role is assigned by admins.{" "}
                  {form.role === "USER" && (
                    <>
                      Want to host events?{" "}
                      <Link
                        href="/lister/apply"
                        className="underline underline-offset-2 hover:text-indigo-500"
                      >
                        Apply to be a Lister
                      </Link>
                      .
                    </>
                  )}
                </p>
              </div>
            </div>

            {saveError && (
              <div className="text-sm text-red-600">{saveError}</div>
            )}
            {saveSuccess && (
              <div className="text-sm text-green-600">{saveSuccess}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-md transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="pt-4 flex flex-wrap gap-3 border-t border-zinc-200 dark:border-zinc-700">
        <Link
          href="/"
          className="px-4 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          Back to Home
        </Link>
        {user?.role === "LISTER" && (
          <>
            <Link
              href="/lister/events"
              className="px-4 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              My Events
            </Link>
            <Link
              href="/lister/events/create"
              className="px-4 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Create Event
            </Link>
          </>
        )}
        {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
          <Link
            href="/admin/events/pending"
            className="px-4 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            Admin – Pending Events
          </Link>
        )}
      </div>
    </div>
  );
}
