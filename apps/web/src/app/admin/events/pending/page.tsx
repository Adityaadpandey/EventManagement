"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type PendingEvent = {
  eventId: string;
  title: string;
  description: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  status:
    | "NOT_VIEWED"
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLATION_REQUESTED"
    | "CANCELLED";
  lister: { user: { name: string | null; email: string | null } };
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr: string) {
  return new Date(timeStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function AdminPendingEventsPage() {
  const [items, setItems] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get("/admin/get-all-pending-events");
      setItems(res.data?.data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load pending events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (eventId: string, newStatus: "APPROVED" | "REJECTED") => {
    setActing(eventId);
    try {
      await api.post("/admin/change-event-status", { eventId, newStatus });
      setItems((prev) => prev.filter((e) => e.eventId !== eventId));
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          `Failed to ${newStatus.toLowerCase()} event`,
      );
    } finally {
      setActing(null);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (err) return <div className="p-4 text-red-600">{err}</div>;

  return (
    <div className="mx-auto w-full p-6 text-white space-y-6 h-screen overflow-y-auto">
      <h1 className="text-2xl font-bold">🕵️ Admin – Pending Events</h1>

      {items.length === 0 ? (
        <div className="p-6 bg-zinc-900 border border-zinc-700 rounded text-zinc-300 text-center">
          ✅ All clear! No pending events.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((ev) => (
            <div
              key={ev.eventId}
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              {/* Title + Metadata */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">{ev.title}</h2>
                  <div className="text-sm text-zinc-400 space-y-0.5">
                    <div>
                      👤{" "}
                      {ev.lister?.user?.name ||
                        ev.lister?.user?.email ||
                        "Unknown Lister"}
                    </div>
                    {ev.location && <div>📍 {ev.location}</div>}
                    {ev.date && (
                      <div>
                        📅 {formatDate(ev.date)}{" "}
                        {ev.time ? `• 🕒 ${formatTime(ev.time)}` : ""}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 min-w-[100px] text-sm">
                  <button
                    disabled={acting === ev.eventId}
                    onClick={() => act(ev.eventId, "APPROVED")}
                    className={`px-3 py-1.5 rounded text-white ${
                      acting === ev.eventId
                        ? "bg-green-700 opacity-70"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {acting === ev.eventId ? "..." : "Approve"}
                  </button>
                  <button
                    disabled={acting === ev.eventId}
                    onClick={() => act(ev.eventId, "REJECTED")}
                    className={`px-3 py-1.5 rounded text-white ${
                      acting === ev.eventId
                        ? "bg-red-700 opacity-70"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>

              {/* Description */}
              {ev.description && (
                <p className="text-sm text-zinc-300 line-clamp-3">
                  {ev.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
