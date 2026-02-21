"use client";

import api from "@/lib/api";
import {
  ArrowLeft,
  Ban,
  BarChart3,
  Calendar,
  Check,
  CheckCheck,
  Clock,
  DollarSign,
  Edit3,
  Eye,
  Image,
  Loader2,
  Mail,
  MapPin,
  MousePointer,
  Percent,
  Plus,
  RotateCcw,
  Save,
  Send,
  Settings,
  Tag,
  Ticket,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
  ConfirmDialog,
  EmptyState,
  InfoCard,
  PageError,
  PageLoading,
  SkeletonListSection,
  SkeletonMetricCard,
  StatCard,
  StatusBadge,
  Toast,
} from "../../_components/admin-components";
import {
  CAN_TOGGLE_BUY,
  EVENT_ALLOWED_ACTIONS,
  fmtCur,
  fmtDateLong,
  fmtNumber,
  fmtTime,
  type EventAction,
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
  availableMailUpdates?: number;
  banner_horizontal?: string | null;
  banner_vertical?: string | null;
  banner_square?: string | null;
  lister?: {
    listerId?: string;
    user?: { name?: string | null; email?: string | null };
  };
  TicketType?: TicketType[];
  EventAnalytics?: {
    views: number;
    clicks: number;
    ticketsSold: number;
    revenue: number;
    conversionRate: number;
  } | null;
};

type DiscountCode = {
  discountCodeId: string;
  code: string;
  description?: string | null;
  discountType: "PERCENTAGE" | "FLAT";
  discountPct?: number | null;
  discountAmt?: number | null;
  maxDiscount?: number | null;
  minOrderAmt?: number | null;
  maxUses?: number | null;
  usedCount?: number;
  validFrom: string;
  validTo: string;
};

type Refund = {
  refundId: string;
  amount: number;
  reason?: string | null;
  status: string;
  createdAt: string;
  ticket?: {
    ticketId: string;
    qrCode?: string;
    user?: { name?: string; email?: string };
  };
};

type TicketTypeForm = {
  name: string;
  description: string;
  price: string;
  quantity: string;
  discountedPrice: string;
  discountReason: string;
  ticketPrefix: string;
  salesCutoff: string;
};

