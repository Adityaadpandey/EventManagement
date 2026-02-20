"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Search, Loader2, AlertCircle, Eye, CalendarDays } from "lucide-react";

type Event = {
  eventId: string;
  title: string;
  status: string;
  canBuy: boolean;
  date: string | null;
  location: string | null;
  lister?: { user?: { name?: string | null; email?: string | null } };
};

const STATUS_PILL: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  REJECTED: "bg-red-50 text-red-600 border border-red-200",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  NOT_VIEWED: "bg-gray-100 text-gray-500 border border-gray-200",
  CANCELLATION_REQUESTED:
    "bg-orange-50 text-orange-700 border border-orange-200",
  CANCELLED: "bg-red-50 text-red-400 border border-red-100",
};

const ALL_STATUSES = [
  "ALL",
  "APPROVED",
  "PENDING",
  "NOT_VIEWED",
  "REJECTED",
  "CANCELLED",
];

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

export default function AdminAllEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, []);

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

  const filtered = events.filter((e) => {
    const q = search.toLowerCase();
    return (
      (e.title.toLowerCase().includes(q) ||
        (e.lister?.user?.name || "").toLowerCase().includes(q) ||
        (e.lister?.user?.email || "").toLowerCase().includes(q)) &&
      (statusFilter === "ALL" || e.status === statusFilter)
    );
  });

  if (loading)
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-[#FFE348]" />
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center h-full gap-2 text-sm text-red-500">
        <AlertCircle className="w-4 h-4" /> {error}
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
          <h1 className="text-2xl font-bold text-[#1E1E1E]">All Events</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {events.length} events on the platform
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            type="text"
            placeholder="Search events or listers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 text-[#1E1E1E] placeholder-gray-300 outline-none focus:border-[#FFE348] focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_STATUSES.map((s) => {
            const count =
              s === "ALL"
                ? events.length
                : events.filter((e) => e.status === s).length;
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  active
                    ? "bg-[#FFE348] text-[#1E1E1E] shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {s === "ALL" ? "All" : s.replace("_", " ")} · {count}
              </button>
            );
          })}
        </div>
        <p className="ml-auto text-xs text-gray-300">{filtered.length} shown</p>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CalendarDays className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-300">
              No events match your filters
            </p>
          </div>
        ) : (
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
                    className="group hover:bg-[#eff0fb]/40 transition-colors"
                  >
                    <td className="px-5 py-3.5 max-w-[220px]">
                      <p className="text-sm font-semibold text-[#1E1E1E] truncate">
                        {ev.title}
                      </p>
                      {ev.location && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {ev.location}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 max-w-[160px]">
                      <p className="text-sm text-[#3D3D3D] truncate">
                        {ev.lister?.user?.name || ev.lister?.user?.email || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400 whitespace-nowrap">
                      {ev.date
                        ? new Date(ev.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_PILL[ev.status] || "bg-gray-100 text-gray-500"}`}
                      >
                        {ev.status.replace(/_/g, " ")}
                      </span>
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
                        className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-[#1E1E1E] opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
