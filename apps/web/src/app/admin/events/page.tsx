"use client";

import api from "@/lib/api";
import { CalendarDays, Eye, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  FilterPill,
  PageHeader,
  SkeletonCard,
  SkeletonTableRow,
  StatusBadge,
  Toast,
} from "../_components/admin-components";
import {
  type AdminEvent,
  EVENT_STATUSES,
  fmtDate,
  getStatusLabel,
} from "../_lib/admin-utils";

export default function AdminAllEventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/event/all");
      const d = res.data?.data;
      setEvents(Array.isArray(d) ? d : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleCanBuy = async (eventId: string, current: boolean) => {
    setToggling(eventId);
    try {
      await api.patch(`/admin/event/canBuy/${eventId}`, { canBuy: !current });
      setEvents((prev) =>
        prev.map((e) =>
          e.eventId === eventId ? { ...e, canBuy: !current } : e,
        ),
      );
      setToast({
        msg: `Ticket sales ${!current ? "enabled" : "disabled"}`,
        ok: true,
      });
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || "Failed to update",
        ok: false,
      });
    } finally {
      setToggling(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return events.filter(
      (e) =>
        (e.title.toLowerCase().includes(q) ||
          (e.lister?.user?.name || "").toLowerCase().includes(q) ||
          (e.lister?.user?.email || "").toLowerCase().includes(q)) &&
        (statusFilter === "ALL" || e.status === statusFilter),
    );
  }, [events, search, statusFilter]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[40vh] gap-2 text-sm text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 pb-24 lg:pb-10">
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />
      )}

      {/* Header */}
      <PageHeader
        title="All Events"
        subtitle={
          loading
            ? "Loading events..."
            : `${events.length} events on the platform`
        }
      />

      {/* Filters */}
      <div className="bg-[var(--color-neutral-light)] rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            type="text"
            placeholder="Search events or listers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 text-[var(--color-neutral-dark2)] placeholder-gray-300 outline-none focus:border-[var(--color-primary)] focus:bg-[var(--color-neutral-light)] transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {EVENT_STATUSES.map((s) => {
            const count =
              s === "ALL"
                ? events.length
                : events.filter((e) => e.status === s).length;
            return (
              <FilterPill
                key={s}
                label={s === "ALL" ? "All" : getStatusLabel(s)}
                count={count}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              />
            );
          })}
        </div>
        {!loading && (
          <p className="sm:ml-auto text-xs text-gray-300 whitespace-nowrap">
            {filtered.length} shown
          </p>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <>
          {/* Desktop skeleton */}
          <div className="hidden md:block bg-[var(--color-neutral-light)] rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {[
                    "Event",
                    "Lister",
                    "Date",
                    "Status",
                    "Ticket Sales",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonTableRow key={i} cols={6} />
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile skeleton */}
          <div className="md:hidden space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events match your filters"
          subtitle="Try adjusting your search or status filter"
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-[var(--color-neutral-light)] rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {[
                      "Event",
                      "Lister",
                      "Date",
                      "Status",
                      "Ticket Sales",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((ev) => (
                    <tr
                      key={ev.eventId}
                      className="group hover:bg-[var(--background)]/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 max-w-[220px]">
                        <p className="text-sm font-semibold text-[var(--color-neutral-dark2)] truncate">
                          {ev.title}
                        </p>
                        {ev.location && (
                          <p className="text-xs text-[var(--color-neutral-dark4)] mt-0.5 truncate">
                            {ev.location}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 max-w-[160px]">
                        <p className="text-sm text-[var(--color-neutral-dark3)] truncate">
                          {ev.lister?.user?.name ||
                            ev.lister?.user?.email ||
                            "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[var(--color-neutral-dark4)] whitespace-nowrap">
                        {ev.date ? fmtDate(ev.date) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={ev.status} type="event" />
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => toggleCanBuy(ev.eventId, ev.canBuy)}
                          disabled={toggling === ev.eventId}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border disabled:opacity-50 ${
                            ev.canBuy
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                          }`}
                        >
                          {toggling === ev.eventId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span
                              className={`w-2 h-2 rounded-full ${ev.canBuy ? "bg-emerald-500" : "bg-gray-400"}`}
                            />
                          )}
                          {ev.canBuy ? "Open" : "Closed"}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/events/${ev.eventId}`}
                          className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-[var(--color-neutral-dark2)] opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((ev) => (
              <div
                key={ev.eventId}
                className="bg-[var(--color-neutral-light)] rounded-2xl border border-gray-100 shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/events/${ev.eventId}`}
                      className="text-sm font-semibold text-[var(--color-neutral-dark2)] hover:underline line-clamp-1"
                    >
                      {ev.title}
                    </Link>
                    <p className="text-xs text-[var(--color-neutral-dark4)] mt-0.5 truncate">
                      {ev.lister?.user?.name ||
                        ev.lister?.user?.email ||
                        "Unknown"}
                    </p>
                  </div>
                  <StatusBadge status={ev.status} type="event" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-xs text-[var(--color-neutral-dark4)]">
                    {ev.date && <span>{fmtDate(ev.date)}</span>}
                    {ev.location && (
                      <span className="truncate max-w-[120px]">
                        {ev.location}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleCanBuy(ev.eventId, ev.canBuy)}
                    disabled={toggling === ev.eventId}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border disabled:opacity-50 ${
                      ev.canBuy
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}
                  >
                    {toggling === ev.eventId ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${ev.canBuy ? "bg-emerald-500" : "bg-gray-400"}`}
                      />
                    )}
                    {ev.canBuy ? "Open" : "Closed"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
