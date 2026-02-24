"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Search,
  Download,
  CheckCircle,
  XCircle,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
} from "lucide-react";
import api from "@/lib/api";

interface Buyer {
  userId: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
}

interface AttendeeField {
  fieldId: string;
  value: string;
  fieldType: string;
  required: boolean;
}

interface Ticket {
  ticketId: string;
  qrCode: string;
  quantity: number;
  totalPrice: number;
  checkedIn: boolean;
  purchaseDate: string;
  buyer: Buyer;
  attendeeFields: Record<string, AttendeeField>;
  ticketTypeName?: string;
  ticketTypeId?: string;
}

interface TicketType {
  ticketTypeId: string;
  name: string;
  description: string;
  price: number;
  discountedPrice: number;
  totalQuantity: number;
  soldCount: number;
  availableCount: number;
  totalTickets: number;
  checkedInCount: number;
  totalRevenue: number;
  tickets: Ticket[];
}

interface Event {
  eventId: string;
  title: string;
  date: string;
  time: string;
  location: string;
}

interface Statistics {
  totalTicketsSold: number;
  totalCheckedIn: number;
  totalRevenue: number;
  checkInRate: string;
}

interface EventData {
  event: Event;
  statistics: Statistics;
  ticketTypes: TicketType[];
}

type Checker = { checkerId: string; username: string; createdAt: string };

