"use client";

import {
  clearAnalyticsError,
  fetchEventAnalytics,
  fetchListerEventDetails,
} from "@/lib/features/eventsSlice";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  Loader2,
  MapPin,
  MousePointerClick,
  RefreshCw,
  Target,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

const EventViewsAreaChart = dynamic(
  () =>
    import("./_components/event-charts").then((mod) => mod.EventViewsAreaChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] w-full bg-gray-50 flex items-center justify-center animate-pulse rounded-xl text-xs text-gray-400">
        Loading chart...
      </div>
    ),
  },
);
const EventSalesComposedChart = dynamic(
  () =>
    import("./_components/event-charts").then(
      (mod) => mod.EventSalesComposedChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] w-full bg-gray-50 flex items-center justify-center animate-pulse rounded-xl text-xs text-gray-400">
        Loading chart...
      </div>
    ),
  },
);
const EventConversionPieChart = dynamic(
  () =>
    import("./_components/event-charts").then(
      (mod) => mod.EventConversionPieChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[250px] w-full bg-gray-50 flex items-center justify-center animate-pulse rounded-xl text-xs text-gray-400">
        Loading chart...
      </div>
    ),
  },
);
const EventEngagementBarChart = dynamic(
  () =>
    import("./_components/event-charts").then(
      (mod) => mod.EventEngagementBarChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[250px] w-full bg-gray-50 flex items-center justify-center animate-pulse rounded-xl text-xs text-gray-400">
        Loading chart...
      </div>
    ),
  },
);
const EventTicketTypePieChart = dynamic(
  () =>
    import("./_components/event-charts").then(
      (mod) => mod.EventTicketTypePieChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[250px] w-full bg-gray-50 flex items-center justify-center animate-pulse rounded-xl text-xs text-gray-400">
        Loading chart...
      </div>
    ),
  },
);
const EventRevenuePotentialBarChart = dynamic(
  () =>
    import("./_components/event-charts").then(
      (mod) => mod.EventRevenuePotentialBarChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[250px] w-full bg-gray-50 flex items-center justify-center animate-pulse rounded-xl text-xs text-gray-400">
        Loading chart...
      </div>
    ),
  },
);

