// ─── Shared Admin Types ──────────────────────────────────────────────────────

export type AdminEvent = {
  eventId: string;
  title: string;
  status: string;
  canBuy: boolean;
  date: string | null;
  location: string | null;
  createdAt?: string;
  lister?: { user?: { name?: string | null; email?: string | null } };
};

export type AdminPayout = {
  id: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED" | "REVERSED";
  createdAt: string;
  updatedAt: string;
  lister?: {
    companyName?: string | null;
    user?: { name?: string | null; email?: string | null };
  };
  event?: { title?: string | null };
  bankDetails?: {
    accountHolderName?: string | null;
    accountNumber?: string | null;
    ifsc?: string | null;
    bankName?: string | null;
  };
};

export type PendingEvent = {
  eventId: string;
  title: string;
  description: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  status: string;
  lister: { user: { name: string | null; email: string | null } };
};

// ─── Status Badge Mappings ───────────────────────────────────────────────────

export const EVENT_STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  REJECTED: "bg-red-50 text-red-600 border border-red-200",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  NOT_VIEWED: "bg-gray-100 text-gray-500 border border-gray-200",
  CANCELLATION_REQUESTED:
    "bg-orange-50 text-orange-700 border border-orange-200",
  CANCELLED: "bg-red-50 text-red-400 border border-red-100",
};

export const PAYOUT_STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  APPROVED: "bg-blue-50 text-blue-700 border border-blue-200",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  REJECTED: "bg-red-50 text-red-600 border border-red-200",
  REVERSED: "bg-orange-50 text-orange-700 border border-orange-200",
};

export const EVENT_STATUSES = [
  "ALL",
  "APPROVED",
  "PENDING",
  "NOT_VIEWED",
  "REJECTED",
  "CANCELLED",
] as const;

export const PAYOUT_STATUSES = [
  "ALL",
  "PENDING",
  "APPROVED",
  "COMPLETED",
  "REJECTED",
  "REVERSED",
] as const;

export type PayoutAction = "approve" | "complete" | "reject" | "reverse";

export const PAYOUT_ALLOWED_ACTIONS: Record<string, PayoutAction[]> = {
  PENDING: ["approve", "reject"],
  APPROVED: ["complete", "reject"],
  COMPLETED: ["reverse"],
  REJECTED: [],
  REVERSED: [],
};

// ─── Formatters ──────────────────────────────────────────────────────────────

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const fmtDateLong = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const fmtTime = (s: string) =>
  new Date(s).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

export const fmtCur = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export const fmtNumber = (n: number) =>
  new Intl.NumberFormat("en-IN").format(n || 0);

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function getStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}
