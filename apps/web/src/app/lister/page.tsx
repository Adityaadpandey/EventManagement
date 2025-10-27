"use client";

import React, { useEffect, useMemo, useCallback } from "react";
import {
  BarChart3,
  Ticket,
  Calendar,
  DollarSign,
  Users,
  Edit2,
  Building2,
  Plus,
  Eye,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
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
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  fetchMyLister,
  fetchListerAnalytics,
} from "@/lib/features/listerSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

const ListerDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentLister, analytics, loading, error } = useAppSelector(
    (state) => state.lister,
  );

  useEffect(() => {
    dispatch(fetchMyLister());
    dispatch(fetchListerAnalytics());
  }, [dispatch]);

  // Memoized formatting functions
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  const formatNumber = useCallback((num: number): string => {
    return (num || 0).toLocaleString();
  }, []);

  // Memoized calculations for stats
  const statsData = useMemo(() => {
    const revenue =
      currentLister?.ListerAnalytics?.totalRevenue ||
      analytics?.totalRevenue ||
      0;
    const events =
      currentLister?.ListerAnalytics?.totalEvents ||
      analytics?.totalEvents ||
      0;
    const tickets =
      currentLister?.ListerAnalytics?.totalTicketsSold ||
      analytics?.totalTicketsSold ||
      0;
    const avg = events > 0 ? Math.round(tickets / events) : 0;

    return {
      totalRevenue: revenue,
      totalEvents: events,
      totalTicketsSold: tickets,
      avgAttendance: avg,
    };
  }, [currentLister, analytics]);

  // Analytics visualizations based on the 3 available fields
  const analyticsCharts = useMemo(() => {
    const { totalRevenue, totalEvents, totalTicketsSold, avgAttendance } =
      statsData;

    // Performance breakdown
    const performanceData = [
      {
        name: "Events",
        value: totalEvents,
        fill: "#3B82F6",
      },
      {
        name: "Tickets",
        value: totalTicketsSold,
        fill: "#10B981",
      },
    ];

    // Revenue per event
    const revenuePerEvent = totalEvents > 0 ? totalRevenue / totalEvents : 0;

    // Revenue per ticket
    const revenuePerTicket =
      totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;

    const revenueBreakdown = [
      {
        name: "Per Event",
        value: Math.round(revenuePerEvent),
        fill: "#EAB308",
      },
      {
        name: "Per Ticket",
        value: Math.round(revenuePerTicket),
        fill: "#F59E0B",
      },
    ];

    // Efficiency metrics for radial chart
    const efficiencyData = [
      {
        name: "Tickets/Event",
        value: avgAttendance,
        fill: "#8B5CF6",
      },
    ];

    // Comparison data
    const comparisonData = [
      {
        metric: "Total Events",
        value: totalEvents,
      },
      {
        metric: "Total Tickets",
        value: totalTicketsSold,
      },
    ];

    return {
      performanceData,
      revenueBreakdown,
      efficiencyData,
      comparisonData,
      revenuePerEvent,
      revenuePerTicket,
    };
  }, [statsData]);

  // Memoized stats configuration
  const stats = useMemo(
    () => [
      {
        title: "Total Revenue",
        value: formatCurrency(statsData.totalRevenue),
        icon: DollarSign,
        bgColor: "bg-yellow-50",
        iconColor: "text-[#FFE348]",
        description: "Overall earnings",
      },
      {
        title: "Events Created",
        value: statsData.totalEvents,
        icon: Calendar,
        bgColor: "bg-blue-50",
        iconColor: "text-blue-600",
        description: "Total events hosted",
      },
      {
        title: "Tickets Sold",
        value: formatNumber(statsData.totalTicketsSold),
        icon: Ticket,
        bgColor: "bg-green-50",
        iconColor: "text-green-600",
        description: "Total ticket sales",
      },
      {
        title: "Avg. Attendance",
        value: statsData.avgAttendance,
        icon: Users,
        bgColor: "bg-purple-50",
        iconColor: "text-purple-600",
        description: "Per event average",
      },
    ],
    [statsData, formatCurrency, formatNumber],
  );

  const COLORS = ["#EAB308", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B"];

  // Event handlers
  const handleRetry = useCallback(() => {
    dispatch(fetchMyLister());
    dispatch(fetchListerAnalytics());
  }, [dispatch]);

  const handleCreateEvent = useCallback(() => {
    window.location.href = "lister/events/create";
  }, []);

  const handleEditProfile = useCallback(() => {
    window.location.href = "/lister/edit";
  }, []);

  const handleEditEvent = useCallback((eventId: string) => {
    window.location.href = `/event/${eventId}/edit`;
  }, []);

  const handleViewEvent = useCallback((eventId: string) => {
    window.location.href = `/lister/events/${eventId}`;
  }, []);

  // Loading State
  if (loading && !currentLister) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-[#FFE348] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !currentLister) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-[#FFE348] hover:bg-[#FFE348] text-white font-medium rounded-lg transition-colors shadow-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No Data State
  if (!currentLister) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Lister Profile Found
          </h2>
          <p className="text-gray-600 mb-6">
            You need to apply as a lister to access this dashboard.
          </p>
        </div>
      </div>
    );
  }

  const events = currentLister?.Event || [];
  const hasAnalytics = statsData.totalEvents > 0;

  return (
    <div className="pb-40">
      {console.log(currentLister)}
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#FFE348] rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Lister Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  Manage your events and track performance
                </p>
              </div>
            </div>
            <button
              onClick={handleCreateEvent}
              className="px-4 py-2 bg-[#FFE348] hover:bg-[#FFE348] font-medium rounded-lg transition-colors shadow-md hover:shadow-lg flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Event</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Company Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex md:flex-row flex-col items-center gap-6">
              {currentLister.companyLogo ? (
                <img
                  src={currentLister.companyLogo}
                  alt={currentLister.companyName}
                  className="w-24 h-24 rounded-2xl object-cover shadow-md border-2 border-yellow-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md border-2 border-yellow-200">
                  <Building2 className="w-12 h-12 text-white" />
                </div>
              )}
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentLister.companyName}
                  </h2>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      currentLister.status === "APPROVED" || "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : currentLister.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {currentLister.status}
                  </span>
                </div>
                <p className="text-gray-600 max-w-2xl mb-3">
                  {currentLister.bio}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  {currentLister.user?.name && (
                    <span className="flex items-center">
                      👤 {currentLister.user.name}
                    </span>
                  )}
                  {currentLister.user?.email && (
                    <span className="flex items-center">
                      ✉️ {currentLister.user.email}
                    </span>
                  )}
                  {currentLister.createdAt && (
                    <span className="flex items-center">
                      📅 Member since {formatDate(currentLister.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleEditProfile}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit Profile"
            >
              <Edit2 className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-3 rounded-xl`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">
                {stat.title}
              </h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {stat.value}
              </p>
              <p className="text-xs text-gray-500">{stat.description}</p>
            </div>
          ))}
        </div>

        {/* Analytics Charts - Only show if there's data */}
        {hasAnalytics && (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-600">
                    Revenue per Event
                  </h4>
                  <DollarSign className="w-5 h-5 text-[#FFE348]" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(analyticsCharts.revenuePerEvent)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Average earnings per event
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-600">
                    Revenue per Ticket
                  </h4>
                  <Ticket className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(analyticsCharts.revenuePerTicket)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Average ticket price
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-600">
                    Tickets per Event
                  </h4>
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {statsData.avgAttendance}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Average event attendance
                </p>
              </div>
            </div>

            {/* Analytics Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Events vs Tickets Performance */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-[#FFE348]" />
                  Events vs Tickets Performance
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsCharts.performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {analyticsCharts.performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue Breakdown */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-[#FFE348]" />
                  Revenue Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsCharts.revenueBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) =>
                        `${name}: ${formatCurrency(value)}`
                      }
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsCharts.revenueBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Metrics Comparison */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-[#FFE348]" />
                  Metrics Overview
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={analyticsCharts.comparisonData}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      dataKey="metric"
                      type="category"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar dataKey="value" fill="#EAB308" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Average Attendance Gauge */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-[#FFE348]" />
                  Average Event Attendance
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="90%"
                    data={analyticsCharts.efficiencyData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar
                      minAngle={15}
                      background
                      clockWise
                      dataKey="value"
                    />
                    <Legend
                      iconSize={10}
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                    />
                    <Tooltip />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-center mt-4">
                  <p className="text-3xl font-bold text-gray-900">
                    {statsData.avgAttendance}
                  </p>
                  <p className="text-sm text-gray-600">tickets per event</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State for Analytics */}
        {!hasAnalytics && (
          <div className="bg-white rounded-xl shadow-md p-12 mb-8 border border-gray-100 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No Analytics Data Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create and publish events to see your performance analytics
            </p>
            <button
              onClick={handleCreateEvent}
              className="px-6 py-3 bg-[#FFE348] hover:bg-[#FFE348] text-white font-medium rounded-lg transition-colors shadow-md inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Event</span>
            </button>
          </div>
        )}

        {/* Events List */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-[#FFE348]" />
              Your Events ({events.length})
            </h3>
          </div>

          {events.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                No Events Yet
              </h4>
              <p className="text-gray-600 mb-6">
                Create your first event to get started
              </p>
              <button
                onClick={handleCreateEvent}
                className="px-6 py-3 bg-[#FFE348] hover:bg-[#FFE348] font-medium rounded-lg transition-colors shadow-md inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Event</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {events.map((event) => (
                <div
                  key={event.eventId}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {event.banner_square ? (
                        <img
                          src={event.banner_square}
                          alt={event.title}
                          className="w-20 h-20 rounded-lg object-cover shadow-md"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md">
                          <Calendar className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-bold text-gray-900">
                            {event.title}
                          </h4>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              event.status === "PUBLISHED"
                                ? "bg-green-100 text-green-700"
                                : event.status === "DRAFT"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {event.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(event.date)}
                          </span>
                          <span className="flex items-center">
                            <Ticket className="w-4 h-4 mr-1 text-[#FFE348]" />
                            {formatNumber(event.ticketsSold)} tickets sold
                          </span>
                          <span className="flex items-center font-semibold text-green-600">
                            <DollarSign className="w-4 h-4 mr-1" />
                            {formatCurrency(event.revenue)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewEvent(event.eventId)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 flex justify-center items-center gap-1 cursor-pointer"
                        title="View Event"
                      >
                        Analytics
                        <Eye className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleEditEvent(event.eventId)}
                        className="p-2 hover:bg-yellow-50 rounded-lg transition-colors border cursor-pointer"
                        title="Edit Event"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListerDashboard;
