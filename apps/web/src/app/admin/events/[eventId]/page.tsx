"use client";

import api from "@/lib/api";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCheck,
  Clock,
  DollarSign,
  Eye,
  MapPin,
  MousePointer,
  Ticket,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartCard as ChartCardShared,
  EmptyState,
  InfoCard,
  PageError,
  PageLoading,
  SkeletonListSection,
  SkeletonMetricCard,
  StatCard,
  StatusBadge,
} from "../../_components/admin-components";
import {
  fmtCur,
  fmtDateLong,
  fmtNumber,
  fmtTime,
} from "../../_lib/admin-utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type TicketType = {
  ticketTypeId: string;
  name: string;
  price: number;
  discountedPrice: number | null;
  quantity: number;
  soldCount: number;
};

type EventDetail = {
  eventId: string;
  title: string;
  description: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  status: string;
  canBuy: boolean;
  capacity: number | null;
  banner_horizontal?: string | null;
  banner_vertical?: string | null;
  banner_square?: string | null;
  lister?: { user?: { name?: string | null; email?: string | null } };
  TicketType?: TicketType[];
  EventAnalytics?: {
    views: number;
    clicks: number;
    ticketsSold: number;
    revenue: number;
    conversionRate: number;
  } | null;
};

type Analytics = {
  views: number;
  clicks: number;
  ticketsSold: number;
  revenue: number;
  conversionRate: number;
  total_tickets: number;
  capacity: number | null;
  capacityUtilization: number | null;
  viewsByDay: Record<string, number>;
  salesByDay: Record<string, number>;
  revenueByDay: Record<string, number>;
};

type TicketRecord = {
  ticketId: string;
  qrCode?: string;
  quantity: number;
  totalPrice: number;
  checkedIn?: boolean;
  purchaseDate?: string;
  buyer?: { userId?: string; name?: string; email?: string; phone?: string };
};

type AttendeeTicketType = {
  ticketTypeId: string;
  name: string;
  price: number;
  soldCount: number;
  totalQuantity: number;
  totalRevenue: number;
  checkedInCount: number;
  tickets: TicketRecord[];
};

type AttendeesData = {
  event: { title: string; date: string | null; location: string | null };
  statistics: {
    totalTicketsSold: number;
    totalCheckedIn: number;
    totalRevenue: number;
    checkInRate: string;
  };
  ticketTypes: AttendeeTicketType[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = ["Overview", "Analytics", "Attendees"] as const;
type Tab = (typeof TABS)[number];

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#fff",
    border: "1px solid #f3f4f6",
    borderRadius: 12,
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
  },
  labelStyle: { color: "var(--color-neutral-dark2)", fontWeight: 600 },
  itemStyle: { color: "var(--color-neutral-dark3)" },
};

