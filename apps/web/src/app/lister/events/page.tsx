"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { BarChart, Edit, Users } from "lucide-react";

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
    (status === "APPROVED" && "bg-green-100 text-green-800") ||
    (status === "REJECTED" && "bg-red-100 text-red-800") ||
    (status === "PENDING" && "bg-yellow-100 text-yellow-800") ||
    (status === "NOT_VIEWED" && "bg-gray-100 text-gray-800") ||
    (status === "CANCELLATION_REQUESTED" && "bg-orange-100 text-orange-800") ||
    (status === "CANCELLED" && "bg-red-200 text-red-900") ||
    "bg-gray-100 text-gray-800"
  );
}

export default function ListerEventsPage() {
  const [items, setItems] = useState<ListerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopyLink = async (eventId: string) => {
    const url = `https://tixin.in/event/${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(eventId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert("Failed to copy link");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg font-medium text-gray-600">Loading...</div>
      </div>
    );

  if (err)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg font-medium text-red-600">{err}</div>
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 pb-40 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
        <h1 className="home-page-heading">My Events</h1>
        <Link
          href="/lister/events/create"
          className="bg-[#FFE348] hover:bg-yellow-300 text-gray-900 text-sm sm:text-base font-medium px-4 py-2 rounded-lg transition duration-200 flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <span>＋</span> Create Event
        </Link>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="p-6 sm:p-8 border border-gray-200 rounded-lg bg-white text-gray-600 text-center">
          <p className="text-base sm:text-lg font-medium">
            No events listed yet.
          </p>
          <p className="mt-2 text-sm sm:text-base">
            Start by creating your first event!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {items.map((ev) => (
            <div
              key={ev.eventId}
              className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 hover:shadow-lg transition-shadow duration-200"
            >
              {/* Banner */}
              {ev.banner_square || ev.banner_horizontal ? (
                <div className="relative w-full h-40 sm:h-48 rounded-xl overflow-hidden border border-gray-100">
                  <img
                    src={ev.banner_square || ev.banner_horizontal!}
                    alt={ev.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-40 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                  No banner
                </div>
              )}

              {/* Title + Status */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 line-clamp-1">
                  {ev.title}
                </h2>
                <span
                  className={`text-xs sm:text-sm font-medium px-3 py-1 rounded-full ${statusBadgeClass(
                    ev.status,
                  )}`}
                >
                  {formatStatus(ev.status)}
                </span>
              </div>

              {/* Info */}
              <div className="text-sm sm:text-base text-gray-600 space-y-1">
                {ev.location && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#FFE348]">📍</span> {ev.location}
                  </div>
                )}
                {ev.date && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#FFE348]">📅</span>{" "}
                    {formatDate(ev.date)}
                  </div>
                )}
              </div>

              {/* Action Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-2 text-sm font-medium">
                {/* Copy / Share */}
                <button
                  onClick={() => handleCopyLink(ev.eventId)}
                  className={`transition duration-200 flex items-center gap-2 justify-center sm:justify-start rounded-md px-3 py-2 border ${
                    copiedId === ev.eventId
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "text-yellow-600 hover:text-yellow-700 border-gray-200 hover:bg-yellow-50"
                  }`}
                >
                  {copiedId === ev.eventId ? "✅ Copied!" : "🔗 Copy Link"}
                </button>

                {/* Analytics */}
                <Link
                  href={`/lister/events/${ev.eventId}`}
                  className="text-blue-600 hover:text-blue-700 transition duration-200 flex items-center gap-2 justify-center sm:justify-start border border-gray-200 rounded-md px-3 py-2 hover:bg-blue-50"
                >
                  <BarChart /> Analytics
                </Link>

                {/* Edit */}
                <Link
                  href={`/event/${ev.eventId}/edit`}
                  className="text-gray-700 hover:text-gray-900 transition duration-200 flex items-center gap-2 justify-center sm:justify-start border border-gray-200 rounded-md px-3 py-2 hover:bg-gray-50"
                >
                  <Edit /> Edit
                </Link>

                <Link
                  href={`/event/${ev.eventId}/attendees`}
                  className="text-gray-700 hover:text-gray-900 transition duration-200 flex items-center gap-2 justify-center sm:justify-start border border-gray-200 rounded-md px-3 py-2 hover:bg-gray-50"
                >
                  <Users /> Attendees
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
