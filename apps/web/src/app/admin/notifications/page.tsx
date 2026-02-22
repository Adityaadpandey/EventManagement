"use client";

import api from "@/lib/api";
import { Bell, Loader2, Megaphone, Send, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader, Toast } from "../_components/admin-components";

type Mode = "broadcast" | "targeted";

function AdminNotificationsContent() {
  const [mode, setMode] = useState<Mode>("broadcast");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [userIds, setUserIds] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [stats, setStats] = useState<{ active: number; total: number } | null>(
    null,
  );

  useEffect(() => {
    api
      .get("/notification/stats")
      .then((r) => setStats(r.data?.data))
      .catch(() => {});
  }, []);

  const canSend = title.trim() && body.trim();

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const payload: any = { title: title.trim(), body: body.trim() };
      if (mode === "targeted" && userIds.trim()) {
        payload.userIds = userIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
      }
      const res = await api.post("/notification/send", payload);
      const result = res.data?.data;
      const sent = result?.sent ?? 0;
      const total = result?.total ?? 0;
      setToast({
        msg:
          mode === "broadcast"
            ? `Broadcast sent to ${sent}/${total} devices!`
            : `Notification sent to ${payload.userIds?.length || 0} users!`,
        ok: true,
      });
      setTitle("");
      setBody("");
      setUserIds("");
      // Refresh stats after send
      api
        .get("/notification/stats")
        .then((r) => setStats(r.data?.data))
        .catch(() => {});
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || "Failed to send notification",
        ok: false,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 pb-24 lg:pb-10">
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />
      )}

      <PageHeader
        title="Push Notifications"
        subtitle="Send push notifications to your users"
      />

      {/* Subscription Stats */}
      {stats !== null && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-100 shadow-sm w-fit text-sm">
          <Bell className="w-4 h-4 text-[var(--color-brand)]" />
          <span className="font-bold text-[var(--color-neutral-dark4)]">
            {stats.active}
          </span>
          <span className="text-gray-400">active subscribers</span>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("broadcast")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            mode === "broadcast"
              ? "bg-[var(--color-brand)] text-white shadow-md"
              : "bg-[var(--color-neutral-light)] text-[var(--color-neutral-dark4)] hover:bg-gray-100 border border-gray-100"
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Broadcast to All
        </button>
        <button
          onClick={() => setMode("targeted")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            mode === "targeted"
              ? "bg-[var(--color-brand)] text-white shadow-md"
              : "bg-[var(--color-neutral-light)] text-[var(--color-neutral-dark4)] hover:bg-gray-100 border border-gray-100"
          }`}
        >
          <Users className="w-4 h-4" />
          Targeted Users
        </button>
      </div>

      {/* Form */}
      <div className="bg-[var(--color-neutral-light)] rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        {/* Mode info */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/60 border border-blue-100">
          <Bell className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 leading-relaxed">
            {mode === "broadcast"
              ? "This will send a push notification to ALL users who have enabled push notifications. Use responsibly."
              : "Enter comma-separated user IDs to send targeted notifications to specific users."}
          </p>
        </div>

        {/* Targeted User IDs */}
        {mode === "targeted" && (
          <div>
            <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1.5">
              User IDs
              <span className="text-red-400 ml-0.5">*</span>
            </label>
            <textarea
              value={userIds}
              onChange={(e) => setUserIds(e.target.value)}
              placeholder="user-id-1, user-id-2, user-id-3..."
              rows={2}
              className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] resize-none transition-all"
            />
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1.5">
            Notification Title
            <span className="text-red-400 ml-0.5">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New event added near you!"
            maxLength={100}
            className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
          />
          <p className="text-[11px] text-gray-300 mt-1 text-right">
            {title.length}/100
          </p>
        </div>

        {/* Body */}
        <div>
          <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1.5">
            Message Body
            <span className="text-red-400 ml-0.5">*</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the notification message..."
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] resize-none transition-all"
          />
          <p className="text-[11px] text-gray-300 mt-1 text-right">
            {body.length}/500
          </p>
        </div>

        {/* Send Button */}
        <div className="flex justify-end pt-2">
          <button
            disabled={!canSend || sending}
            onClick={handleSend}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-[var(--color-brand)] hover:brightness-110 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending
              ? "Sending..."
              : mode === "broadcast"
                ? "Broadcast Notification"
                : "Send to Users"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminNotificationsContent;