function recordToChartData(rec: Record<string, number>, valueKey: string) {
  return Object.entries(rec)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date: new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      [valueKey]: value,
    }));
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminEventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId;
  const [tab, setTab] = useState<Tab>("Overview");

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [attendeesData, setAttendeesData] = useState<AttendeesData | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(`/admin/event/${eventId}`)
      .then((res) => setEvent(res.data?.data || null))
      .catch((e) =>
        setError(e?.response?.data?.message || "Failed to load event"),
      )
      .finally(() => setLoading(false));
  }, [eventId]);

  // Lazy-load tab data
  useEffect(() => {
    if (tab === "Analytics" && !analytics) {
      setAnalyticsLoading(true);
      api
        .get(`/admin/event/analytics/${eventId}`)
        .then((res) => setAnalytics(res.data?.data || null))
        .catch(() => setAnalytics(null))
        .finally(() => setAnalyticsLoading(false));
    }
    if (tab === "Attendees" && !attendeesData) {
      setAttendeesLoading(true);
      api
        .get(`/admin/event/attendee/${eventId}`)
        .then((res) => {
          // API returns { data: { success, data: { event, statistics, ticketTypes } } }
          const raw = res.data?.data;
          const inner = raw?.data ?? raw;
          setAttendeesData(inner || null);
        })
        .catch(() => setAttendeesData(null))
        .finally(() => setAttendeesLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, eventId]);

  if (loading) return <PageLoading />;
  if (error || !event)
    return <PageError message={error || "Event not found"} />;

  const banner =
    event.banner_horizontal || event.banner_square || event.banner_vertical;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 pb-24 lg:pb-10">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/admin/events"
          className="p-2 rounded-xl bg-[var(--color-neutral-light)] border border-gray-100 hover:bg-gray-50 transition-colors shrink-0 mt-0.5 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-[var(--color-neutral-dark2)] leading-tight">
            {event.title}
          </h1>
          <p className="text-[var(--color-neutral-dark4)] text-xs sm:text-sm mt-0.5">
            {event.lister?.user?.name ||
              event.lister?.user?.email ||
              "Unknown lister"}
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <StatusBadge status={event.status} type="event" />
            <span
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                event.canBuy
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}
            >
              {event.canBuy ? "Tickets Open" : "Tickets Closed"}
            </span>
          </div>
        </div>
      </div>

      {/* Banner */}
      {banner && (
        <div className="rounded-2xl overflow-hidden h-36 sm:h-44 w-full bg-gray-100 shadow-sm">
          <img
            src={banner}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-none -mx-4 sm:-mx-6 px-4 sm:px-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 sm:px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px whitespace-nowrap ${
              tab === t
                ? "border-[var(--color-primary)] text-[var(--color-neutral-dark2)]"
                : "border-transparent text-gray-400 hover:text-[var(--color-neutral-dark2)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────────── */}
      {tab === "Overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {event.date && (
              <InfoCard
                icon={<Calendar className="w-4 h-4 text-amber-500" />}
                label="Date"
                value={fmtDateLong(event.date)}
              />
            )}
            {event.time && (
              <InfoCard
                icon={<Clock className="w-4 h-4 text-blue-500" />}
                label="Time"
                value={fmtTime(event.time)}
              />
            )}
            {event.location && (
              <InfoCard
                icon={<MapPin className="w-4 h-4 text-red-500" />}
                label="Location"
                value={event.location}
              />
            )}
            <InfoCard
              icon={<User className="w-4 h-4 text-purple-500" />}
              label="Lister"
              value={
                event.lister?.user?.name || event.lister?.user?.email || "—"
              }
            />
            {event.capacity != null && (
              <InfoCard
                icon={<Users className="w-4 h-4 text-green-500" />}
                label="Capacity"
                value={event.capacity.toLocaleString()}
              />
            )}
          </div>

          {/* Ticket Types */}
          {event.TicketType && event.TicketType.length > 0 && (
            <div className="bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-5 pt-4 pb-2">
                Ticket Types
              </p>
              <div className="divide-y divide-gray-50">
                {event.TicketType.map((tt) => {
                  const pct =
                    tt.quantity > 0
                      ? Math.round((tt.soldCount / tt.quantity) * 100)
                      : 0;
                  return (
                    <div
                      key={tt.ticketTypeId}
                      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--color-neutral-dark2)]">
                          {tt.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden max-w-[120px]">
                            <div
                              className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-[var(--color-neutral-dark4)]">
                            {tt.soldCount}/{tt.quantity} sold
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-[var(--color-neutral-dark2)] tabular-nums">
                          {fmtCur(tt.price)}
                        </p>
                        {tt.discountedPrice != null && (
                          <p className="text-xs text-emerald-600 mt-0.5">
                            Disc: {fmtCur(tt.discountedPrice)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inline analytics summary */}
          {event.EventAnalytics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatMini
                label="Views"
                value={fmtNumber(event.EventAnalytics.views)}
                accent="text-blue-600"
                bg="bg-blue-50"
              />
              <StatMini
                label="Clicks"
                value={fmtNumber(event.EventAnalytics.clicks)}
                accent="text-purple-600"
                bg="bg-purple-50"
              />
              <StatMini
                label="Tickets Sold"
                value={fmtNumber(event.EventAnalytics.ticketsSold)}
                accent="text-amber-600"
                bg="bg-amber-50"
              />
              <StatMini
                label="Revenue"
                value={fmtCur(event.EventAnalytics.revenue)}
                accent="text-emerald-600"
                bg="bg-emerald-50"
              />
            </div>
          )}

          {event.description && (
            <div className="bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Description
              </p>
              <div
                className="text-sm text-[var(--color-neutral-dark3)] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Analytics ─────────────────────────────────────────── */}
      {tab === "Analytics" && (
        <div className="space-y-5">
          {analyticsLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonMetricCard key={i} />
                ))}
              </div>
              <SkeletonListSection rows={3} />
            </div>
          ) : !analytics ? (
            <EmptyState
              icon={BarChart3}
              title="No analytics data yet"
              subtitle="Analytics will appear once the event starts getting traffic"
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<Eye className="w-4 h-4 text-blue-600" />}
                  bg="bg-blue-50"
                  label="Total Views"
                  value={fmtNumber(analytics.views)}
                />
                <StatCard
                  icon={<MousePointer className="w-4 h-4 text-purple-600" />}
                  bg="bg-purple-50"
                  label="Total Clicks"
                  value={fmtNumber(analytics.clicks)}
                />
                <StatCard
                  icon={<Ticket className="w-4 h-4 text-amber-600" />}
                  bg="bg-amber-50"
                  label="Tickets Sold"
                  value={fmtNumber(analytics.ticketsSold)}
                />
                <StatCard
                  icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
                  bg="bg-emerald-50"
                  label="Revenue"
                  value={fmtCur(analytics.revenue)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard
                  icon={<TrendingUp className="w-4 h-4 text-orange-600" />}
                  bg="bg-orange-50"
                  label="Conversion Rate"
                  value={`${(analytics.conversionRate || 0).toFixed(2)}%`}
                />
                {analytics.capacity != null && (
                  <StatCard
                    icon={<Users className="w-4 h-4 text-pink-600" />}
                    bg="bg-pink-50"
                    label="Capacity"
                    value={fmtNumber(analytics.capacity)}
                  />
                )}
                {analytics.capacityUtilization != null && (
                  <StatCard
                    icon={<BarChart3 className="w-4 h-4 text-cyan-600" />}
                    bg="bg-cyan-50"
                    label="Capacity Used"
                    value={`${analytics.capacityUtilization.toFixed(1)}%`}
                  />
                )}
              </div>

              {analytics.viewsByDay &&
                Object.keys(analytics.viewsByDay).length > 0 && (
                  <ChartCardShared title="Views Over Time">
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart
                        data={recordToChartData(analytics.viewsByDay, "views")}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#9ca3af", fontSize: 10 }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#9ca3af", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          width={30}
                        />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Line
                          type="monotone"
                          dataKey="views"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCardShared>
                )}

              {analytics.salesByDay &&
                Object.keys(analytics.salesByDay).length > 0 && (
                  <ChartCardShared title="Ticket Sales Over Time">
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart
                        data={recordToChartData(
                          analytics.salesByDay,
                          "tickets",
                        )}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#9ca3af", fontSize: 10 }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#9ca3af", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          width={30}
                        />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Bar
                          dataKey="tickets"
                          fill="var(--color-primary2)"
                          radius={[4, 4, 0, 0]}
                          name="Tickets"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCardShared>
                )}

              {analytics.revenueByDay &&
                Object.keys(analytics.revenueByDay).length > 0 && (
                  <ChartCardShared title="Revenue Over Time">
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart
                        data={recordToChartData(
                          analytics.revenueByDay,
                          "revenue",
                        )}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#9ca3af", fontSize: 10 }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#9ca3af", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          width={40}
                          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          {...TOOLTIP_STYLE}
                          formatter={(v: number) => [fmtCur(v), "Revenue"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCardShared>
                )}
            </>
          )}
        </div>
      )}

      {/* ── Attendees ─────────────────────────────────────────── */}
      {tab === "Attendees" && (
        <div className="space-y-5">
          {attendeesLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonMetricCard key={i} />
                ))}
              </div>
              <SkeletonListSection rows={4} />
            </div>
          ) : !attendeesData ? (
            <EmptyState
              icon={Users}
              title="No attendee data"
              subtitle="Attendee information will be available once tickets are sold"
            />
          ) : (
            <>
              {attendeesData.statistics && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard
                    icon={<Ticket className="w-4 h-4 text-amber-600" />}
                    bg="bg-amber-50"
                    label="Tickets Sold"
                    value={fmtNumber(
                      attendeesData.statistics.totalTicketsSold ?? 0,
                    )}
                  />
                  <StatCard
                    icon={<CheckCheck className="w-4 h-4 text-emerald-600" />}
                    bg="bg-emerald-50"
                    label="Checked In"
                    value={fmtNumber(
                      attendeesData.statistics.totalCheckedIn ?? 0,
                    )}
                  />
                  <StatCard
                    icon={<DollarSign className="w-4 h-4 text-blue-600" />}
                    bg="bg-blue-50"
                    label="Revenue"
                    value={fmtCur(attendeesData.statistics.totalRevenue ?? 0)}
                  />
                  <StatCard
                    icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
                    bg="bg-purple-50"
                    label="Check-in Rate"
                    value={attendeesData.statistics.checkInRate ?? "0%"}
                  />
                </div>
              )}

              {(attendeesData.ticketTypes ?? []).map((tt) => {
                const tickets = tt.tickets ?? [];
                return (
                  <div
                    key={tt.ticketTypeId}
                    className="bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
                  >
                    {/* Ticket type header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-neutral-dark2)]">
                          {tt.name}
                        </p>
                        <p className="text-xs text-[var(--color-neutral-dark4)] mt-0.5">
                          {tt.soldCount ?? 0} sold · {tt.checkedInCount ?? 0}{" "}
                          checked in · {fmtCur(tt.totalRevenue ?? 0)}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2.5 py-1 rounded-full">
                        {tickets.length} record{tickets.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {tickets.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-300 text-center">
                        No tickets purchased for this type
                      </p>
                    ) : (
                      <>
                        {/* Desktop table */}
                        <div className="hidden sm:block overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-100 bg-gray-50">
                                {[
                                  "Ticket ID",
                                  "Buyer",
                                  "Qty",
                                  "Amount",
                                  "Date",
                                  "Status",
                                ].map((h) => (
                                  <th
                                    key={h}
                                    className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {tickets.map((t) => (
                                <tr
                                  key={t.ticketId}
                                  className="hover:bg-[var(--background)]/40 transition-colors"
                                >
                                  <td className="px-4 py-3">
                                    <p className="text-xs font-mono text-gray-500">
                                      {t.qrCode || t.ticketId.slice(0, 8)}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="text-sm font-medium text-[var(--color-neutral-dark2)]">
                                      {t.buyer?.name || "—"}
                                    </p>
                                    <p className="text-xs text-[var(--color-neutral-dark4)] mt-0.5">
                                      {t.buyer?.email || ""}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-[var(--color-neutral-dark3)] font-medium tabular-nums">
                                    {t.quantity}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-[var(--color-neutral-dark2)] tabular-nums">
                                    {fmtCur(t.totalPrice)}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-[var(--color-neutral-dark4)]">
                                    {t.purchaseDate
                                      ? new Date(
                                          t.purchaseDate,
                                        ).toLocaleDateString("en-IN", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })
                                      : "—"}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                        t.checkedIn
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-gray-100 text-gray-500 border-gray-200"
                                      }`}
                                    >
                                      {t.checkedIn ? "Checked In" : "Pending"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="sm:hidden divide-y divide-gray-50">
                          {tickets.map((t) => (
                            <div
                              key={t.ticketId}
                              className="px-4 py-3 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[var(--color-neutral-dark2)]">
                                    {t.buyer?.name || "Unknown buyer"}
                                  </p>
                                  {t.buyer?.email && (
                                    <p className="text-xs text-[var(--color-neutral-dark4)] mt-0.5 truncate">
                                      {t.buyer.email}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                    t.checkedIn
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-gray-100 text-gray-500 border-gray-200"
                                  }`}
                                >
                                  {t.checkedIn ? "In" : "Pending"}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 flex-wrap">
                                <span className="text-xs font-mono text-gray-400">
                                  {t.qrCode || t.ticketId.slice(0, 8)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Qty:{" "}
                                  <span className="font-semibold text-[var(--color-neutral-dark2)]">
                                    {t.quantity}
                                  </span>
                                </span>
                                <span className="text-xs font-semibold text-[var(--color-neutral-dark2)] tabular-nums">
                                  {fmtCur(t.totalPrice)}
                                </span>
                                {t.purchaseDate && (
                                  <span className="text-xs text-gray-400">
                                    {new Date(
                                      t.purchaseDate,
                                    ).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Local sub-component ─────────────────────────────────────────────────────

function StatMini({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
  bg: string;
}) {
  return (
    <div className="bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm p-4 text-center">
      <p className={`text-lg font-bold ${accent} tabular-nums`}>{value}</p>
      <p className="text-xs text-[var(--color-neutral-dark4)] mt-0.5">
        {label}
      </p>
    </div>
  );
}