const EventAnalytics = () => {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.eventId as string;
  const dispatch = useDispatch();

  const {
    byEventId,
    loadingEventId,
    error: analyticsError,
  } = useSelector((state: any) => state.events.analytics);
  const {
    byId: eventsById,
    loadingId: eventLoadingId,
    error: eventError,
  } = useSelector((state: any) => state.events.details);

  const analytics = eventId ? byEventId[eventId] : null;
  const event = eventId ? eventsById[eventId] : null;
  const isLoadingAnalytics = loadingEventId === eventId;
  const isLoadingEvent = eventLoadingId === eventId;
  const isLoading = isLoadingAnalytics || isLoadingEvent;

  useEffect(() => {
    if (eventId) {
      dispatch(fetchEventAnalytics({ eventId }) as any);
      if (!event) {
        dispatch(fetchListerEventDetails({ eventId }) as any);
      }
    }
  }, [eventId]);

  useEffect(() => {
    return () => {
      dispatch(clearAnalyticsError() as any);
    };
  }, [dispatch]);

  const formatTime = (time: string) => {
    if (!time) return "";
    try {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  if (!eventId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 sm:p-6">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium text-sm sm:text-base">
            Invalid event ID
          </p>
        </div>
      </div>
    );
  }

  // ── Ticket type data from event details ──────────────────────────────────────
  const ticketTypeData =
    event?.ticketTypes?.map((ticket: any) => ({
      name: ticket.name,
      quantity: ticket.quantity || 0,
      potentialRevenue:
        ticket.quantity && ticket.quantity > 0
          ? (ticket.discountedPrice || ticket.price) * ticket.quantity
          : 0,
      price: ticket.discountedPrice || ticket.price,
      isUnlimited: !ticket.quantity || ticket.quantity === 0,
    })) || [];

  const totalTickets = ticketTypeData.reduce(
    (sum: number, t: any) => sum + t.quantity,
    0,
  );
  const hasUnlimitedTickets = ticketTypeData.some((t: any) => t.isUnlimited);
  const totalPotentialRevenue = ticketTypeData.reduce(
    (sum: number, t: any) => sum + t.potentialRevenue,
    0,
  );

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const soldPercentage =
    analytics && totalTickets > 0 && !hasUnlimitedTickets
      ? (analytics.ticketsSold / totalTickets) * 100
      : 0;
  const remainingTickets = hasUnlimitedTickets
    ? null
    : analytics && totalTickets > 0
      ? Math.max(0, totalTickets - analytics.ticketsSold)
      : totalTickets;
  const avgTicketPrice =
    analytics && analytics.ticketsSold > 0
      ? analytics.revenue / analytics.ticketsSold
      : 0;
  const revenuePerView =
    analytics && analytics.views > 0 ? analytics.revenue / analytics.views : 0;
  const viewsPerSale =
    analytics && analytics.ticketsSold > 0
      ? analytics.views / analytics.ticketsSold
      : 0;
  const nonConverted = analytics ? analytics.views - analytics.ticketsSold : 0;
  const clickThroughRate =
    analytics && analytics.views > 0
      ? parseFloat(((analytics.clicks / analytics.views) * 100).toFixed(2))
      : 0;
  const checkoutConversionRate =
    analytics && analytics.clicks > 0
      ? parseFloat(
          ((analytics.ticketsSold / analytics.clicks) * 100).toFixed(1),
        )
      : 0;

  // ── Time-series chart data ───────────────────────────────────────────────────
  const allDates = Object.keys({
    ...(analytics?.viewsByDay || {}),
    ...(analytics?.clicksByDay || {}),
    ...(analytics?.salesByDay || {}),
    ...(analytics?.revenueByDay || {}),
  }).sort();

  const timeSeriesData = allDates.map((date) => ({
    date: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    fullDate: date,
    views: (analytics?.viewsByDay as Record<string, number>)?.[date] || 0,
    clicks: (analytics?.clicksByDay as Record<string, number>)?.[date] || 0,
    sales: (analytics?.salesByDay as Record<string, number>)?.[date] || 0,
    revenue: (analytics?.revenueByDay as Record<string, number>)?.[date] || 0,
  }));

  const xAxisInterval =
    timeSeriesData.length > 30
      ? Math.ceil(timeSeriesData.length / 10) - 1
      : timeSeriesData.length > 14
        ? 3
        : 1;

  // ── Actual sales by ticket type (from ticketTypesSalesByDay) ─────────────────
  const ticketTypeSalesMap: Record<
    string,
    { name: string; quantity: number; revenue: number }
  > = {};
  if (analytics?.ticketTypesSalesByDay) {
    for (const dayData of Object.values(
      analytics.ticketTypesSalesByDay as Record<string, any>,
    )) {
      for (const [, data] of Object.entries(dayData as Record<string, any>)) {
        const key = (data as any).name as string;
        if (!ticketTypeSalesMap[key]) {
          ticketTypeSalesMap[key] = { name: key, quantity: 0, revenue: 0 };
        }
        ticketTypeSalesMap[key].quantity += (data as any).quantity || 0;
        ticketTypeSalesMap[key].revenue += (data as any).revenue || 0;
      }
    }
  }
  const actualTicketSales = Object.values(ticketTypeSalesMap);

  // ── Chart data ───────────────────────────────────────────────────────────────
  const engagementData = analytics
    ? [
        { name: "Total Views", value: analytics.views, fill: "#3B82F6" },
        { name: "Converted", value: analytics.ticketsSold, fill: "#10B981" },
        { name: "Did Not Convert", value: nonConverted, fill: "#EF4444" },
      ]
    : [];

  const conversionData = analytics
    ? [
        { name: "Converted", value: analytics.conversionRate, fill: "#10B981" },
        {
          name: "Not Converted",
          value: 100 - analytics.conversionRate,
          fill: "#E5E7EB",
        },
      ]
    : [];

  const COLORS = ["#FCD34D", "#FBBF24", "#F59E0B", "#D97706", "#B45309"];

  // ── Sub-components ───────────────────────────────────────────────────────────
  const StatCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    prefix = "",
    suffix = "",
    bgColor = "bg-yellow-50",
    iconColor = "text-yellow-600",
  }: any) => (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className={`p-2 sm:p-3 ${bgColor} rounded-lg`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-gray-600 text-xs sm:text-sm font-medium">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
          {prefix}
          {typeof value === "number" ? value.toLocaleString() : value}
          {suffix}
        </p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-1 sm:mb-2 text-xs sm:text-sm">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-xs sm:text-sm"
              style={{ color: entry.color || entry.fill }}
            >
              {entry.name}:{" "}
              <span className="font-semibold">
                {entry.name?.toLowerCase().includes("revenue") ||
                entry.name?.toLowerCase().includes("price")
                  ? "₹"
                  : ""}
                {typeof entry.value === "number"
                  ? entry.value.toLocaleString()
                  : entry.value}
                {entry.name?.toLowerCase().includes("rate") ? "%" : ""}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleRefresh = () => {
    if (eventId) {
      dispatch(fetchEventAnalytics({ eventId }) as any);
      dispatch(fetchListerEventDetails({ eventId }) as any);
    }
  };

  // ── Error state ───────────────────────────────────────────────────────────────
  if (analyticsError || eventError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors font-medium text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            Back
          </button>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 sm:p-8 text-center">
            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              Failed to Load Analytics
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              {analyticsError || eventError}
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-4 sm:px-6 py-2 bg-[#FFE348] text-gray-900 rounded-lg hover:bg-yellow-300 transition-colors font-medium inline-flex items-center gap-2 text-sm sm:text-base"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium text-sm sm:text-base">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (!analytics || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors font-medium text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            Back
          </button>
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 text-center">
            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              No Analytics Data
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Analytics data is not available for this event.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-3 sm:p-4 md:p-6 mb-40">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all font-medium text-sm sm:text-base"
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-3 h-3 sm:w-4 sm:h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 break-words">
                  {event.title}
                </h1>
                <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                  {event.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">
                        {new Date(event.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </span>
                  )}
                  {event.time && (
                    <span className="text-gray-600">
                      {formatTime(event.time)}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </span>
                  )}
                  {analytics.lastUpdated && (
                    <span className="flex items-center gap-1 text-gray-400">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span>
                        Updated{" "}
                        {new Date(analytics.lastUpdated).toLocaleString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                    </span>
                  )}
                </div>

                {/* Capacity utilization bar */}
                {analytics.capacity &&
                  analytics.capacityUtilization !== null && (
                    <div className="mt-3 sm:mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-600">
                          Capacity Utilization
                        </span>
                        <span className="text-xs font-semibold text-gray-900">
                          {analytics.ticketsSold} / {analytics.capacity} seats (
                          {analytics.capacityUtilization?.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, analytics.capacityUtilization || 0)}%`,
                            backgroundColor:
                              (analytics.capacityUtilization || 0) >= 80
                                ? "#10B981"
                                : (analytics.capacityUtilization || 0) >= 40
                                  ? "#F59E0B"
                                  : "#FFE348",
                          }}
                        />
                      </div>
                    </div>
                  )}
              </div>

              {event.status && (
                <span
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium h-fit flex-shrink-0 ${
                    event.status === "published"
                      ? "bg-green-100 text-green-700"
                      : event.status === "draft"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Core stat cards (6 cards) ───────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <StatCard
            icon={Eye}
            title="Total Views"
            value={analytics.views}
            subtitle={`${analytics.views === 1 ? "person" : "people"} viewed`}
            bgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            icon={MousePointerClick}
            title="CTA Clicks"
            value={analytics.clicks}
            subtitle={`${clickThroughRate}% click-through`}
            bgColor="bg-violet-50"
            iconColor="text-violet-600"
          />
          <StatCard
            icon={Ticket}
            title="Tickets Sold"
            value={analytics.ticketsSold}
            subtitle={
              hasUnlimitedTickets || totalTickets === 0
                ? "Unlimited capacity"
                : `${remainingTickets} of ${totalTickets} remaining`
            }
            bgColor="bg-purple-50"
            iconColor="text-purple-600"
          />
          <StatCard
            icon={DollarSign}
            title="Revenue"
            value={analytics.revenue}
            prefix="₹"
            subtitle={`From ${analytics.ticketsSold} ${analytics.ticketsSold === 1 ? "sale" : "sales"}`}
            bgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <StatCard
            icon={Target}
            title="Conversion"
            value={analytics.conversionRate.toFixed(1)}
            suffix="%"
            subtitle={`${analytics.ticketsSold} of ${analytics.views} converted`}
            bgColor="bg-yellow-50"
            iconColor="text-yellow-600"
          />
          <StatCard
            icon={TrendingUp}
            title="Checkout CVR"
            value={analytics.clicks > 0 ? `${checkoutConversionRate}%` : "—"}
            subtitle={
              analytics.clicks > 0
                ? `${analytics.ticketsSold} of ${analytics.clicks} clicks`
                : "No clicks yet"
            }
            bgColor="bg-orange-50"
            iconColor="text-orange-600"
          />
        </div>

        {/* ── Derived metric cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-orange-50 rounded-lg flex-shrink-0">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Avg Ticket Price
              </p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {analytics.ticketsSold > 0
                ? `₹${avgTicketPrice.toFixed(0)}`
                : "₹0"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.ticketsSold > 0 ? "Per ticket sold" : "No sales yet"}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-indigo-50 rounded-lg flex-shrink-0">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Revenue Per View
              </p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {analytics.views > 0 ? `₹${revenuePerView.toFixed(2)}` : "₹0"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.views > 0 ? "Efficiency metric" : "No views yet"}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-pink-50 rounded-lg flex-shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Views Per Sale
              </p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {analytics.ticketsSold > 0 ? viewsPerSale.toFixed(1) : "0"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.ticketsSold > 0
                ? "Views needed per sale"
                : "No sales yet"}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-red-50 rounded-lg flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Non-Converted
              </p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {nonConverted.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.views > 0
                ? `${((nonConverted / analytics.views) * 100).toFixed(1)}% of viewers`
                : "No views yet"}
            </p>
          </div>
        </div>

        {/* ── Views & Clicks over time ─────────────────────────────────────── */}
        {timeSeriesData.length > 0 && (
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                Views &amp; Clicks Over Time
              </h3>
              <span className="text-xs text-gray-400">
                {timeSeriesData.length} days
              </span>
            </div>
            <EventViewsAreaChart
              data={timeSeriesData}
              xAxisInterval={xAxisInterval}
              CustomTooltip={CustomTooltip}
            />
          </div>
        )}

        {/* ── Sales & Revenue over time ────────────────────────────────────── */}
        {timeSeriesData.length > 0 && (
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                Sales &amp; Revenue Over Time
              </h3>
              <span className="text-xs text-gray-400">
                {timeSeriesData.filter((d) => d.sales > 0).length} days with
                sales
              </span>
            </div>
            <EventSalesComposedChart
              data={timeSeriesData}
              xAxisInterval={xAxisInterval}
              CustomTooltip={CustomTooltip}
            />
          </div>
        )}

        {/* ── Conversion & Engagement charts ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
              Conversion Breakdown
            </h3>
            {conversionData.length > 0 ? (
              <EventConversionPieChart
                data={conversionData}
                CustomTooltip={CustomTooltip}
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                No data available
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
              Engagement Overview
            </h3>
            {engagementData.length > 0 ? (
              <EventEngagementBarChart
                data={engagementData}
                CustomTooltip={CustomTooltip}
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                No data available
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
              Ticket Type Distribution
            </h3>
            {ticketTypeData.length > 0 &&
            !hasUnlimitedTickets &&
            totalTickets > 0 ? (
              <EventTicketTypePieChart
                data={ticketTypeData}
                COLORS={COLORS}
                CustomTooltip={CustomTooltip}
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-xs sm:text-sm text-center px-4">
                {hasUnlimitedTickets || totalTickets === 0
                  ? "Not available for unlimited capacity events"
                  : "No ticket types available"}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
              Revenue Potential by Type
            </h3>
            {ticketTypeData.length > 0 && totalPotentialRevenue > 0 ? (
              <EventRevenuePotentialBarChart
                data={ticketTypeData}
                CustomTooltip={CustomTooltip}
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-xs sm:text-sm text-center px-4">
                {hasUnlimitedTickets || totalTickets === 0
                  ? "Not available for unlimited capacity events"
                  : "No data available"}
              </div>
            )}
          </div>
        </div>

        {/* ── Ticket types detail table (with actual sales) ────────────────── */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
            Ticket Types Detail
          </h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">
                      Ticket Type
                    </th>
                    <th className="text-right py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">
                      Price
                    </th>
                    <th className="text-right py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                      Total Qty
                    </th>
                    <th className="text-right py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                      Sold
                    </th>
                    <th className="text-right py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                      Actual Revenue
                    </th>
                    <th className="text-right py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                      Potential Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {event.ticketTypes?.map((ticket: any, index: number) => {
                    const salesData = actualTicketSales.find(
                      (s) => s.name === ticket.name,
                    );
                    return (
                      <tr
                        key={ticket.ticketTypeId || index}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 sm:py-4 px-3 sm:px-4">
                          <div>
                            <p className="font-medium text-gray-900 text-xs sm:text-sm">
                              {ticket.name}
                            </p>
                            {ticket.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {ticket.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right">
                          <div>
                            <p className="font-semibold text-gray-900 text-xs sm:text-sm whitespace-nowrap">
                              ₹
                              {(
                                ticket.discountedPrice || ticket.price
                              ).toLocaleString()}
                            </p>
                            {ticket.discountedPrice && (
                              <p className="text-xs text-gray-500 line-through whitespace-nowrap">
                                ₹{ticket.price.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right font-medium text-gray-900 text-xs sm:text-sm">
                          {ticket.quantity || (
                            <span className="text-purple-600">Unlimited</span>
                          )}
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right text-xs sm:text-sm">
                          <span
                            className={
                              salesData && salesData.quantity > 0
                                ? "font-semibold text-green-700"
                                : "text-gray-400"
                            }
                          >
                            {salesData ? salesData.quantity : 0}
                          </span>
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right font-semibold text-xs sm:text-sm">
                          <span
                            className={
                              salesData && salesData.revenue > 0
                                ? "text-green-700"
                                : "text-gray-400"
                            }
                          >
                            {salesData
                              ? `₹${salesData.revenue.toLocaleString()}`
                              : "₹0"}
                          </span>
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right font-semibold text-gray-900 text-xs sm:text-sm">
                          {ticket.quantity && ticket.quantity > 0 ? (
                            `₹${((ticket.discountedPrice || ticket.price) * ticket.quantity).toLocaleString()}`
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-yellow-50 font-semibold">
                    <td className="py-3 sm:py-4 px-3 sm:px-4 text-gray-900 text-xs sm:text-sm">
                      Total
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4" />
                    <td className="py-3 sm:py-4 px-3 sm:px-4 text-right text-gray-900 text-xs sm:text-sm">
                      {hasUnlimitedTickets || totalTickets === 0 ? (
                        <span className="text-purple-600">Unlimited</span>
                      ) : (
                        totalTickets
                      )}
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 text-right text-green-700 text-xs sm:text-sm">
                      {actualTicketSales.reduce((s, t) => s + t.quantity, 0)}
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 text-right text-green-700 text-xs sm:text-sm">
                      ₹
                      {actualTicketSales
                        .reduce((s, t) => s + t.revenue, 0)
                        .toLocaleString()}
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 text-right text-gray-900 text-xs sm:text-sm">
                      {totalPotentialRevenue > 0 ? (
                        `₹${totalPotentialRevenue.toLocaleString()}`
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* ── Key Insights ────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 sm:p-6 border border-yellow-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
            Key Insights
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">
                Conversion Efficiency
              </p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {analytics.conversionRate >= 15
                  ? "Excellent 🎯"
                  : analytics.conversionRate >= 10
                    ? "Good 👍"
                    : analytics.conversionRate >= 5
                      ? "Average 📊"
                      : analytics.conversionRate > 0
                        ? "Needs Work 📈"
                        : "No Conversions ⏳"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.conversionRate.toFixed(1)}% conversion rate
              </p>
            </div>

            <div className="bg-white rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">
                Sales Velocity
              </p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {hasUnlimitedTickets || totalTickets === 0
                  ? analytics.ticketsSold >= 100
                    ? "High 🔥"
                    : analytics.ticketsSold >= 50
                      ? "Moderate 📊"
                      : analytics.ticketsSold >= 10
                        ? "Low 📉"
                        : analytics.ticketsSold > 0
                          ? "Very Low 🐢"
                          : "Not Started ⏸️"
                  : soldPercentage >= 75
                    ? "High 🔥"
                    : soldPercentage >= 50
                      ? "Moderate 📊"
                      : soldPercentage >= 25
                        ? "Low 📉"
                        : soldPercentage > 0
                          ? "Very Low 🐢"
                          : "Not Started ⏸️"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {hasUnlimitedTickets || totalTickets === 0
                  ? `${analytics.ticketsSold} tickets sold`
                  : `${soldPercentage.toFixed(1)}% of capacity sold`}
              </p>
            </div>

            <div className="bg-white rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">
                Revenue Efficiency
              </p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {analytics.views > 0 && revenuePerView > 50
                  ? "High Value 💰"
                  : analytics.views > 0 && revenuePerView > 20
                    ? "Good Value 💵"
                    : analytics.views > 0 && revenuePerView > 0
                      ? "Low Value 💳"
                      : "No Revenue 📭"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ₹{revenuePerView.toFixed(2)} per view
              </p>
            </div>

            <div className="bg-white rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">
                Click Quality
              </p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {analytics.clicks === 0
                  ? "No Clicks ⏳"
                  : checkoutConversionRate >= 50
                    ? "High Intent 🎯"
                    : checkoutConversionRate >= 20
                      ? "Good Intent 👍"
                      : checkoutConversionRate > 0
                        ? "Low Intent 📊"
                        : "Exploring 👀"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.clicks > 0
                  ? `${checkoutConversionRate}% checkout rate`
                  : `${clickThroughRate}% CTR from views`}
              </p>
            </div>
          </div>

          {/* Recommendations */}
          {analytics.views > 0 && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-yellow-200">
              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
                💡 Recommendations:
              </p>
              <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
                {analytics.conversionRate < 5 && (
                  <li>
                    • Your conversion rate is low. Consider improving your event
                    description or adjusting ticket prices.
                  </li>
                )}
                {analytics.views > 100 && analytics.ticketsSold < 10 && (
                  <li>
                    • You have good visibility but low sales. Review your ticket
                    pricing or add early bird offers.
                  </li>
                )}
                {!hasUnlimitedTickets &&
                  totalTickets > 0 &&
                  soldPercentage > 75 && (
                    <li>
                      • Great job! You're close to selling out. Consider
                      promoting urgency in your marketing.
                    </li>
                  )}
                {analytics.ticketsSold > 0 && viewsPerSale > 50 && (
                  <li>
                    • It takes {viewsPerSale.toFixed(0)} views to make a sale.
                    Consider optimizing your event page.
                  </li>
                )}
                {analytics.views < 50 && (
                  <li>
                    • Focus on increasing visibility. Share your event on social
                    media and with your network.
                  </li>
                )}
                {analytics.clicks > 0 && checkoutConversionRate < 10 && (
                  <li>
                    • People are clicking but not buying. Check if the checkout
                    experience is smooth or if pricing needs revision.
                  </li>
                )}
                {clickThroughRate < 1 && analytics.views > 50 && (
                  <li>
                    • Low click-through rate ({clickThroughRate}%). Make your
                    call-to-action more prominent on the event page.
                  </li>
                )}
                {(hasUnlimitedTickets || totalTickets === 0) &&
                  analytics.ticketsSold > 0 && (
                    <li>
                      • With unlimited capacity, focus on maximizing reach and
                      conversions to grow sales.
                    </li>
                  )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventAnalytics;