const TicketAttendeesPage = () => {
  const params = useParams();
  const eventId = params?.eventId as string;

  const [activeTab, setActiveTab] = useState<"attendees" | "checkers">(
    "attendees",
  );

  // ── Attendees state ───────────────────────────────────────────────────────
  const [data, setData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicketType, setSelectedTicketType] = useState("all");
  const [checkedInFilter, setCheckedInFilter] = useState("all");
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(
    new Set(),
  );

  // ── Checkers state ────────────────────────────────────────────────────────
  const [checkers, setCheckers] = useState<Checker[]>([]);
  const [loadingCheckers, setLoadingCheckers] = useState(false);
  const [checkersFetched, setCheckersFetched] = useState(false);
  const [creatingChecker, setCreatingChecker] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [newCheckerCreds, setNewCheckerCreds] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<
    "username" | "password" | null
  >(null);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load attendees ────────────────────────────────────────────────────────
  useEffect(() => {
    if (eventId) loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/lister/ticket-attendes/${eventId}`);
      setData(res.data?.data || res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load attendee data");
    } finally {
      setLoading(false);
    }
  };

  // ── Load checkers (lazy) ──────────────────────────────────────────────────
  const fetchCheckers = useCallback(async () => {
    if (!eventId) return;
    setLoadingCheckers(true);
    try {
      const res = await api.get(`/checker/${eventId}`);
      setCheckers(res.data?.data ?? []);
      setCheckersFetched(true);
    } catch {
      showToast("Failed to load checkers", false);
    } finally {
      setLoadingCheckers(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (activeTab === "checkers" && !checkersFetched) {
      fetchCheckers();
    }
  }, [activeTab, checkersFetched, fetchCheckers]);

  // ── Checker handlers ──────────────────────────────────────────────────────
  const handleCreateChecker = async () => {
    setCreatingChecker(true);
    try {
      const res = await api.get(`/checker/create/${eventId}`);
      setNewCheckerCreds({
        username: res.data.data.username,
        password: res.data.data.password,
      });
      fetchCheckers();
    } catch (e: any) {
      showToast(
        e?.response?.data?.message || "Failed to create checker",
        false,
      );
    } finally {
      setCreatingChecker(false);
    }
  };

  const handleRevoke = async (checkerId: string) => {
    setRevokingId(checkerId);
    try {
      await api.delete(`/checker/${checkerId}`);
      setCheckers((prev) => prev.filter((c) => c.checkerId !== checkerId));
      showToast("Checker revoked", true);
    } catch {
      showToast("Failed to revoke checker", false);
    } finally {
      setRevokingId(null);
      setConfirmRevokeId(null);
    }
  };

  const handleCopy = async (text: string, field: "username" | "password") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      showToast("Failed to copy", false);
    }
  };

  // ── Attendee helpers ──────────────────────────────────────────────────────
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Kolkata",
    });

  const formatTime = (timeString: string) =>
    new Date(timeString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });

  const getAllTickets = useMemo((): Ticket[] => {
    if (!data) return [];
    return data.ticketTypes.flatMap((type) =>
      type.tickets.map((ticket) => ({
        ...ticket,
        ticketTypeName: type.name,
        ticketTypeId: type.ticketTypeId,
      })),
    );
  }, [data]);

  const filteredTickets = useMemo(() => {
    let tickets = getAllTickets;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      tickets = tickets.filter(
        (ticket) =>
          ticket.buyer.name.toLowerCase().includes(search) ||
          ticket.buyer.email.toLowerCase().includes(search) ||
          ticket.buyer.phone.toLowerCase().includes(search) ||
          ticket.qrCode.toLowerCase().includes(search) ||
          Object.values(ticket.attendeeFields).some((field) =>
            field.value.toLowerCase().includes(search),
          ),
      );
    }
    if (selectedTicketType !== "all") {
      tickets = tickets.filter(
        (ticket) => ticket.ticketTypeId === selectedTicketType,
      );
    }
    if (checkedInFilter !== "all") {
      tickets = tickets.filter((ticket) =>
        checkedInFilter === "checked-in" ? ticket.checkedIn : !ticket.checkedIn,
      );
    }
    return tickets;
  }, [getAllTickets, searchTerm, selectedTicketType, checkedInFilter]);

  const handleExport = () => {
    if (!data) return;
    const headers = [
      "QR Code",
      "Buyer Name",
      "Email",
      "Phone",
      "Ticket Type",
      "Price",
      "Purchase Date",
      "Status",
    ];
    const allFieldLabels = new Set<string>();
    filteredTickets.forEach((ticket) => {
      Object.keys(ticket.attendeeFields).forEach((label) =>
        allFieldLabels.add(label),
      );
    });
    headers.push(...Array.from(allFieldLabels));
    const rows = filteredTickets.map((ticket) => {
      const baseRow = [
        ticket.qrCode,
        ticket.buyer.name,
        ticket.buyer.email,
        ticket.buyer.phone,
        ticket.ticketTypeName || "",
        ticket.totalPrice.toString(),
        formatDate(ticket.purchaseDate),
        ticket.checkedIn ? "Checked In" : "Not Checked In",
      ];
      Array.from(allFieldLabels).forEach((label) => {
        baseRow.push(ticket.attendeeFields[label]?.value || "");
      });
      return baseRow;
    });
    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendees-${data.event.title.replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleTicketExpansion = (ticketId: string) => {
    setExpandedTickets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) newSet.delete(ticketId);
      else newSet.add(ticketId);
      return newSet;
    });
  };

  // ── Loading / error / empty states ────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading attendee data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-xl shadow-sm p-8 max-w-md w-full">
          <div className="bg-red-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Error Loading Data
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-6 py-2 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-xl shadow-sm p-8 max-w-md w-full">
          <p className="text-gray-600">No data available for this event</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-4 z-50 px-4 py-3 rounded-2xl text-sm font-medium shadow-lg border max-w-xs ${
            toast.ok
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-600 border-red-200"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {data.event.title}
              </h1>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  📅 {formatDate(data.event.date)}
                </span>
                <span className="flex items-center gap-1">
                  🕐 {formatTime(data.event.time)}
                </span>
                <span className="flex items-center gap-1">
                  📍 {data.event.location}
                </span>
              </div>
            </div>
            {activeTab === "attendees" && (
              <button
                onClick={handleExport}
                className="px-6 py-2 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Download size={18} />
                Export Data
              </button>
            )}
            {activeTab === "checkers" && (
              <button
                type="button"
                onClick={handleCreateChecker}
                disabled={creatingChecker}
                className="px-6 py-2 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60"
              >
                {creatingChecker ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Users size={18} />
                )}
                {creatingChecker ? "Creating…" : "Create Checker"}
              </button>
            )}
          </div>

          {/* Tab pills */}
          <div className="flex gap-2 mt-5">
            {(["attendees", "checkers"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                  activeTab === tab
                    ? "bg-[#FFE348] text-gray-900"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* ── Attendees tab ── */}
        {activeTab === "attendees" && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-400">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Total Tickets Sold
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {data.statistics.totalTicketsSold}
                    </p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <Users size={24} className="text-yellow-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Checked In
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {data.statistics.totalCheckedIn}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Total Revenue
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      ₹{data.statistics.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <DollarSign size={24} className="text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Check-in Rate
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {data.statistics.checkInRate}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <TrendingUp size={24} className="text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Types Overview */}
            <div className="mt-6 md:mt-8 bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Ticket Types Overview
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.ticketTypes.map((type) => (
                  <div
                    key={type.ticketTypeId}
                    className="border border-gray-200 rounded-lg p-4 hover:border-yellow-400 transition-colors"
                  >
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {type.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {type.description}
                    </p>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sold:</span>
                        <span className="font-semibold text-gray-900">
                          {type.soldCount}/{type.totalQuantity}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Revenue:</span>
                        <span className="font-semibold text-gray-900">
                          ₹{type.totalRevenue.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Price:</span>
                        <span className="font-semibold text-yellow-600">
                          ₹{type.discountedPrice}
                        </span>
                      </div>
                      {type.price !== type.discountedPrice && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Original:</span>
                          <span className="text-gray-500 line-through">
                            ₹{type.price}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="mt-6 md:mt-8 bg-white rounded-xl shadow-sm p-4 md:p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="Search by name, email, phone, QR code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedTicketType}
                  onChange={(e) => setSelectedTicketType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white"
                >
                  <option value="all">All Ticket Types</option>
                  {data.ticketTypes.map((type) => (
                    <option key={type.ticketTypeId} value={type.ticketTypeId}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <select
                  value={checkedInFilter}
                  onChange={(e) => setCheckedInFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="checked-in">Checked In</option>
                  <option value="not-checked-in">Not Checked In</option>
                </select>
              </div>
            </div>

            {/* Attendees List */}
            <div className="mt-6 md:mt-8 bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Attendees ({filteredTickets.length})
                </h2>
              </div>
              {filteredTickets.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">
                    No tickets found matching your filters.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredTickets.map((ticket) => {
                    const isExpanded = expandedTickets.has(ticket.ticketId);
                    const hasAttendeeFields =
                      Object.keys(ticket.attendeeFields).length > 0;
                    return (
                      <div
                        key={ticket.ticketId}
                        className="p-4 md:p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                          {/* Left: QR & Status */}
                          <div className="flex items-start gap-4 lg:w-64 flex-shrink-0">
                            <div className="flex flex-col gap-2">
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                QR Code
                              </span>
                              <span className="font-mono text-base font-bold text-yellow-600 bg-yellow-50 px-3 py-1 rounded-md inline-block">
                                {ticket.qrCode}
                              </span>
                              <div className="mt-1">
                                {ticket.checkedIn ? (
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200 w-fit">
                                    <CheckCircle
                                      size={16}
                                      className="text-green-600"
                                    />
                                    <span className="text-sm font-semibold text-green-700">
                                      Checked In
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 w-fit">
                                    <XCircle
                                      size={16}
                                      className="text-gray-500"
                                    />
                                    <span className="text-sm font-semibold text-gray-600">
                                      Not Checked In
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Middle: Buyer Details */}
                          <div className="flex-1 min-w-0 border-l-0 lg:border-l-2 lg:border-gray-100 lg:pl-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="flex-1 min-w-0 space-y-1">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Buyer
                                </span>
                                <p className="text-lg font-bold text-gray-900">
                                  {ticket.buyer.name}
                                </p>
                                <div className="flex flex-col gap-0.5 text-sm text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400">✉</span>
                                    <span className="truncate">
                                      {ticket.buyer.email}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400">📱</span>
                                    <span>{ticket.buyer.phone}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Right: Ticket Details */}
                              <div className="flex flex-col gap-2 sm:items-end border-t sm:border-t-0 pt-3 sm:pt-0">
                                <span className="px-4 py-1.5 text-sm font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-full whitespace-nowrap shadow-sm">
                                  {ticket.ticketTypeName}
                                </span>
                                <span className="text-2xl font-bold text-gray-900">
                                  ₹{ticket.totalPrice}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <span>📅</span>
                                  <span>{formatDate(ticket.purchaseDate)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Attendee Fields */}
                        {hasAttendeeFields && (
                          <div className="mt-4 border-t border-gray-100 pt-4">
                            <button
                              onClick={() =>
                                toggleTicketExpansion(ticket.ticketId)
                              }
                              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors w-full sm:w-auto justify-center sm:justify-start"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp size={18} />
                                  Hide Attendee Details
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={18} />
                                  View Attendee Details (
                                  {
                                    Object.keys(ticket.attendeeFields).length
                                  }{" "}
                                  fields)
                                </>
                              )}
                            </button>
                            {isExpanded && (
                              <div className="mt-4 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                                  <Users size={16} />
                                  Attendee Information
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {Object.entries(ticket.attendeeFields).map(
                                    ([label, field]) => (
                                      <div
                                        key={field.fieldId}
                                        className="bg-white p-3 rounded-lg shadow-sm border border-gray-200"
                                      >
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                                          {label}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900 break-words">
                                          {field.value || "-"}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Checkers tab ── */}
        {activeTab === "checkers" && (
          <div className="space-y-4">
            {loadingCheckers ? (
              <div className="bg-white rounded-xl shadow-sm p-10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
              </div>
            ) : checkers.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-10 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-base font-semibold text-gray-600">
                  No checkers yet
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Create a checker account so staff can scan tickets at the
                  door.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">
                    Checkers ({checkers.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {checkers.map((c) => (
                    <div
                      key={c.checkerId}
                      className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {c.username}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Created{" "}
                          {new Date(c.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      {confirmRevokeId === c.checkerId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Revoke?</span>
                          <button
                            type="button"
                            onClick={() => setConfirmRevokeId(null)}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevoke(c.checkerId)}
                            disabled={revokingId === c.checkerId}
                            className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                          >
                            {revokingId === c.checkerId && (
                              <Loader2 size={12} className="animate-spin" />
                            )}
                            Revoke
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRevokeId(c.checkerId)}
                          className="px-4 py-1.5 text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Credentials Modal */}
      {newCheckerCreds && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Checker Created
              </h3>
              <p className="text-sm text-amber-600 mt-1 font-medium">
                Save these now — the password won&apos;t be shown again.
              </p>
            </div>
            {(["username", "password"] as const).map((field) => (
              <div key={field}>
                <p className="text-xs text-gray-500 mb-1 capitalize">{field}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 break-all">
                    {newCheckerCreds[field]}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(newCheckerCreds[field], field)}
                    className={`p-2 rounded-lg border transition-colors ${
                      copiedField === field
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "border-gray-200 hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setNewCheckerCreds(null)}
              className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg text-sm transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketAttendeesPage;
