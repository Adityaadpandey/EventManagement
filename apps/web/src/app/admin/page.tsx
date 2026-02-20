"use client";

import api from "@/lib/api";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  Ticket,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  MetricCard,
  PageHeader,
  SkeletonListSection,
  SkeletonMetricCard,
  StatusBadge,
} from "./_components/admin-components";
import {
  type AdminEvent,
  type AdminPayout,
  fmtCur,
  fmtDate,
  getGreeting,
  getStatusLabel,
} from "./_lib/admin-utils";

export default function AdminDashboard() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [pendingEvents, setPendingEvents] = useState<AdminEvent[]>([]);
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[40vh] gap-2 text-sm text-red-500">
        {error}
      </div>
    );
  }

  const pendingCount = loading ? 0 : pendingEvents.length;
  const approved = loading
    ? 0
    : events.filter((e) => e.status === "APPROVED").length;
  const completedAmount = loading
    ? 0
    : payouts
        .filter((p) => p.status === "COMPLETED")
        .reduce((s, p) => s + p.amount, 0);
  const pendingPayouts = loading
    ? 0
    : payouts.filter((p) => ["PENDING", "APPROVED"].includes(p.status)).length;

  const metrics = [
    {
      label: "Total Events",
      value: loading ? "—" : events.length,
      sub: loading ? "loading..." : `${approved} approved`,
      icon: CalendarDays,
      href: "/admin/events",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Pending Review",
      value: loading ? "—" : pendingCount,
      sub: "awaiting action",
      icon: Clock,
      href: "/admin/events/pending",
      color: "text-amber-600",
      bg: "bg-amber-50",
      urgent: !loading && pendingCount > 0,
    },
    {
      label: "Open for Sales",
      value: loading ? "—" : events.filter((e) => e.canBuy).length,
      sub: "accepting tickets",
      icon: Ticket,
      href: "/admin/events",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Payouts Queued",
      value: loading ? "—" : pendingPayouts,
      sub: "need processing",
      icon: Banknote,
      href: "/admin/payouts",
      color: "text-green-600",
      bg: "bg-green-50",
      urgent: !loading && pendingPayouts > 0,
    },
    {
      label: "Total Paid Out",
      value: loading ? "—" : fmtCur(completedAmount),
      sub: "completed",
      icon: TrendingUp,
      href: "/admin/payouts",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Total Payouts",
      value: loading ? "—" : payouts.length,
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
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 pb-24 lg:pb-10">
      {/* Header */}
      <PageHeader
        title={`${getGreeting()}`}
        subtitle={new Date().toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      />

      {/* Urgent alert */}
      {!loading && pendingCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[var(--color-primary)] rounded-2xl px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[var(--color-neutral-dark2)] animate-pulse" />
            <div>
              <p className="text-sm font-bold text-[var(--color-neutral-dark2)]">
                {pendingCount} event{pendingCount !== 1 ? "s" : ""} awaiting
                your approval
              </p>
              <p className="text-xs text-[var(--color-neutral-dark3)] mt-0.5">
                Review submissions before they go live
              </p>
            </div>
          </div>
          <Link
            href="/admin/events/pending"
            className="flex items-center gap-1.5 bg-[var(--color-neutral-dark2)] text-[var(--color-primary)] text-xs font-semibold px-4 py-2 rounded-full hover:bg-[var(--color-neutral-dark3)] transition-colors shrink-0"
          >
            Review Now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Metric cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonMetricCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {metrics.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      )}

      {/* Two-column feed */}
      {loading ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <SkeletonListSection rows={5} />
          <SkeletonListSection rows={5} />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Recent Events */}
          <div className="bg-[var(--color-neutral-light)] rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-bold text-[var(--color-neutral-dark2)]">
                Recent Events
              </p>
              <Link
                href="/admin/events"
                className="text-xs font-medium text-[var(--color-neutral-dark4)] hover:text-[var(--color-neutral-dark2)] transition-colors flex items-center gap-1"
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
                      <p className="text-sm font-medium text-[var(--color-neutral-dark2)] truncate">
                        {ev.title}
                      </p>
                      <p className="text-xs text-[var(--color-neutral-dark4)] mt-0.5 truncate">
                        {ev.lister?.user?.name ||
                          ev.lister?.user?.email ||
                          "Unknown lister"}
                      </p>
                    </div>
                    <StatusBadge status={ev.status} type="event" />
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Payouts */}
          <div className="bg-[var(--color-neutral-light)] rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-bold text-[var(--color-neutral-dark2)]">
                Recent Payouts
              </p>
              <Link
                href="/admin/payouts"
                className="text-xs font-medium text-[var(--color-neutral-dark4)] hover:text-[var(--color-neutral-dark2)] transition-colors flex items-center gap-1"
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
                      <p className="text-sm font-semibold text-[var(--color-neutral-dark2)] tabular-nums">
                        {fmtCur(p.amount)}
                      </p>
                      <p className="text-xs text-[var(--color-neutral-dark4)] mt-0.5 truncate">
                        {p.lister?.companyName ||
                          p.lister?.user?.name ||
                          "Unknown"}{" "}
                        · {fmtDate(p.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={p.status} type="payout" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event status breakdown */}
      {!loading && events.length > 0 && (
        <div className="bg-[var(--color-neutral-light)] rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm font-bold text-[var(--color-neutral-dark2)] mb-4">
            Event Status Breakdown
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
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
                  <p className="text-xl sm:text-2xl font-bold text-[var(--color-neutral-dark2)] tabular-nums">
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
                  <p className="text-[10px] text-[var(--color-neutral-dark4)] leading-tight">
                    {getStatusLabel(s)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
