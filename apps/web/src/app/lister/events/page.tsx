"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

type ListerEvent = {
  eventId: string;
  title: string;
  status:
    | "NOT_VIEWED"
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLATION_REQUESTED"
    | "CANCELLED";
  date: string | null;
  banner_square: string | null;
  banner_horizontal: string | null;
  location: string | null;
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatus(status: ListerEvent["status"]) {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadgeClass(status: ListerEvent["status"]) {
  return (
    (status === "APPROVED" && "bg-green-800 text-green-300") ||
    (status === "REJECTED" && "bg-red-800 text-red-300") ||
    (status === "PENDING" && "bg-yellow-800 text-yellow-300") ||
    (status === "NOT_VIEWED" && "bg-zinc-700 text-zinc-300") ||
    (status === "CANCELLATION_REQUESTED" && "bg-orange-800 text-orange-300") ||
    (status === "CANCELLED" && "bg-red-900 text-red-400") ||
    "bg-zinc-700 text-zinc-300"
  );
}

export default function ListerEventsPage() {
  const [items, setItems] = useState<ListerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await api.get("/event/lister");
        if (!cancel) setItems(res.data?.data || []);
      } catch (e: any) {
        if (!cancel)
          setErr(e?.response?.data?.message || "Failed to load events");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const badge = (s: ListerEvent["status"]) => {
    const cls =
      s === "APPROVED"
        ? "bg-green-100 text-green-700"
        : s === "REJECTED"
          ? "bg-red-100 text-red-700"
          : s === "PENDING"
            ? "bg-yellow-100 text-yellow-800"
            : s === "NOT_VIEWED"
              ? "bg-gray-100 text-gray-700"
              : "bg-zinc-100 text-zinc-700";
    return <span className={`text-xs px-2 py-0.5 rounded ${cls}`}>{s}</span>;
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (err) return <div className="p-4 text-red-600">{err}</div>;

  return (
    <div className="mx-auto w-full p-6 text-white space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🎫 My Events</h1>
        <Link
          href="/lister/events/create"
          className="bg-green-600 hover:bg-green-700 text-sm px-4 py-2 rounded text-white transition"
        >
          + Create Event
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="p-6 border border-zinc-700 rounded bg-zinc-900 text-zinc-300">
          You haven't listed any events yet.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((ev) => (
            <div
              key={ev.eventId}
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              {ev.banner_square || ev.banner_horizontal ? (
                <div className="relative w-full h-40 rounded overflow-hidden border border-zinc-800">
                  <img
                    src={ev.banner_square || ev.banner_horizontal!}
                    alt={ev.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold line-clamp-1">
                  {ev.title}
                </h2>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadgeClass(ev.status)}`}
                >
                  {formatStatus(ev.status)}
                </span>
              </div>

              <div className="text-sm text-zinc-400">
                {ev.location && <div>📍 {ev.location}</div>}
                {ev.date && <div>📅 {formatDate(ev.date)}</div>}
              </div>

              <div className="pt-2">
                <Link
                  href={`/event/${ev.eventId}`}
                  className="text-sm text-green-400 hover:underline"
                >
                  🔗 View public page
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
