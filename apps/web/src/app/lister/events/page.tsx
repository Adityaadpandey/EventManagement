"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { BarChart, Edit, Loader2, Mail, Send, Users } from "lucide-react";
import EventUpdateModal from "@/components/EventUpdateModal";

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
  availableMailUpdates: number;
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
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishToast, setPublishToast] = useState<{
    msg: string;
    ok: boolean;
  } | null>(null);
  const [updateModalEvent, setUpdateModalEvent] = useState<ListerEvent | null>(
    null,
  );

  const handleUpdateSuccess = (eventId: string) => {
    setItems((prev) =>
      prev.map((ev) =>
        ev.eventId === eventId
          ? {
              ...ev,
              availableMailUpdates: Math.max(0, ev.availableMailUpdates - 1),
            }
          : ev,
      ),
    );
  };

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

  const handlePublish = async (eventId: string) => {
    if (
      !confirm(
        "Submit this event for admin review? We'll email you once it's approved.",
      )
    )
      return;
    setPublishing(eventId);
    try {
      await api.patch(`/event/${eventId}/publish`);
      setItems((prev) =>
        prev.map((ev) =>
          ev.eventId === eventId ? { ...ev, status: "PENDING" } : ev,
        ),
      );
      setPublishToast({
        msg: "Event submitted for review! Check your email.",
        ok: true,
      });
    } catch (e: any) {
      setPublishToast({
        msg: e?.response?.data?.message || "Failed to submit event",
        ok: false,
      });
    } finally {
      setPublishing(null);
      setTimeout(() => setPublishToast(null), 4000);
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
      {/* Toast */}
      {publishToast && (
        <div
          className={`fixed bottom-6 right-4 z-50 px-4 py-3 rounded-2xl text-sm font-medium shadow-lg border max-w-xs ${
            publishToast.ok
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-600 border-red-200"
          }`}
        >
          {publishToast.msg}
        </div>
      )}

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
                {/* Publish button — only for NOT_VIEWED or REJECTED */}
                {(ev.status === "NOT_VIEWED" || ev.status === "REJECTED") && (
                  <button
                    onClick={() => handlePublish(ev.eventId)}
                    disabled={publishing === ev.eventId}
                    className="col-span-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#FFE348] hover:bg-yellow-300 text-gray-900 font-semibold border border-yellow-400 transition duration-200 disabled:opacity-60"
                  >
                    {publishing === ev.eventId ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}
                    {publishing === ev.eventId
                      ? "Submitting…"
                      : ev.status === "REJECTED"
                        ? "Resubmit for Review"
                        : "Publish Event"}
                  </button>
                )}

                {/* Pending label — not clickable */}
                {ev.status === "PENDING" && (
                  <div className="col-span-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                    ⏳ Awaiting admin review
                  </div>
                )}

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

                <button
                  onClick={() => setUpdateModalEvent(ev)}
                  className="text-gray-700 hover:text-gray-900 transition duration-200 flex items-center gap-2 justify-center sm:justify-start border border-gray-200 rounded-md px-3 py-2 hover:bg-gray-50"
                >
                  <Mail size={16} />
                  Send Update
                  {ev.availableMailUpdates > 0 ? (
                    <span className="ml-auto text-xs font-semibold bg-[#FFE348] text-gray-900 rounded-full px-1.5 py-0.5 leading-none">
                      {ev.availableMailUpdates}
                    </span>
                  ) : (
                    <span className="ml-auto text-xs font-medium bg-gray-100 text-gray-400 rounded-full px-1.5 py-0.5 leading-none">
                      0
                    </span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event Update Modal */}
      {updateModalEvent && (
        <EventUpdateModal
          eventId={updateModalEvent.eventId}
          eventTitle={updateModalEvent.title}
          availableMailUpdates={updateModalEvent.availableMailUpdates}
          onClose={() => setUpdateModalEvent(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
}
