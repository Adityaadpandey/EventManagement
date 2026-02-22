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
  payoutId: string;
  amount: number;
  approvedAmount?: number | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  lister?: {
    companyName?: string | null;
    user?: { name?: string | null; email?: string | null };
    BankDetails?: {
      accountHolderName?: string | null;
      accountNumber?: string | null;
      ifscCode?: string | null;
      bankName?: string | null;
    } | null;
  };
  event?: { title?: string | null };
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
  APPROVED:
    "bg-[var(--color-primary)]/15 text-[var(--color-neutral-dark2)] border border-[var(--color-primary)]",
  REJECTED:
    "bg-[var(--color-error-light)] text-[var(--color-error)] border border-[var(--color-error)]/20",
  PENDING:
    "bg-gray-100 text-[var(--color-neutral-dark3)] border border-gray-200",
  NOT_VIEWED:
    "bg-gray-100 text-[var(--color-neutral-dark4)] border border-gray-200",
  CANCELLATION_REQUESTED:
    "bg-[var(--color-error-light)] text-[var(--color-error)] border border-[var(--color-error)]/20",
  CANCELLED:
    "bg-gray-100 text-[var(--color-neutral-dark4)] border border-gray-200",
};

export const PAYOUT_STATUS_STYLES: Record<string, string> = {
  COMPLETED:
    "bg-[var(--color-primary)]/15 text-[var(--color-neutral-dark2)] border border-[var(--color-primary)]",
  PROCESSING:
    "bg-[var(--color-primary2)]/20 text-[var(--color-neutral-dark3)] border border-[var(--color-primary2)]",
  PENDING:
    "bg-gray-100 text-[var(--color-neutral-dark3)] border border-gray-200",
  FAILED:
    "bg-[var(--color-error-light)] text-[var(--color-error)] border border-[var(--color-error)]/20",
  CANCELLED:
    "bg-gray-100 text-[var(--color-neutral-dark4)] border border-gray-200",
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
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export type PayoutAction = "approve" | "complete" | "reject" | "reverse";

export const PAYOUT_ALLOWED_ACTIONS: Record<string, PayoutAction[]> = {
  PENDING: ["approve", "reject"],
  PROCESSING: ["complete", "reject"],
  COMPLETED: ["reverse"],
  FAILED: [],
  CANCELLED: [],
};

// ─── Event Actions ───────────────────────────────────────────────────────────

export type EventAction = "APPROVED" | "REJECTED" | "CANCELLED";

export const EVENT_ALLOWED_ACTIONS: Record<string, EventAction[]> = {
  NOT_VIEWED: ["APPROVED", "REJECTED"],
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["CANCELLED"],
  CANCELLATION_REQUESTED: ["CANCELLED"],
  REJECTED: [],
  CANCELLED: [],
};

export const CAN_TOGGLE_BUY = ["APPROVED"];

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
