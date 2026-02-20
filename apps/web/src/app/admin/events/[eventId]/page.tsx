"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Ticket,
  BarChart3,
  Clock,
  User,
  Eye,
  MousePointer,
  TrendingUp,
  CheckCheck,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

// ─── Types matching actual API shapes ────────────────────────────────────────

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

type Ticket = {
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
  tickets: Ticket[];
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

const STATUS_BADGE: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  REJECTED: "bg-red-50 text-red-600 border border-red-200",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  NOT_VIEWED: "bg-gray-100 text-gray-500 border border-gray-200",
  CANCELLATION_REQUESTED:
    "bg-orange-50 text-orange-700 border border-orange-200",
  CANCELLED: "bg-red-50 text-red-400 border border-red-100",
};

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#fff",
    border: "1px solid #f3f4f6",
    borderRadius: 12,
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
  },
  labelStyle: { color: "#1E1E1E", fontWeight: 600 },
  itemStyle: { color: "#3D3D3D" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatTime = (s: string) =>
  new Date(s).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

/** Turn a Record<dateString, number> into sorted chart data */
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
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

  // Load event detail on mount
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
        .then((res) => setAttendeesData(res.data?.data || null))
        .catch(() => setAttendeesData(null))
        .finally(() => setAttendeesLoading(false));
    }
  }, [tab, eventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-[#FFE348]" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-sm text-red-500">
        <AlertCircle className="w-4 h-4" />
        <p>{error || "Event not found"}</p>
      </div>
    );
  }

  const banner =
    event.banner_horizontal || event.banner_square || event.banner_vertical;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/admin/events"
          className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors shrink-0 mt-0.5 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-[#1E1E1E] leading-tight">
            {event.title}
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
            {event.lister?.user?.name ||
              event.lister?.user?.email ||
              "Unknown lister"}
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_BADGE[event.status] || "bg-gray-100 text-gray-500"}`}
            >
              {event.status.replace(/_/g, " ")}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
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
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 sm:px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px whitespace-nowrap ${
              tab === t
                ? "border-[#FFE348] text-[#1E1E1E]"
                : "border-transparent text-gray-400 hover:text-[#1E1E1E]"
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
                value={formatDate(event.date)}
              />
            )}
            {event.time && (
              <InfoCard
                icon={<Clock className="w-4 h-4 text-blue-500" />}
                label="Time"
                value={formatTime(event.time)}
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
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-5 pt-4 pb-2">
                Ticket Types
              </p>
              <div className="divide-y divide-gray-50">
                {event.TicketType.map((tt) => (
                  <div
                    key={tt.ticketTypeId}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1E1E1E]">
                        {tt.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {tt.soldCount} / {tt.quantity} sold
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#1E1E1E]">
                        {formatCurrency(tt.price)}
                      </p>
                      {tt.discountedPrice != null && (
                        <p className="text-xs text-emerald-600 mt-0.5">
                          Disc: {formatCurrency(tt.discountedPrice)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inline analytics summary */}
          {event.EventAnalytics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatMini
                label="Views"
                value={event.EventAnalytics.views}
                accent="text-blue-600"
                bg="bg-blue-50"
              />
              <StatMini
                label="Clicks"
                value={event.EventAnalytics.clicks}
                accent="text-purple-600"
                bg="bg-purple-50"
              />
              <StatMini
                label="Tickets Sold"
                value={event.EventAnalytics.ticketsSold}
                accent="text-amber-600"
                bg="bg-amber-50"
              />
              <StatMini
                label="Revenue"
                value={formatCurrency(event.EventAnalytics.revenue)}
                accent="text-emerald-600"
                bg="bg-emerald-50"
              />
            </div>
          )}

          {event.description && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Description
              </p>
              <div
                className="text-sm text-[#3D3D3D] leading-relaxed"
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
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[#FFE348]" />
            </div>
          ) : !analytics ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <BarChart3 className="w-10 h-10 text-gray-200" />
              <p className="text-sm text-gray-300">
                No analytics data available yet
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<Eye className="w-4 h-4 text-blue-600" />}
                  bg="bg-blue-50"
                  label="Total Views"
                  value={analytics.views?.toLocaleString() || "0"}
                />
                <StatCard
                  icon={<MousePointer className="w-4 h-4 text-purple-600" />}
                  bg="bg-purple-50"
                  label="Total Clicks"
                  value={analytics.clicks?.toLocaleString() || "0"}
                />
                <StatCard
                  icon={<Ticket className="w-4 h-4 text-amber-600" />}
                  bg="bg-amber-50"
                  label="Tickets Sold"
                  value={analytics.ticketsSold?.toLocaleString() || "0"}
                />
                <StatCard
                  icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
                  bg="bg-emerald-50"
                  label="Revenue"
                  value={formatCurrency(analytics.revenue)}
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
                    value={analytics.capacity.toLocaleString()}
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
                  <ChartCard title="Views Over Time">
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
                  </ChartCard>
                )}

              {analytics.salesByDay &&
                Object.keys(analytics.salesByDay).length > 0 && (
                  <ChartCard title="Ticket Sales Over Time">
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
                          fill="#FFE348"
                          radius={[4, 4, 0, 0]}
                          name="Tickets"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

              {analytics.revenueByDay &&
                Object.keys(analytics.revenueByDay).length > 0 && (
                  <ChartCard title="Revenue Over Time">
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
                          formatter={(v: number) => [
                            formatCurrency(v),
                            "Revenue",
                          ]}
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
                  </ChartCard>
                )}
            </>
          )}
        </div>
      )}

      {/* ── Attendees ─────────────────────────────────────────── */}
      {tab === "Attendees" && (
        <div className="space-y-5">
          {attendeesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[#FFE348]" />
            </div>
          ) : !attendeesData ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <Users className="w-10 h-10 text-gray-200" />
              <p className="text-sm text-gray-300">
                No attendee data available
              </p>
            </div>
          ) : (
            <>
              {attendeesData.statistics && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard
                    icon={<Ticket className="w-4 h-4 text-amber-600" />}
                    bg="bg-amber-50"
                    label="Tickets Sold"
                    value={(
                      attendeesData.statistics.totalTicketsSold ?? 0
                    ).toLocaleString()}
                  />
                  <StatCard
                    icon={<CheckCheck className="w-4 h-4 text-emerald-600" />}
                    bg="bg-emerald-50"
                    label="Checked In"
                    value={(
                      attendeesData.statistics.totalCheckedIn ?? 0
                    ).toLocaleString()}
                  />
                  <StatCard
                    icon={<DollarSign className="w-4 h-4 text-blue-600" />}
                    bg="bg-blue-50"
                    label="Revenue"
                    value={formatCurrency(
                      attendeesData.statistics.totalRevenue ?? 0,
                    )}
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
                    className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
                  >
                    {/* Ticket type header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                      <div>
                        <p className="text-sm font-semibold text-[#1E1E1E]">
                          {tt.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {tt.soldCount ?? 0} sold · {tt.checkedInCount ?? 0}{" "}
                          checked in · {formatCurrency(tt.totalRevenue ?? 0)}
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
                        {/* Desktop table — hidden on mobile */}
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
                                  className="hover:bg-[#eff0fb]/40 transition-colors"
                                >
                                  <td className="px-4 py-3">
                                    <p className="text-xs font-mono text-gray-500">
                                      {t.qrCode || t.ticketId.slice(0, 8)}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="text-sm font-medium text-[#1E1E1E]">
                                      {t.buyer?.name || "—"}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {t.buyer?.email || ""}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-[#3D3D3D] font-medium">
                                    {t.quantity}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-[#1E1E1E]">
                                    {formatCurrency(t.totalPrice)}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-gray-400">
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
                                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                        t.checkedIn
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : "bg-gray-100 text-gray-500 border border-gray-200"
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

                        {/* Mobile cards — hidden on desktop */}
                        <div className="sm:hidden divide-y divide-gray-50">
                          {tickets.map((t) => (
                            <div
                              key={t.ticketId}
                              className="px-4 py-3 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[#1E1E1E]">
                                    {t.buyer?.name || "Unknown buyer"}
                                  </p>
                                  {t.buyer?.email && (
                                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                                      {t.buyer.email}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                    t.checkedIn
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-gray-100 text-gray-500 border border-gray-200"
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
                                  <span className="font-semibold text-[#1E1E1E]">
                                    {t.quantity}
                                  </span>
                                </span>
                                <span className="text-xs font-semibold text-[#1E1E1E]">
                                  {formatCurrency(t.totalPrice)}
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

// ─── Small reusable sub-components ───────────────────────────────────────────

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-[#1E1E1E] mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  bg,
  label,
  value,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
      <div
        className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-3`}
      >
        {icon}
      </div>
      <p className="text-xl font-bold text-[#1E1E1E] tabular-nums">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function StatMini({
  label,
  value,
  accent,
  bg,
}: {
  label: string;
  value: string | number;
  accent: string;
  bg: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 text-center">
      <p className={`text-lg font-bold ${accent}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      <p className="text-sm font-bold text-[#1E1E1E] mb-4">{title}</p>
      {children}
    </div>
  );
}
