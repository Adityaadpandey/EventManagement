"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
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

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isAuthed = useMemo(() => {
    const hasReduxToken = !!token;
    const hasLocal =
      typeof window !== "undefined" && !!localStorage.getItem("token");
    return hasReduxToken || hasLocal;
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hydrated) {
        await dispatch(hydrateSession())
          .unwrap()
          .catch(() => {});
      }
      try {
        const res = await api.get("/user/profile");
        const p: ProfileResp | undefined = res?.data?.data;
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
  }, [dispatch, hydrated]);

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setSaveError("Cloudinary not configured properly");
      return;
    }
    setUploadingAvatar(true);
    setUploadProgress(0);
    setSaveError(null);
    try {
      const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };
      xhr.onload = () => {
        const data = JSON.parse(xhr.responseText);
        if (!data.secure_url) {
          setSaveError("Upload failed");
        } else {
          setForm((f) => ({ ...f, avatar: data.secure_url }));
          setSaveSuccess("Avatar uploaded");
        }
        setUploadingAvatar(false);
      };
      xhr.onerror = () => {
        setSaveError("Upload failed");
        setUploadingAvatar(false);
      };
      xhr.send(fd);
    } catch (err: any) {
      setSaveError(err?.message || "Avatar upload failed");
      setUploadingAvatar(false);
    }
  };

  const onFileChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
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

  const onSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      if (!form.name.trim()) throw new Error("Name is required");
      const payload: Record<string, any> = {};
      if (form.name.trim()) payload.name = form.name.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.avatar?.trim()) payload.avatar = form.avatar.trim();
      if (form.phone.trim()) payload.phone = form.phone.trim();

      await api.patch("/user/profile", payload);
      await dispatch(hydrateSession()).unwrap();
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

  if (!isAuthed)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFC] p-6">
        <button
          onClick={() => router.push("/auth")}
          className="px-6 py-3 rounded-full bg-[#FFE348] border-b-2 border-[#FFDA0A]"
        >
          Login
        </button>
      </div>
    );

  return (
    <div className="bg-[#FBFBFC] p-6 pb-32 min-h-screen">
      <div className="mx-auto max-w-4xl">
        <div className="bg-white rounded-3xl shadow-md overflow-hidden mb-6">
          <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="flex flex-col items-center">
              <div className="relative w-28 h-28 md:w-32 md:h-32 flex-shrink-0 rounded-full overflow-hidden border border-zinc-200 group">
                {form.avatar ? (
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

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-semibold">
                {form.name || "Unnamed"}
              </h1>
              <p className="text-zinc-500 mt-1">{form.email || "No email"}</p>
              <div className="mt-3">
                <span className="px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-sm">
                  {form.role || user?.role || "USER"}
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
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-600 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={onChange("phone")}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl bg-zinc-50"
                placeholder="Your phone number"
              />
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
                  setForm({
                    name: user?.name ?? "",
                    email: user?.email ?? "",
                    avatar: user?.avatar ?? "",
                    phone: user?.phone ?? "",
                    role: user?.role ?? "",
                  });
                  setSaveError(null);
                  setSaveSuccess(null);
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
