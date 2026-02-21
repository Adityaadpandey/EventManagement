"use client";

import api from "@/lib/api";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  Search,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EmptyState,
  PageError,
  PageLoading,
} from "../_components/admin-components";

// ─── Types ───────────────────────────────────────────────────────────────────

type Buyer = {
  ticketId: string;
  qrCode?: string;
  quantity: number;
  totalPrice: number;
  checkedIn?: boolean;
  createdAt?: string;
  user?: { userId?: string; name?: string; email?: string; phone?: string };
  Event?: { eventId?: string; title?: string };
  ticketType?: { name?: string };
};

type SortField = "date" | "amount" | "name";
type StatusFilter = "all" | "checked" | "pending";

type PaginatedResponse = {
  buyers: Buyer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;
const DEBOUNCE_MS = 350;

const fmtCur = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(v);

// ─── Page ────────────────────────────────────────────────────────────────────

function AllBuyersContent() {
  // Server state
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false); // subsequent loads
  const [error, setError] = useState<string | null>(null);

  // Query params (drive server requests)
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track initial load vs subsequent
  const initialLoad = useRef(true);

  // ── Fetch ──
  const fetchBuyers = useCallback(async () => {
    const isFirst = initialLoad.current;
    if (isFirst) setLoading(true);
    else setFetching(true);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      params.set("sortBy", sortField);
      params.set("sortDir", sortDir);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await api.get(
        `/ticket/admin/all-buyers?${params.toString()}`,
      );
      const d = res.data?.data;
      setData(d ?? null);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load buyers");
    } finally {
      initialLoad.current = false;
      setLoading(false);
      setFetching(false);
    }
  }, [page, sortField, sortDir, statusFilter, search]);

  // Re-fetch whenever query params change
  useEffect(() => {
    if (typeof window !== "undefined") {
      fetchBuyers();
    }
  }, [fetchBuyers]);

  // ── Debounced search handler ──
  const handleSearchChange = useCallback((val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Handlers ──
  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const changeStatus = (s: StatusFilter) => {
    setStatusFilter(s);
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  // ── Render helpers ──
  const renderSortIcon = (field: SortField) =>
    sortField === field ? (
      sortDir === "asc" ? (
        <ChevronUp className="w-3 h-3" />
      ) : (
        <ChevronDown className="w-3 h-3" />
      )
    ) : (
      <span className="w-3 h-3 opacity-0 group-hover:opacity-30 transition-opacity">
        ↕
      </span>
    );

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} />;

  const { buyers = [], total = 0, totalPages = 1 } = data || {};

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 pb-24 lg:pb-10">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/admin"
          className="p-2 rounded-xl bg-[var(--color-neutral-light)] border border-gray-100 hover:bg-gray-50 transition-colors shrink-0 mt-0.5 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-[var(--color-neutral-dark2)]">
            All Ticket Buyers
          </h1>
          <p className="text-xs text-[var(--color-neutral-dark4)] mt-0.5">
            {total.toLocaleString()} total records
            {fetching && (
              <Loader2 className="w-3 h-3 animate-spin inline ml-2" />
            )}
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, email, event, or ticket ID..."
            className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 bg-[var(--color-neutral-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all shadow-sm"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(["all", "checked", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => changeStatus(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                statusFilter === f
                  ? "bg-[var(--color-primary)] text-[var(--color-neutral-dark2)] border-[var(--color-primary)] shadow-sm"
                  : "bg-[var(--color-neutral-light)] text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? "All" : f === "checked" ? "Checked In" : "Pending"}
            </button>
          ))}
        </div>
      </div>

      {/* Loading overlay for subsequent fetches */}
      {fetching && buyers.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-neutral-dark4)]">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating…
        </div>
      )}

      {buyers.length === 0 && !fetching ? (
        <EmptyState
          icon={Users}
          title="No buyers found"
          subtitle={
            search.trim() || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Ticket purchases will appear here"
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => toggleSort("name")}
                      className="group flex items-center gap-1 hover:text-gray-600 transition-colors"
                    >
                      Buyer {renderSortIcon("name")}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => toggleSort("amount")}
                      className="group flex items-center gap-1 hover:text-gray-600 transition-colors"
                    >
                      Amount {renderSortIcon("amount")}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => toggleSort("date")}
                      className="group flex items-center gap-1 hover:text-gray-600 transition-colors"
                    >
                      Date {renderSortIcon("date")}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {buyers.map((b) => (
                  <tr
                    key={b.ticketId}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-[var(--color-neutral-dark2)]">
                        {b.user?.name || "—"}
                      </p>
                      <p className="text-xs text-[var(--color-neutral-dark4)]">
                        {b.user?.email || ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {b.Event?.eventId ? (
                        <Link
                          href={`/admin/events/${b.Event.eventId}`}
                          className="text-sm text-blue-600 hover:underline line-clamp-1"
                        >
                          {b.Event.title || b.Event.eventId.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-neutral-dark3)]">
                      {b.ticketType?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--color-neutral-dark2)] tabular-nums">
                      {b.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--color-neutral-dark2)] tabular-nums">
                      {fmtCur(b.totalPrice)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-neutral-dark4)]">
                      {b.createdAt
                        ? new Date(b.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${b.checkedIn ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}
                      >
                        {b.checkedIn ? "Checked In" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {buyers.map((b) => (
              <div
                key={b.ticketId}
                className="bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-neutral-dark2)]">
                      {b.user?.name || "Unknown"}
                    </p>
                    {b.user?.email && (
                      <p className="text-xs text-[var(--color-neutral-dark4)] truncate">
                        {b.user.email}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${b.checkedIn ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}
                  >
                    {b.checkedIn ? "In" : "Pending"}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {b.Event?.eventId ? (
                    <Link
                      href={`/admin/events/${b.Event.eventId}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {b.Event.title || "Event"}
                    </Link>
                  ) : null}
                  {b.ticketType?.name && (
                    <span className="text-xs text-gray-400">
                      {b.ticketType.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-xs text-gray-500">
                    Qty:{" "}
                    <span className="font-semibold text-[var(--color-neutral-dark2)]">
                      {b.quantity}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-neutral-dark2)] tabular-nums">
                    {fmtCur(b.totalPrice)}
                  </span>
                  {b.createdAt && (
                    <span className="text-xs text-gray-400">
                      {new Date(b.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-400">
                Page {page} of {totalPages} · Showing{" "}
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}{" "}
                of {total.toLocaleString()}
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  className="px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  First
                </button>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 || p === totalPages || Math.abs(p - page) <= 1,
                  )
                  .reduce<(number | "...")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] ?? 0) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span
                        key={`dots-${i}`}
                        className="px-1 text-xs text-gray-300"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${p === page ? "bg-[var(--color-primary)] text-[var(--color-neutral-dark2)] shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AllBuyersContent;
