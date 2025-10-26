"use client";

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useParams } from "next/navigation";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Eye,
  DollarSign,
  Ticket,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Calendar,
  MapPin,
  RefreshCw,
  Users,
  Target,
  MousePointerClick,
  BarChart3,
} from "lucide-react";
import {
  fetchEventAnalytics,
  fetchListerEventDetails,
  clearAnalyticsError,
} from "@/lib/features/eventsSlice";

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

  // Format time from 24h to 12h format
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

  // Calculate ticket data from event
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

  // Derived metrics from analytics data only
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

  // Engagement funnel data
  const engagementData = analytics
    ? [
        { name: "Total Views", value: analytics.views, fill: "#3B82F6" },
        { name: "Converted", value: analytics.ticketsSold, fill: "#10B981" },
        { name: "Did Not Convert", value: nonConverted, fill: "#EF4444" },
      ]
    : [];

  // Conversion breakdown
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

  const StatCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    prefix = "",
    suffix = "",
    bgColor = "bg-yellow-50",
    iconColor = "text-yellow-600",
  }: any) => {
    return (
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className={`p-2 sm:p-3 ${bgColor} rounded-lg`}>
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-gray-600 text-xs sm:text-sm font-medium">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
            {prefix}
            {typeof value === "number" ? value.toLocaleString() : value}
            {suffix}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    );
  };

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

  if (analyticsError || eventError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <button
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
              onClick={handleRefresh}
              className="px-4 sm:px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium inline-flex items-center gap-2 text-sm sm:text-base"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  if (!analytics || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <button
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

  return (
    <div className="p-3 sm:p-4 md:p-6 mb-40">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <button
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
                </div>
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

        {/* Key Metrics - The 4 core data points */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={Eye}
            title="Total Views"
            value={analytics.views}
            subtitle={`${analytics.views} ${analytics.views === 1 ? "person" : "people"} viewed this event`}
            bgColor="bg-blue-50"
            iconColor="text-blue-600"
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
            subtitle={`From ${analytics.ticketsSold} ticket ${analytics.ticketsSold === 1 ? "sale" : "sales"}`}
            bgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <StatCard
            icon={Target}
            title="Conversion Rate"
            value={analytics.conversionRate.toFixed(1)}
            suffix="%"
            subtitle={`${analytics.ticketsSold} of ${analytics.views} converted`}
            bgColor="bg-yellow-50"
            iconColor="text-yellow-600"
          />
        </div>

        {/* Derived Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                <MousePointerClick className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
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

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Conversion Breakdown */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
              Conversion Breakdown
            </h3>
            {conversionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={conversionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {conversionData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                No data available
              </div>
            )}
          </div>

          {/* Engagement Funnel */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
              Engagement Overview
            </h3>
            {engagementData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {engagementData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                No data available
              </div>
            )}
          </div>

          {/* Ticket Type Distribution */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
              Ticket Type Distribution
            </h3>
            {ticketTypeData.length > 0 &&
            !hasUnlimitedTickets &&
            totalTickets > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={ticketTypeData.filter((t: any) => t.quantity > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="quantity"
                  >
                    {ticketTypeData
                      .filter((t: any) => t.quantity > 0)
                      .map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-xs sm:text-sm text-center px-4">
                {hasUnlimitedTickets || totalTickets === 0
                  ? "Not available for unlimited capacity events"
                  : "No ticket types available"}
              </div>
            )}
          </div>

          {/* Revenue Potential */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
              Revenue Potential by Type
            </h3>
            {ticketTypeData.length > 0 && totalPotentialRevenue > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={ticketTypeData.filter(
                    (t: any) => t.potentialRevenue > 0,
                  )}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="potentialRevenue"
                    fill="#F59E0B"
                    radius={[8, 8, 0, 0]}
                    name="Potential Revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-xs sm:text-sm text-center px-4">
                {hasUnlimitedTickets || totalTickets === 0
                  ? "Not available for unlimited capacity events"
                  : "No data available"}
              </div>
            )}
          </div>
        </div>

        {/* Ticket Types Detail Table */}
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
                      Quantity
                    </th>
                    <th className="text-right py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                      Potential Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {event.ticketTypes?.map((ticket: any, index: number) => (
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
                      <td className="py-3 sm:py-4 px-3 sm:px-4 text-right font-semibold text-gray-900 text-xs sm:text-sm">
                        {ticket.quantity && ticket.quantity > 0 ? (
                          `₹${((ticket.discountedPrice || ticket.price) * ticket.quantity).toLocaleString()}`
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-yellow-50 font-semibold">
                    <td className="py-3 sm:py-4 px-3 sm:px-4 text-gray-900 text-xs sm:text-sm">
                      Total
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4"></td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 text-right text-gray-900 text-xs sm:text-sm">
                      {hasUnlimitedTickets || totalTickets === 0 ? (
                        <span className="text-purple-600">Unlimited</span>
                      ) : (
                        totalTickets
                      )}
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

        {/* Key Insights Summary */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 sm:p-6 border border-yellow-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
            Key Insights
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
          </div>

          {/* Actionable recommendations */}
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
