"use client";

import api from "@/lib/api";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  EmptyState,
  PageError,
  PageHeader,
  SkeletonCard,
  Toast,
} from "../../_components/admin-components";
import { type PendingEvent, fmtDateLong } from "../../_lib/admin-utils";

export default function AdminPendingEventsPage() {
  const [items, setItems] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/get-all-pending-events");
      setItems(res.data?.data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  if (err) return <PageError message={err} />;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 pb-24 lg:pb-10">
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />
      )}

      <PageHeader
        title="Pending Review"
        badge={loading ? null : items.length || null}
        subtitle={
          loading
            ? "Loading submissions..."
            : items.length === 0
              ? "All submissions have been reviewed — great work!"
              : "Review each submission carefully before approving"
        }
      />

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Check}
          title="Queue is empty"
          subtitle="All submissions are reviewed"
        />
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
                className="bg-[var(--color-neutral-light)] rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Main row */}
                <div
                  className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-4 sm:p-5 cursor-pointer hover:bg-[var(--background)]/30 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : ev.eventId)}
                >
                  {/* Number */}
                  <span className="hidden sm:block text-sm font-bold text-gray-200 shrink-0 pt-0.5 w-6 text-right tabular-nums">
                    {idx + 1}
                  </span>

                  {/* Event info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--color-neutral-dark2)] leading-snug">
                      {ev.title}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      <span className="flex items-center gap-1.5 text-xs text-[var(--color-neutral-dark4)]">
                        <User className="w-3.5 h-3.5" />
                        {ev.lister?.user?.name ||
                          ev.lister?.user?.email ||
                          "Unknown lister"}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1.5 text-xs text-[var(--color-neutral-dark4)]">
                          <MapPin className="w-3.5 h-3.5" />
                          {ev.location}
                        </span>
                      )}
                      {ev.date && (
                        <span className="flex items-center gap-1.5 text-xs text-[var(--color-neutral-dark4)]">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {fmtDateLong(ev.date)}
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
                      className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50 shadow-sm"
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
                      className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-bold bg-[var(--color-neutral-light)] hover:bg-red-50 text-red-500 border border-red-200 transition-colors disabled:opacity-50"
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
                  <div className="px-4 sm:px-5 pb-5 pt-0 border-t border-gray-100 sm:ml-10">
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