const EMPTY_TT_FORM: TicketTypeForm = {
  name: "",
  description: "",
  price: "",
  quantity: "",
  discountedPrice: "",
  discountReason: "",
  ticketPrefix: "",
  salesCutoff: "",
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

const TABS = [
  { key: "Overview" as const, icon: Eye, label: "Overview" },
  { key: "Analytics" as const, icon: BarChart3, label: "Analytics" },
  { key: "Attendees" as const, icon: Users, label: "Attendees" },
  { key: "TicketTypes" as const, icon: Settings, label: "Ticket Types" },
  { key: "Refunds" as const, icon: RotateCcw, label: "Refunds" },
  { key: "Discounts" as const, icon: Tag, label: "Discounts" },
];
type Tab = (typeof TABS)[number]["key"];

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

const ACTION_META: Record<
  EventAction,
  {
    label: string;
    icon: typeof Check;
    className: string;
    confirmTitle: string;
    confirmDesc: string;
    confirmBtn: string;
    confirmBtnClass?: string;
  }
> = {
  APPROVED: {
    label: "Approve",
    icon: Check,
    className: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
    confirmTitle: "Approve Event",
    confirmDesc:
      "This will approve the event and send a notification to the lister. The event will be visible to users.",
    confirmBtn: "Approve",
    confirmBtnClass: "bg-emerald-500 text-white hover:bg-emerald-600",
  },
  REJECTED: {
    label: "Reject",
    icon: X,
    className:
      "bg-[var(--color-neutral-light)] text-red-500 border border-red-200 hover:bg-red-50",
    confirmTitle: "Reject Event",
    confirmDesc:
      "This will reject the event and notify the lister. This action cannot be easily undone.",
    confirmBtn: "Reject Event",
    confirmBtnClass: "bg-red-500 text-white hover:bg-red-600",
  },
  CANCELLED: {
    label: "Cancel",
    icon: Ban,
    className:
      "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100",
    confirmTitle: "Cancel Event",
    confirmDesc:
      "This will cancel the event entirely. Ticket holders may need to be refunded. Proceed carefully.",
    confirmBtn: "Cancel Event",
    confirmBtnClass: "bg-orange-600 text-white hover:bg-orange-700",
  },
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

  // Admin actions state
  const [acting, setActing] = useState(false);
  const [confirm, setConfirm] = useState<EventAction | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [canBuyLoading, setCanBuyLoading] = useState(false);

  // Promotions state
  const [promoContent, setPromoContent] = useState("");
  const [promoSending, setPromoSending] = useState(false);

  // Event Update state
  const [updateText, setUpdateText] = useState("");
  const [updateImageUrl, setUpdateImageUrl] = useState("");
  const [updateSending, setUpdateSending] = useState(false);

  // Discounts state
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [discountsLoading, setDiscountsLoading] = useState(false);
  const [discountsLoaded, setDiscountsLoaded] = useState(false);
  const [showCreateDiscount, setShowCreateDiscount] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    code: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FLAT",
    discountPct: "",
    discountAmt: "",
    maxDiscount: "",
    minOrderAmt: "",
    maxUses: "",
    validFrom: "",
    validTo: "",
    description: "",
  });
  const [discountCreating, setDiscountCreating] = useState(false);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    capacity: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  // Ticket Type CRUD state
  const [ttForm, setTtForm] = useState<TicketTypeForm>(EMPTY_TT_FORM);
  const [showCreateTt, setShowCreateTt] = useState(false);
  const [ttCreating, setTtCreating] = useState(false);
  const [editingTtId, setEditingTtId] = useState<string | null>(null);
  const [ttEditForm, setTtEditForm] = useState<TicketTypeForm>(EMPTY_TT_FORM);
  const [ttSaving, setTtSaving] = useState(false);
  const [ttDeleting, setTtDeleting] = useState<string | null>(null);

  // Refunds state
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundsLoaded, setRefundsLoaded] = useState(false);
  const [refundActing, setRefundActing] = useState<string | null>(null);

  // Promo reach
  const [promoReach, setPromoReach] = useState<number | null>(null);

  const loadEvent = useCallback(() => {
    setLoading(true);
    api
      .get(`/admin/event/${eventId}`)
      .then((res) => setEvent(res.data?.data || null))
      .catch((e) =>
        setError(e?.response?.data?.message || "Failed to load event"),
      )
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

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
          const raw = res.data?.data;
          const inner = raw?.data ?? raw;
          setAttendeesData(inner || null);
        })
        .catch(() => setAttendeesData(null))
        .finally(() => setAttendeesLoading(false));
    }
    if (tab === "Discounts" && !discountsLoaded) {
      setDiscountsLoading(true);
      api
        .get(`/discount/event/${eventId}`)
        .then((res) => {
          const data = res.data?.data;
          setDiscounts(Array.isArray(data) ? data : []);
          setDiscountsLoaded(true);
        })
        .catch(() => setDiscounts([]))
        .finally(() => setDiscountsLoading(false));
    }
    if (tab === "Refunds" && !refundsLoaded) {
      setRefundsLoading(true);
      api
        .get(`/payment/refunds/${eventId}`)
        .then((res) => {
          const data = res.data?.data;
          setRefunds(Array.isArray(data) ? data : []);
          setRefundsLoaded(true);
        })
        .catch(() => setRefunds([]))
        .finally(() => setRefundsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, eventId]);

  // ── Admin action handlers ──

  const handleStatusChange = async (newStatus: EventAction) => {
    setConfirm(null);
    setActing(true);
    try {
      await api.post("/admin/change-event-status", {
        eventId,
        newStatus,
      });
      setToast({
        msg: `Event ${newStatus.toLowerCase()} successfully`,
        ok: true,
      });
      // Silent re-fetch (no full-page spinner) + clear cached tab data
      const res = await api.get(`/admin/event/${eventId}`);
      setEvent(res.data?.data || null);
      setAnalytics(null);
      setAttendeesData(null);
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || "Action failed",
        ok: false,
      });
    } finally {
      setActing(false);
    }
  };

  const handleCanBuyToggle = async () => {
    if (!event) return;
    setCanBuyLoading(true);
    try {
      await api.patch(`/admin/event/canBuy/${eventId}`, {
        canBuy: !event.canBuy,
      });
      setEvent((prev) => (prev ? { ...prev, canBuy: !prev.canBuy } : null));
      setToast({
        msg: event.canBuy ? "Ticket sales disabled" : "Ticket sales enabled",
        ok: true,
      });
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || "Failed to toggle ticket sales",
        ok: false,
      });
    } finally {
      setCanBuyLoading(false);
    }
  };

  const handleSendPromotions = async () => {
    if (!event) return;
    setPromoSending(true);
    try {
      await api.post(`/event/${eventId}/promote`, {
        content: promoContent || undefined,
      });
      setToast({ msg: "Promotional emails queued!", ok: true });
      setPromoContent("");
      loadEvent();
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || "Failed to send promotion",
        ok: false,
      });
    } finally {
      setPromoSending(false);
    }
  };

  const handleSendUpdate = async () => {
    if (!event || !updateText.trim()) return;
    setUpdateSending(true);
    try {
      await api.post(`/event/info-update/${eventId}`, {
        update: updateText.trim(),
        imageUrl: updateImageUrl.trim() || undefined,
      });
      setToast({ msg: "Update sent to all ticket holders!", ok: true });
      setUpdateText("");
      setUpdateImageUrl("");
      loadEvent();
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || "Failed to send update",
        ok: false,
      });
    } finally {
      setUpdateSending(false);
    }
  };

  const handleCreateDiscount = async () => {
    setDiscountCreating(true);
    try {
      const payload: any = {
        code: discountForm.code.trim().toUpperCase(),
        discountType: discountForm.discountType,
        validFrom: new Date(discountForm.validFrom).toISOString(),
        validTo: new Date(discountForm.validTo).toISOString(),
      };
      if (discountForm.description.trim())
        payload.description = discountForm.description.trim();
      if (
        discountForm.discountType === "PERCENTAGE" &&
        discountForm.discountPct
      ) {
        payload.discountPct = parseFloat(discountForm.discountPct);
      }
      if (discountForm.discountType === "FLAT" && discountForm.discountAmt) {
        payload.discountAmt = parseFloat(discountForm.discountAmt);
      }
      if (discountForm.maxDiscount)
        payload.maxDiscount = parseFloat(discountForm.maxDiscount);
      if (discountForm.minOrderAmt)
        payload.minOrderAmt = parseFloat(discountForm.minOrderAmt);
      if (discountForm.maxUses)
        payload.maxUses = parseInt(discountForm.maxUses, 10);

      await api.post(`/discount/create/${eventId}`, payload);
      setToast({ msg: "Discount code created!", ok: true });
      setDiscountForm({
        code: "",
        discountType: "PERCENTAGE",
        discountPct: "",
        discountAmt: "",
        maxDiscount: "",
        minOrderAmt: "",
        maxUses: "",
        validFrom: "",
        validTo: "",
        description: "",
      });
      setShowCreateDiscount(false);
      // Reload discounts
      setDiscountsLoaded(false);
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || "Failed to create discount",
        ok: false,
      });
    } finally {
      setDiscountCreating(false);
    }
  };

  // ── Edit event ──
  const startEditing = () => {
    if (!event) return;
    setEditForm({
      title: event.title || "",
      description: event.description || "",
      date: event.date ? new Date(event.date).toISOString().split("T")[0] : "",
      time: event.time || "",
      location: event.location || "",
      capacity: event.capacity != null ? String(event.capacity) : "",
    });
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    setEditSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (editForm.title.trim()) payload.title = editForm.title.trim();
      if (editForm.description.trim())
        payload.description = editForm.description.trim();
      if (editForm.date) payload.date = new Date(editForm.date).toISOString();
      if (editForm.time) payload.time = editForm.time;
      if (editForm.location.trim()) payload.location = editForm.location.trim();
      if (editForm.capacity) payload.capacity = parseInt(editForm.capacity, 10);

      await api.patch(`/event/${eventId}`, payload);
      setToast({ msg: "Event updated!", ok: true });
      setEditMode(false);
      loadEvent();
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || "Failed to update event",
        ok: false,
      });
    } finally {
      setEditSaving(false);
    }
  };

  // ── Ticket Type CRUD ──
  const handleCreateTicketType = async () => {
    setTtCreating(true);
    try {
      const payload: Record<string, any> = {
        name: ttForm.name.trim(),
        price: parseFloat(ttForm.price),
        quantity: parseInt(ttForm.quantity, 10),
      };
      if (ttForm.description.trim())
        payload.description = ttForm.description.trim();
      if (ttForm.discountedPrice)
        payload.discountedPrice = parseFloat(ttForm.discountedPrice);
      if (ttForm.discountReason.trim())
        payload.discountReason = ttForm.discountReason.trim();
      if (ttForm.ticketPrefix.trim())
        payload.ticketPrefix = ttForm.ticketPrefix.trim().toUpperCase();
      if (ttForm.salesCutoff)
        payload.salesCutoff = new Date(ttForm.salesCutoff).toISOString();

      await api.post(`/ticket-type/${eventId}`, payload);
      setToast({ msg: "Ticket type created!", ok: true });
      setTtForm(EMPTY_TT_FORM);
      setShowCreateTt(false);
      loadEvent();
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || "Failed to create ticket type",
        ok: false,
      });
    } finally {
      setTtCreating(false);
    }
  };

  const startEditTt = (tt: TicketType) => {
    setEditingTtId(tt.ticketTypeId);
    setTtEditForm({
      name: tt.name,
      description: "",
      price: String(tt.price),
      quantity: String(tt.quantity),
      discountedPrice:
        tt.discountedPrice != null ? String(tt.discountedPrice) : "",
      discountReason: "",
      ticketPrefix: "",
      salesCutoff: "",
    });
  };

  const handleUpdateTicketType = async () => {
    if (!editingTtId) return;
    setTtSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (ttEditForm.name.trim()) payload.name = ttEditForm.name.trim();
      if (ttEditForm.price) payload.price = parseFloat(ttEditForm.price);
      if (ttEditForm.quantity)
        payload.quantity = parseInt(ttEditForm.quantity, 10);
      if (ttEditForm.description.trim())
        payload.description = ttEditForm.description.trim();
      if (ttEditForm.discountedPrice)
        payload.discountedPrice = parseFloat(ttEditForm.discountedPrice);
      if (ttEditForm.discountReason.trim())
        payload.discountReason = ttEditForm.discountReason.trim();

      await api.patch(`/ticket-type/${eventId}/${editingTtId}`, payload);
      setToast({ msg: "Ticket type updated!", ok: true });
      setEditingTtId(null);
      loadEvent();
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || "Failed to update ticket type",
        ok: false,
      });
    } finally {
      setTtSaving(false);
    }
  };

  const handleDeleteTicketType = async (ttId: string) => {
    if (!window.confirm("Delete this ticket type? This cannot be undone."))
      return;
    setTtDeleting(ttId);
    try {
      await api.delete(`/ticket-type/${eventId}/${ttId}`);
      setToast({ msg: "Ticket type deleted", ok: true });
      loadEvent();
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || "Failed to delete ticket type",
        ok: false,
      });
    } finally {
      setTtDeleting(null);
    }
  };

  // ── Refund actions ──
  const handleRefundAction = async (
    refundId: string,
    action: "approve" | "reject",
  ) => {
    setRefundActing(refundId);
    try {
      await api.post("/payment/refund/process", { refundId, action });
      setToast({ msg: `Refund ${action}d!`, ok: true });
      setRefundsLoaded(false);
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || `Failed to ${action} refund`,
        ok: false,
      });
    } finally {
      setRefundActing(null);
    }
  };

  // ── Fetch promo reach ──
  const fetchPromoReach = async () => {
    try {
      const res = await api.get(`/event/${eventId}/promotion-reach`);
      setPromoReach(res.data?.data?.totalReach ?? res.data?.data?.count ?? 0);
    } catch {
      setPromoReach(null);
    }
  };

  if (loading) return <PageLoading />;
  if (error || !event)
    return <PageError message={error || "Event not found"} />;

  const banner =
    event.banner_horizontal || event.banner_square || event.banner_vertical;
  const allowedActions = EVENT_ALLOWED_ACTIONS[event.status] || [];
  const canToggleBuy = CAN_TOGGLE_BUY.includes(event.status);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 pb-24 lg:pb-10">
      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />
      )}

      {/* Confirm Dialog */}
      {confirm && (
        <ConfirmDialog
          title={ACTION_META[confirm].confirmTitle}
          description={ACTION_META[confirm].confirmDesc}
          confirmLabel={ACTION_META[confirm].confirmBtn}
          confirmClassName={ACTION_META[confirm].confirmBtnClass}
          onConfirm={() => handleStatusChange(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}

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

      {/* ── Admin Action Bar ──────────────────────────────────── */}
      {(allowedActions.length > 0 || canToggleBuy) && (
        <div className="bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Admin Actions
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status actions */}
            {allowedActions.map((action) => {
              const meta = ACTION_META[action];
              return (
                <button
                  key={action}
                  disabled={acting}
                  onClick={() => setConfirm(action)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-50 ${meta.className}`}
                >
                  {acting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <meta.icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                  )}
                  {meta.label}
                </button>
              );
            })}

            {/* canBuy toggle */}
            {canToggleBuy && (
              <button
                disabled={canBuyLoading}
                onClick={handleCanBuyToggle}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-50 border ${
                  event.canBuy
                    ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                    : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                }`}
              >
                {canBuyLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : event.canBuy ? (
                  <ToggleRight className="w-4 h-4" />
                ) : (
                  <ToggleLeft className="w-4 h-4" />
                )}
                {event.canBuy ? "Sales On" : "Sales Off"}
              </button>
            )}
          </div>
        </div>
      )}

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
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 sm:px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px whitespace-nowrap ${
              tab === t.key
                ? "border-[var(--color-primary)] text-[var(--color-neutral-dark2)]"
                : "border-transparent text-gray-400 hover:text-[var(--color-neutral-dark2)]"
            }`}
          >
            <t.icon
              className="w-4 h-4"
              strokeWidth={tab === t.key ? 2.2 : 1.6}
            />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────────── */}
      {tab === "Overview" && (
        <div className="space-y-5">
          {/* Info cards — 2-column on desktop */}
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

          {/* Edit Event */}
          <div className="bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Event Details
              </p>
              {!editMode ? (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all"
                >
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {editSaving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}{" "}
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold text-gray-500 hover:bg-gray-100 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            {editMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, title: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, location: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={editForm.time}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, time: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.capacity}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, capacity: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-400 transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-400 resize-none transition-all"
                  />
                </div>
              </div>
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

          {/* Updates & Promotions section */}
          {event.status === "APPROVED" && (
            <div className="bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm p-5 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--color-neutral-dark2)]">
                      Updates & Promotions
                    </p>
                    <p className="text-xs text-[var(--color-neutral-dark4)]">
                      Send updates or promotions to ticket holders
                    </p>
                  </div>
                </div>
                {event.availableMailUpdates != null && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 tabular-nums">
                    {event.availableMailUpdates} sends left
                  </span>
                )}
              </div>

              {(event.availableMailUpdates ?? 0) > 0 ? (
                <div className="space-y-4">
                  {/* ── Event Update ── */}
                  <div className="space-y-3 p-4 rounded-xl bg-blue-50/40 border border-blue-100">
                    <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                      Event Update
                    </p>
                    <p className="text-xs text-blue-700">
                      Send an important update email + push notification to all
                      ticket holders.
                    </p>
                    <textarea
                      value={updateText}
                      onChange={(e) => setUpdateText(e.target.value)}
                      placeholder="Write the update message for ticket holders..."
                      rows={3}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-[var(--color-neutral-dark2)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-400 resize-none transition-all"
                    />
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-gray-400 shrink-0" />
                      <input
                        type="url"
                        value={updateImageUrl}
                        onChange={(e) => setUpdateImageUrl(e.target.value)}
                        placeholder="Optional image URL..."
                        className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-400 transition-all"
                      />
                    </div>
                    <button
                      onClick={handleSendUpdate}
                      disabled={updateSending || !updateText.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition-all disabled:opacity-50 shadow-sm"
                    >
                      {updateSending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Send Update
                    </button>
                  </div>

                  {/* ── Promotion ── */}
                  <div className="space-y-3 p-4 rounded-xl bg-purple-50/40 border border-purple-100">
                    <p className="text-xs font-bold text-purple-800 uppercase tracking-wider">
                      Promotion
                    </p>
                    <p className="text-xs text-purple-700">
                      Send a promotional email to previous ticket buyers of
                      other events.
                    </p>
                    <textarea
                      value={promoContent}
                      onChange={(e) => setPromoContent(e.target.value)}
                      placeholder="Optional: Add a custom message for the promotional email..."
                      rows={2}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-[var(--color-neutral-dark2)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300/40 focus:border-purple-400 resize-none transition-all"
                    />
                    <button
                      onClick={handleSendPromotions}
                      disabled={promoSending}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-purple-500 text-white hover:bg-purple-600 transition-all disabled:opacity-50 shadow-sm"
                    >
                      {promoSending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Send Promotion
                    </button>
                    <button
                      onClick={fetchPromoReach}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all"
                    >
                      <Users className="w-3 h-3" /> Check Reach
                    </button>
                    {promoReach != null && (
                      <span className="text-xs text-purple-600 font-medium">
                        ~{promoReach.toLocaleString()} users
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  No email sends remaining for this event.
                </p>
              )}
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

      {/* ── Ticket Types ───────────────────────────────────────── */}
      {tab === "TicketTypes" && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateTt(!showCreateTt)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--color-brand)] text-white hover:brightness-110 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Ticket Type
            </button>
          </div>

          {showCreateTt && (
            <div className="bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
              <p className="text-sm font-bold text-[var(--color-neutral-dark2)]">
                New Ticket Type
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={ttForm.name}
                    onChange={(e) =>
                      setTtForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. General Entry"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ttForm.price}
                    onChange={(e) =>
                      setTtForm((f) => ({ ...f, price: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={ttForm.quantity}
                    onChange={(e) =>
                      setTtForm((f) => ({ ...f, quantity: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                    Discounted Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ttForm.discountedPrice}
                    onChange={(e) =>
                      setTtForm((f) => ({
                        ...f,
                        discountedPrice: e.target.value,
                      }))
                    }
                    placeholder="Optional"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                    Ticket Prefix
                  </label>
                  <input
                    type="text"
                    value={ttForm.ticketPrefix}
                    onChange={(e) =>
                      setTtForm((f) => ({ ...f, ticketPrefix: e.target.value }))
                    }
                    placeholder="e.g. VIP"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                    Sales Cutoff
                  </label>
                  <input
                    type="datetime-local"
                    value={ttForm.salesCutoff}
                    onChange={(e) =>
                      setTtForm((f) => ({ ...f, salesCutoff: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={ttForm.description}
                    onChange={(e) =>
                      setTtForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Optional"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  disabled={
                    ttCreating ||
                    !ttForm.name.trim() ||
                    !ttForm.price ||
                    !ttForm.quantity
                  }
                  onClick={handleCreateTicketType}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--color-brand)] text-white hover:brightness-110 transition-all disabled:opacity-40 shadow-sm"
                >
                  {ttCreating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}{" "}
                  Create
                </button>
                <button
                  onClick={() => setShowCreateTt(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Existing list */}
          {!event.TicketType || event.TicketType.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No ticket types"
              subtitle="Create a ticket type to start selling"
            />
          ) : (
            <div className="space-y-3">
              {event.TicketType.map((tt) => {
                const isEditing = editingTtId === tt.ticketTypeId;
                const pct =
                  tt.quantity > 0
                    ? Math.round((tt.soldCount / tt.quantity) * 100)
                    : 0;
                return (
                  <div
                    key={tt.ticketTypeId}
                    className="bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm p-4"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={ttEditForm.name}
                              onChange={(e) =>
                                setTtEditForm((f) => ({
                                  ...f,
                                  name: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300/40 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                              Price (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={ttEditForm.price}
                              onChange={(e) =>
                                setTtEditForm((f) => ({
                                  ...f,
                                  price: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300/40 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={ttEditForm.quantity}
                              onChange={(e) =>
                                setTtEditForm((f) => ({
                                  ...f,
                                  quantity: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300/40 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                              Discounted Price
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={ttEditForm.discountedPrice}
                              onChange={(e) =>
                                setTtEditForm((f) => ({
                                  ...f,
                                  discountedPrice: e.target.value,
                                }))
                              }
                              placeholder="Optional"
                              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300/40 transition-all"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleUpdateTicketType}
                            disabled={ttSaving}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-sm"
                          >
                            {ttSaving ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3" />
                            )}{" "}
                            Save
                          </button>
                          <button
                            onClick={() => setEditingTtId(null)}
                            className="px-3 py-2 rounded-full text-xs font-bold text-gray-500 hover:bg-gray-100 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
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
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right mr-2">
                            <p className="text-sm font-bold text-[var(--color-neutral-dark2)] tabular-nums">
                              {fmtCur(tt.price)}
                            </p>
                            {tt.discountedPrice != null && (
                              <p className="text-xs text-emerald-600 mt-0.5">
                                Disc: {fmtCur(tt.discountedPrice)}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => startEditTt(tt)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteTicketType(tt.ticketTypeId)
                            }
                            disabled={ttDeleting === tt.ticketTypeId}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors disabled:opacity-50"
                          >
                            {ttDeleting === tt.ticketTypeId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Refunds ─────────────────────────────────────────────── */}
      {tab === "Refunds" && (
        <div className="space-y-5">
          {refundsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl bg-gray-100 animate-pulse"
                />
              ))}
            </div>
          ) : refunds.length === 0 ? (
            <EmptyState
              icon={RotateCcw}
              title="No refund requests"
              subtitle="Refund requests from ticket buyers will appear here"
            />
          ) : (
            <div className="space-y-3">
              {refunds.map((r) => {
                const isPending =
                  r.status === "PENDING" || r.status === "REQUESTED";
                return (
                  <div
                    key={r.refundId}
                    className="bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-[var(--color-neutral-dark2)] tabular-nums">
                            {fmtCur(r.amount)}
                          </p>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isPending ? "bg-amber-50 text-amber-700 border-amber-200" : r.status === "COMPLETED" || r.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}
                          >
                            {r.status}
                          </span>
                        </div>
                        {r.reason && (
                          <p className="text-xs text-[var(--color-neutral-dark4)] mt-1">
                            {r.reason}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {r.ticket?.user?.name && (
                            <span className="text-xs text-[var(--color-neutral-dark3)]">
                              {r.ticket.user.name}
                            </span>
                          )}
                          {r.ticket?.user?.email && (
                            <span className="text-xs text-gray-400">
                              {r.ticket.user.email}
                            </span>
                          )}
                          <span className="text-xs text-gray-300">
                            {new Date(r.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                      {isPending && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() =>
                              handleRefundAction(r.refundId, "approve")
                            }
                            disabled={refundActing === r.refundId}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-sm"
                          >
                            {refundActing === r.refundId ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}{" "}
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleRefundAction(r.refundId, "reject")
                            }
                            disabled={refundActing === r.refundId}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-all disabled:opacity-50"
                          >
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Discounts ──────────────────────────────────────────── */}
      {tab === "Discounts" && (
        <div className="space-y-5">
          {discountsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl bg-gray-100 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              {/* Create button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCreateDiscount(!showCreateDiscount)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--color-brand)] text-white hover:brightness-110 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Discount
                </button>
              </div>

              {/* Create form */}
              {showCreateDiscount && (
                <div className="bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
                  <p className="text-sm font-bold text-[var(--color-neutral-dark2)]">
                    New Discount Code
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                        Code *
                      </label>
                      <input
                        type="text"
                        value={discountForm.code}
                        onChange={(e) =>
                          setDiscountForm((f) => ({
                            ...f,
                            code: e.target.value,
                          }))
                        }
                        placeholder="e.g. SUMMER20"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                        Type *
                      </label>
                      <select
                        value={discountForm.discountType}
                        onChange={(e) =>
                          setDiscountForm((f) => ({
                            ...f,
                            discountType: e.target.value as
                              | "PERCENTAGE"
                              | "FLAT",
                          }))
                        }
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
                      >
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FLAT">Flat Amount (₹)</option>
                      </select>
                    </div>
                    {discountForm.discountType === "PERCENTAGE" ? (
                      <div>
                        <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                          Discount %
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.01"
                          value={discountForm.discountPct}
                          onChange={(e) =>
                            setDiscountForm((f) => ({
                              ...f,
                              discountPct: e.target.value,
                            }))
                          }
                          placeholder="e.g. 20"
                          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                          Discount Amount (₹)
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={discountForm.discountAmt}
                          onChange={(e) =>
                            setDiscountForm((f) => ({
                              ...f,
                              discountAmt: e.target.value,
                            }))
                          }
                          placeholder="e.g. 100"
                          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                        Max Discount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discountForm.maxDiscount}
                        onChange={(e) =>
                          setDiscountForm((f) => ({
                            ...f,
                            maxDiscount: e.target.value,
                          }))
                        }
                        placeholder="Optional"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                        Min Order (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discountForm.minOrderAmt}
                        onChange={(e) =>
                          setDiscountForm((f) => ({
                            ...f,
                            minOrderAmt: e.target.value,
                          }))
                        }
                        placeholder="Optional"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                        Max Uses
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={discountForm.maxUses}
                        onChange={(e) =>
                          setDiscountForm((f) => ({
                            ...f,
                            maxUses: e.target.value,
                          }))
                        }
                        placeholder="Optional"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                        Valid From *
                      </label>
                      <input
                        type="datetime-local"
                        value={discountForm.validFrom}
                        onChange={(e) =>
                          setDiscountForm((f) => ({
                            ...f,
                            validFrom: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                        Valid Until *
                      </label>
                      <input
                        type="datetime-local"
                        value={discountForm.validTo}
                        onChange={(e) =>
                          setDiscountForm((f) => ({
                            ...f,
                            validTo: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-neutral-dark3)] mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={discountForm.description}
                      onChange={(e) =>
                        setDiscountForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Optional description"
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      disabled={
                        discountCreating ||
                        !discountForm.code.trim() ||
                        !discountForm.validFrom ||
                        !discountForm.validTo
                      }
                      onClick={handleCreateDiscount}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--color-brand)] text-white hover:brightness-110 transition-all disabled:opacity-40 shadow-sm"
                    >
                      {discountCreating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Create
                    </button>
                    <button
                      onClick={() => setShowCreateDiscount(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* List */}
              {discounts.length === 0 && !showCreateDiscount ? (
                <EmptyState
                  icon={Tag}
                  title="No discount codes"
                  subtitle="Create a discount code to offer deals on tickets"
                />
              ) : (
                <div className="space-y-3">
                  {discounts.map((d) => {
                    const isExpired = new Date(d.validTo) < new Date();
                    const isActive =
                      new Date(d.validFrom) <= new Date() && !isExpired;
                    return (
                      <div
                        key={d.discountCodeId}
                        className={`bg-[var(--color-neutral-light)] border rounded-2xl shadow-sm p-4 ${isExpired ? "border-gray-200 opacity-60" : "border-gray-100"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold font-mono text-[var(--color-neutral-dark2)]">
                                {d.code}
                              </p>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : isExpired ? "bg-gray-100 text-gray-500 border-gray-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
                              >
                                {isActive
                                  ? "Active"
                                  : isExpired
                                    ? "Expired"
                                    : "Scheduled"}
                              </span>
                            </div>
                            {d.description && (
                              <p className="text-xs text-[var(--color-neutral-dark4)] mt-1">
                                {d.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <span className="flex items-center gap-1 text-xs text-[var(--color-neutral-dark3)]">
                                <Percent className="w-3 h-3" />
                                {d.discountType === "PERCENTAGE"
                                  ? `${d.discountPct}%`
                                  : `₹${d.discountAmt}`}
                              </span>
                              {d.maxUses != null && (
                                <span className="text-xs text-[var(--color-neutral-dark4)]">
                                  {d.usedCount ?? 0}/{d.maxUses} used
                                </span>
                              )}
                              {d.minOrderAmt != null && d.minOrderAmt > 0 && (
                                <span className="text-xs text-[var(--color-neutral-dark4)]">
                                  Min ₹{d.minOrderAmt}
                                </span>
                              )}
                              {d.maxDiscount != null && d.maxDiscount > 0 && (
                                <span className="text-xs text-[var(--color-neutral-dark4)]">
                                  Max ₹{d.maxDiscount}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-gray-400">
                              {new Date(d.validFrom).toLocaleDateString(
                                "en-IN",
                                { day: "numeric", month: "short" },
                              )}{" "}
                              —{" "}
                              {new Date(d.validTo).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
