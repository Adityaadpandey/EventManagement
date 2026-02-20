"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Loader2,
  AlertCircle,
  Check,
  X,
  MapPin,
  CalendarDays,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type PendingEvent = {
  eventId: string;
  title: string;
  description: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  status: string;
  lister: { user: { name: string | null; email: string | null } };
};

function Toast({
  msg,
  ok,
  onDone,
}: {
  msg: string;
  ok: boolean;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl text-sm font-medium shadow-lg border ${
        ok
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-red-50 text-red-600 border-red-200"
      }`}
    >
      {msg}
    </div>
  );
}

export default function AdminPendingEventsPage() {
  const [items, setItems] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/get-all-pending-events");
      setItems(res.data?.data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (eventId: string, newStatus: "APPROVED" | "REJECTED") => {
    setActing(eventId + newStatus);
    try {
      await api.post("/admin/change-event-status", { eventId, newStatus });
      setItems((prev) => prev.filter((e) => e.eventId !== eventId));
      setToast({
        msg:
          newStatus === "APPROVED"
            ? "Event approved and live!"
            : "Event rejected.",
        ok: newStatus === "APPROVED",
      });
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || "Action failed",
        ok: false,
      });
    } finally {
      setActing(null);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-[#FFE348]" />
      </div>
    );
  if (err)
    return (
      <div className="flex items-center justify-center h-full gap-2 text-sm text-red-500">
        <AlertCircle className="w-4 h-4" /> {err}
      </div>
    );

  return (
    <div className="p-6 space-y-5 pb-10">
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E1E1E]">
            Pending Review
            {items.length > 0 && (
              <span className="ml-2 text-sm font-bold bg-[#FFE348] text-[#1E1E1E] px-2.5 py-0.5 rounded-full align-middle">
                {items.length}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {items.length === 0
              ? "All submissions have been reviewed — great work!"
              : "Review each submission carefully before approving"}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
            <Check className="w-7 h-7 text-emerald-600" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-[#1E1E1E]">Queue is empty</p>
            <p className="text-sm text-gray-400 mt-1">
              All submissions are reviewed
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((ev, idx) => {
            const isExpanded = expanded === ev.eventId;
            const isApproving = acting === ev.eventId + "APPROVED";
            const isRejecting = acting === ev.eventId + "REJECTED";
            const isActing = isApproving || isRejecting;

            return (
              <div
                key={ev.eventId}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Main row */}
                <div
                  className="flex items-start gap-4 p-5 cursor-pointer hover:bg-[#eff0fb]/30 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : ev.eventId)}
                >
                  {/* Number */}
                  <span className="text-sm font-bold text-gray-200 shrink-0 pt-0.5 w-6 text-right tabular-nums">
                    {idx + 1}
                  </span>

                  {/* Event info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1E1E1E] leading-snug">
                      {ev.title}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        <User className="w-3.5 h-3.5" />
                        {ev.lister?.user?.name ||
                          ev.lister?.user?.email ||
                          "Unknown lister"}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <MapPin className="w-3.5 h-3.5" />
                          {ev.location}
                        </span>
                      )}
                      {ev.date && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {new Date(ev.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      disabled={isActing}
                      onClick={() => act(ev.eventId, "APPROVED")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {isApproving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                      )}
                      Approve
                    </button>
                    <button
                      disabled={isActing}
                      onClick={() => act(ev.eventId, "REJECTED")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white hover:bg-red-50 text-red-500 border border-red-200 transition-colors disabled:opacity-50"
                    >
                      {isRejecting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                      )}
                      Reject
                    </button>
                    <button
                      onClick={() =>
                        setExpanded(isExpanded ? null : ev.eventId)
                      }
                      className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-300" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded description */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-gray-100 ml-10">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-300 mb-2 pt-4">
                      Description
                    </p>
                    {ev.description ? (
                      <div
                        className="text-sm text-gray-500 leading-relaxed line-clamp-6"
                        dangerouslySetInnerHTML={{ __html: ev.description }}
                      />
                    ) : (
                      <p className="text-sm text-gray-300 italic">
                        No description provided
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
