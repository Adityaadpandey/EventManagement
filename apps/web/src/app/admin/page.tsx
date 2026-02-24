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
import { useMemo } from "react";
import {
  MetricCard,
  PageHeader,
  SkeletonListSection,
  SkeletonMetricCard,
  StatusBadge,
} from "./_components/admin-components";

import dynamic from "next/dynamic";
const ActivityChart = dynamic(() => import("./_components/activity-chart"), {
  ssr: false,
});

import {
  type AdminEvent,
  type AdminPayout,
  fmtCur,
  fmtDate,
  getGreeting,
  getStatusLabel,
} from "./_lib/admin-utils";

import { useQuery } from "@tanstack/react-query";

function AdminDashboardContent() {
  // Query 1: All Events
  const eventsQuery = useQuery({
    queryKey: ["admin", "events"],
    queryFn: async () => {
      const res = await api.get("/admin/event/all");
      const data = res.data?.data;
      return Array.isArray(data) ? (data as AdminEvent[]) : [];
    },
    enabled: typeof window !== "undefined",
  });

  // Query 2: All Payouts
  const payoutsQuery = useQuery({
    queryKey: ["admin", "payouts"],
    queryFn: async () => {
      const res = await api.get("/admin/payout/all");
      const data = res.data?.data;
      return Array.isArray(data)
        ? (data as AdminPayout[])
        : Array.isArray(data?.payouts)
          ? (data.payouts as AdminPayout[])
          : [];
    },
    enabled: typeof window !== "undefined",
  });

  // Query 3: Pending Events
  const pendingEventsQuery = useQuery({
    queryKey: ["admin", "pendingEvents"],
    queryFn: async () => {
      const res = await api.get("/admin/get-all-pending-events");
      const data = res.data?.data;
      return Array.isArray(data) ? (data as AdminEvent[]) : [];
    },
    enabled: typeof window !== "undefined",
  });

  const events = eventsQuery.data || [];
  const payouts = payoutsQuery.data || [];
  const pendingEvents = pendingEventsQuery.data || [];

  const anyError =
    eventsQuery.error || payoutsQuery.error || pendingEventsQuery.error;

  if (anyError) {
    return (
      <div className="flex items-center justify-center h-full min-h-[40vh] gap-2 text-sm text-red-500">
        Failed to load dashboard data. Please try again.
      </div>
    );
  }

  const pendingCount = pendingEventsQuery.isPending ? 0 : pendingEvents.length;
  const approved = eventsQuery.isPending
    ? 0
    : events.filter((e) => e.status === "APPROVED").length;
  const completedAmount = payoutsQuery.isPending
    ? 0
    : payouts
        .filter((p) => p.status === "COMPLETED")
        .reduce((s, p) => s + p.amount, 0);
  const pendingPayouts = payoutsQuery.isPending
    ? 0
    : payouts.filter((p) => ["PENDING", "PROCESSING"].includes(p.status))
        .length;

  const metrics = [
    {
      label: "Total Events",
      value: eventsQuery.isPending ? "—" : events.length,
      sub: eventsQuery.isPending ? "loading..." : `${approved} approved`,
      icon: CalendarDays,
      href: "/admin/events",
      color: "text-[var(--color-neutral-dark3)]",
      bg: "bg-[var(--color-primary)]/10",
      isLoading: eventsQuery.isPending,
    },
    {
      label: "Pending Review",
      value: pendingEventsQuery.isPending ? "—" : pendingCount,
      sub: "awaiting action",
      icon: Clock,
      href: "/admin/events/pending",
      color: "text-[var(--color-neutral-dark3)]",
      bg: "bg-gray-100",
      urgent: !pendingEventsQuery.isPending && pendingCount > 0,
      isLoading: pendingEventsQuery.isPending,
    },
    {
      label: "Open for Sales",
      value: eventsQuery.isPending
        ? "—"
        : events.filter((e) => e.canBuy).length,
      sub: "accepting tickets",
      icon: Ticket,
      href: "/admin/events",
      color: "text-[var(--color-neutral-dark2)]",
      bg: "bg-[var(--color-primary2)]/15",
      isLoading: eventsQuery.isPending,
    },
    {
      label: "Payouts Queued",
      value: payoutsQuery.isPending ? "—" : pendingPayouts,
      sub: "need processing",
      icon: Banknote,
      href: "/admin/payouts",
      color: "text-[var(--color-neutral-dark3)]",
      bg: "bg-gray-100",
      urgent: !payoutsQuery.isPending && pendingPayouts > 0,
      isLoading: payoutsQuery.isPending,
    },
    {
      label: "Total Paid Out",
      value: payoutsQuery.isPending ? "—" : fmtCur(completedAmount),
      sub: "completed",
      icon: TrendingUp,
      href: "/admin/payouts",
      color: "text-[var(--color-neutral-dark2)]",
      bg: "bg-[var(--color-primary)]/10",
      isLoading: payoutsQuery.isPending,
    },
    {
      label: "Total Payouts",
      value: payoutsQuery.isPending ? "—" : payouts.length,
      sub: "all time",
      icon: CheckCircle2,
      href: "/admin/payouts",
      color: "text-[var(--color-neutral-dark4)]",
      bg: "bg-gray-100",
      isLoading: payoutsQuery.isPending,
    },
  ];

  const recentEvents = events.slice(0, 6);
  const recentPayouts = payouts.slice(0, 6);

  // Derive payout trend data
  const chartData = useMemo(() => {
    if (!payouts.length) return [];

    // Group payouts by date (e.g., 'Mar 15')
    const grouped = payouts.reduce(
      (acc, p) => {
        const d = new Date(p.createdAt);
        if (isNaN(d.getTime())) return acc;

        const dateStr = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        if (!acc[dateStr]) {
          acc[dateStr] = 0;
        }

        if (p.status === "COMPLETED") {
          acc[dateStr] += p.amount;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    // Convert to array and sort chronologically
    // Usually admin APIs return newest first, so we reverse it to flow left-to-right (old-to-new)
    // Here we'll just sort by the original Date objects to be safe
    return (
      Object.entries(grouped)
        .map(([date, amount]) => ({ date, amount }))
        // Best effort sort, assumes month/day within same year mostly. Good enough for visual trend.
        .reverse()
        .slice(-30)
    ); // Show last 30 data points
  }, [payouts]);

  return (
    <div className="p-4 sm:p-6 sm:px-8 space-y-6 sm:space-y-8 pb-24 lg:pb-10 max-w-7xl mx-auto">
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
      {!pendingEventsQuery.isPending && pendingCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[var(--color-primary)] rounded-3xl px-6 py-5 shadow-sm border border-[var(--color-neutral-dark2)]/10">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-[var(--color-neutral-dark2)] animate-pulse shadow-md" />
            <div>
              <p className="text-base font-extrabold text-[var(--color-neutral-dark2)]">
                {pendingCount} event{pendingCount !== 1 ? "s" : ""} awaiting
                your approval
              </p>
              <p className="text-sm font-medium text-[var(--color-neutral-dark3)] mt-0.5">
                Review submissions before they go live
              </p>
            </div>
          </div>
          <Link
            href="/admin/events/pending"
            className="flex items-center gap-2 bg-[var(--color-neutral-dark2)] text-[var(--color-primary)] text-sm font-bold px-5 py-2.5 rounded-full hover:bg-[var(--color-neutral-dark3)] hover:scale-[1.02] transition-all shadow-md shrink-0"
          >
            Review Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Cancellation requested alert */}
      {!eventsQuery.isPending &&
        (() => {
          const cancelRequested = events.filter(
            (e) => e.status === "CANCELLATION_REQUESTED",
          );
          if (cancelRequested.length === 0) return null;
          return (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[var(--color-error-light)] border border-[var(--color-error)]/20 rounded-3xl px-6 py-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-[var(--color-error)] animate-pulse shadow-md" />
                <div>
                  <p className="text-base font-extrabold text-[var(--color-neutral-dark2)]">
                    {cancelRequested.length} event
                    {cancelRequested.length !== 1 ? "s" : ""} requesting
                    cancellation
                  </p>
                  <p className="text-sm font-medium text-[var(--color-neutral-dark3)] mt-0.5">
                    Review cancellation requests and take action
                  </p>
                </div>
              </div>
              <Link
                href={`/admin/events/${cancelRequested[0].eventId}`}
                className="flex items-center gap-2 bg-[var(--color-error)] text-white text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90 hover:scale-[1.02] transition-all shadow-md shrink-0"
              >
                Review <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          );
        })()}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {metrics.map((m) =>
          m.isLoading ? (
            <SkeletonMetricCard key={m.label} />
          ) : (
            <MetricCard key={m.label} {...m} />
          ),
        )}
      </div>

      {/* Activity Chart Section */}
      {!payoutsQuery.isPending && chartData.length > 0 && (
        <ActivityChart
          title="Completed Payouts Trend"
          data={chartData}
          dataKey="amount"
          color="#f6d100"
        />
      )}

      {/* Two-column feed */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        {eventsQuery.isPending ? (
          <SkeletonListSection rows={5} />
        ) : (
          <div className="bg-[var(--color-neutral-light)] rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100/60 bg-gray-50/50">
              <p className="text-base font-extrabold text-[var(--color-neutral-dark2)]">
                Recent Events
              </p>
              <Link
                href="/admin/events"
                className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-neutral-dark2)] transition-colors flex items-center gap-1.5"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentEvents.length === 0 ? (
                <p className="px-6 py-10 text-sm font-medium text-center text-gray-400">
                  No events yet
                </p>
              ) : (
                recentEvents.map((ev) => (
                  <Link
                    key={ev.eventId}
                    href={`/admin/events/${ev.eventId}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--color-neutral-dark2)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                        {ev.title}
                      </p>
                      <p className="text-xs font-medium text-[var(--color-neutral-dark4)] mt-1 truncate">
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
        )}

        {/* Recent Payouts */}
        {payoutsQuery.isPending ? (
          <SkeletonListSection rows={5} />
        ) : (
          <div className="bg-[var(--color-neutral-light)] rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100/60 bg-gray-50/50">
              <p className="text-base font-extrabold text-[var(--color-neutral-dark2)]">
                Recent Payouts
              </p>
              <Link
                href="/admin/payouts"
                className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-neutral-dark2)] transition-colors flex items-center gap-1.5"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentPayouts.length === 0 ? (
                <p className="px-6 py-10 text-sm font-medium text-center text-gray-400">
                  No payouts yet
                </p>
              ) : (
                recentPayouts.map((p) => (
                  <div
                    key={p.payoutId}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-[var(--color-neutral-dark2)] tabular-nums">
                        {fmtCur(p.amount)}
                      </p>
                      <p className="text-xs font-medium text-[var(--color-neutral-dark4)] mt-1 truncate">
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
        )}
      </div>

      {/* Event status breakdown */}
      {!eventsQuery.isPending && events.length > 0 && (
        <div className="bg-[var(--color-neutral-light)] rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <p className="text-base font-extrabold text-[var(--color-neutral-dark2)] mb-6">
            Event Status Breakdown
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
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
                <div key={s} className="text-center group">
                  <p className="text-3xl font-extrabold text-[var(--color-neutral-dark2)] tabular-nums group-hover:scale-110 transition-transform origin-bottom">
                    {count}
                  </p>
                  <div className="h-2 rounded-full bg-gray-100 mt-3 mb-2 overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${pct}%`,
                        background:
                          s === "APPROVED"
                            ? "linear-gradient(90deg, #f6d100, #ffe866)"
                            : s === "REJECTED" || s === "CANCELLED"
                              ? "linear-gradient(90deg, #ff0000, #ff6666)"
                              : s === "PENDING"
                                ? "linear-gradient(90deg, #8e8e8e, #3d3d3d)"
                                : "linear-gradient(90deg, #9ca3af, #6b7280)",
                      }}
                    />
                  </div>
                  <p className="text-[11px] font-bold tracking-wide uppercase text-[var(--color-neutral-dark4)] leading-tight">
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

export default AdminDashboardContent;
