"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Banknote,
  Ticket,
  TrendingUp,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";

type Event = {
  eventId: string;
  title: string;
  status: string;
  canBuy: boolean;
  date: string | null;
  createdAt?: string;
  lister?: { user?: { name?: string | null; email?: string | null } };
};
type Payout = {
  id: string;
  status: string;
  amount: number;
  createdAt: string;
  lister?: { companyName?: string | null; user?: { name?: string | null } };
};

const STATUS_PILL: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  REJECTED: "bg-red-50 text-red-600 border border-red-200",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  NOT_VIEWED: "bg-gray-100 text-gray-500 border border-gray-200",
  CANCELLATION_REQUESTED:
    "bg-orange-50 text-orange-700 border border-orange-200",
  CANCELLED: "bg-red-50 text-red-500 border border-red-100",
};
const PAYOUT_PILL: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  APPROVED: "bg-blue-50 text-blue-700 border border-blue-200",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  REJECTED: "bg-red-50 text-red-600 border border-red-200",
  REVERSED: "bg-orange-50 text-orange-700 border border-orange-200",
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const fmtCur = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get("/admin/event/all"),
      api.get("/admin/payout/all"),
      api.get("/admin/get-all-pending-events"),
    ])
      .then(([evRes, payRes, pendRes]) => {
        const evData = evRes.data?.data;
        setEvents(Array.isArray(evData) ? evData : []);
        const payData = payRes.data?.data;
        setPayouts(
          Array.isArray(payData)
            ? payData
            : Array.isArray(payData?.payouts)
              ? payData.payouts
              : [],
        );
        const pendData = pendRes.data?.data;
        setPendingEvents(Array.isArray(pendData) ? pendData : []);
      })
      .catch((e) => setError(e?.response?.data?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

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

  const pendingCount = pendingEvents.length;
  const approved = events.filter((e) => e.status === "APPROVED").length;
  const completedAmount = payouts
    .filter((p) => p.status === "COMPLETED")
    .reduce((s, p) => s + p.amount, 0);
  const pendingPayouts = payouts.filter((p) =>
    ["PENDING", "APPROVED"].includes(p.status),
  ).length;

  const metrics = [
    {
      label: "Total Events",
      value: events.length,
      sub: `${approved} approved`,
      icon: CalendarDays,
      href: "/admin/events",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Pending Review",
      value: pendingCount,
      sub: "awaiting action",
      icon: Clock,
      href: "/admin/events/pending",
      color: "text-amber-600",
      bg: "bg-amber-50",
      urgent: pendingCount > 0,
    },
    {
      label: "Open for Sales",
      value: events.filter((e) => e.canBuy).length,
      sub: "accepting tickets",
      icon: Ticket,
      href: "/admin/events",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Payouts Queued",
      value: pendingPayouts,
      sub: "need processing",
      icon: Banknote,
      href: "/admin/payouts",
      color: "text-green-600",
      bg: "bg-green-50",
      urgent: pendingPayouts > 0,
    },
    {
      label: "Total Paid Out",
      value: fmtCur(completedAmount),
      sub: "completed",
      icon: TrendingUp,
      href: "/admin/payouts",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Total Payouts",
      value: payouts.length,
      sub: "all time",
      icon: CheckCircle2,
      href: "/admin/payouts",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
  ];

  const recentEvents = events.slice(0, 6);
  const recentPayouts = payouts.slice(0, 6);

  return (
    <div className="p-6 space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E1E1E]">Overview</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Urgent alert */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between bg-[#FFE348] rounded-2xl px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#1E1E1E] animate-pulse" />
            <div>
              <p className="text-sm font-bold text-[#1E1E1E]">
                {pendingCount} event{pendingCount !== 1 ? "s" : ""} awaiting
                your approval
              </p>
              <p className="text-xs text-[#3D3D3D] mt-0.5">
                Review submissions before they go live on the platform
              </p>
            </div>
          </div>
          <Link
            href="/admin/events/pending"
            className="flex items-center gap-1.5 bg-[#1E1E1E] text-[#FFE348] text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#3D3D3D] transition-colors shrink-0"
          >
            Review Now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#FFE348]/40 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center`}
              >
                <m.icon
                  className={`w-4.5 h-4.5 ${m.color}`}
                  strokeWidth={1.8}
                />
              </div>
              {m.urgent && (
                <span className="text-[10px] font-bold bg-[#FFE348] text-[#1E1E1E] px-2 py-0.5 rounded-full">
                  Action needed
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-[#1E1E1E] tabular-nums">
              {m.value}
            </p>
            <p className="text-sm font-medium text-[#1E1E1E] mt-1">{m.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
          </Link>
        ))}
      </div>

      {/* Two-column feed */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Events */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-[#1E1E1E]">Recent Events</p>
            <Link
              href="/admin/events"
              className="text-xs font-medium text-gray-400 hover:text-[#1E1E1E] transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentEvents.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center text-gray-300">
                No events yet
              </p>
            ) : (
              recentEvents.map((ev) => (
                <Link
                  key={ev.eventId}
                  href={`/admin/events/${ev.eventId}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1E1E1E] truncate">
                      {ev.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {ev.lister?.user?.name ||
                        ev.lister?.user?.email ||
                        "Unknown lister"}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${STATUS_PILL[ev.status] || "bg-gray-100 text-gray-500"}`}
                  >
                    {ev.status.replace("_", " ")}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Payouts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-[#1E1E1E]">Recent Payouts</p>
            <Link
              href="/admin/payouts"
              className="text-xs font-medium text-gray-400 hover:text-[#1E1E1E] transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentPayouts.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center text-gray-300">
                No payouts yet
              </p>
            ) : (
              recentPayouts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1E1E1E] tabular-nums">
                      {fmtCur(p.amount)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {p.lister?.companyName ||
                        p.lister?.user?.name ||
                        "Unknown"}{" "}
                      · {fmtDate(p.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${PAYOUT_PILL[p.status] || "bg-gray-100 text-gray-500"}`}
                  >
                    {p.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Event status breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-bold text-[#1E1E1E] mb-4">
          Event Status Breakdown
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            "APPROVED",
            "PENDING",
            "NOT_VIEWED",
            "REJECTED",
            "CANCELLATION_REQUESTED",
            "CANCELLED",
          ].map((s) => {
            const count = events.filter((e) => e.status === s).length;
            const pct = events.length
              ? Math.round((count / events.length) * 100)
              : 0;
            return (
              <div key={s} className="text-center">
                <p className="text-2xl font-bold text-[#1E1E1E] tabular-nums">
                  {count}
                </p>
                <div className="h-1.5 rounded-full bg-gray-100 mt-2 mb-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background:
                        s === "APPROVED"
                          ? "#22c55e"
                          : s === "REJECTED" || s === "CANCELLED"
                            ? "#ef4444"
                            : s === "PENDING"
                              ? "#eab308"
                              : "#d1d5db",
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 leading-tight">
                  {s.replace(/_/g, " ")}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
