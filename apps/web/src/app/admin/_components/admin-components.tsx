"use client";

import { AlertCircle, Loader2, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import {
  EVENT_STATUS_STYLES,
  PAYOUT_STATUS_STYLES,
  getStatusLabel,
} from "../_lib/admin-utils";

// ─── Toast ───────────────────────────────────────────────────────────────────

export function Toast({
  msg,
  ok,
  onDone,
}: {
  msg: string;
  ok: boolean;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-lg border backdrop-blur-sm transition-all animate-[slideUp_0.3s_ease-out] ${
        ok
          ? "bg-emerald-50/95 text-emerald-700 border-emerald-200"
          : "bg-red-50/95 text-red-600 border-red-200"
      }`}
    >
      {msg}
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────

export function StatusBadge({
  status,
  type = "event",
  className = "",
}: {
  status: string;
  type?: "event" | "payout";
  className?: string;
}) {
  const styles = type === "payout" ? PAYOUT_STATUS_STYLES : EVENT_STATUS_STYLES;
  return (
    <span
      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
        styles[status] || "bg-gray-100 text-gray-500 border border-gray-200"
      } ${className}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

// ─── Page Header ─────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
}: {
  title: string;
  subtitle?: string;
  badge?: number | null;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-neutral-dark2)]">
            {title}
          </h1>
          {badge != null && badge > 0 && (
            <span className="text-xs font-bold bg-[var(--color-primary)] text-[var(--color-neutral-dark2)] px-2.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-[var(--color-neutral-dark4)] mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="shrink-0 flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

// ─── Stat / Metric Card ─────────────────────────────────────────────────────

export function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
  urgent,
  href,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  urgent?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}
        >
          <Icon className={`w-[18px] h-[18px] ${color}`} strokeWidth={1.8} />
        </div>
        {urgent && (
          <span className="text-[10px] font-bold bg-[var(--color-primary)] text-[var(--color-neutral-dark2)] px-2 py-0.5 rounded-full">
            Action
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-[var(--color-neutral-dark2)] tabular-nums leading-none">
        {value}
      </p>
      <p className="text-sm font-medium text-[var(--color-neutral-dark2)] mt-1.5">
        {label}
      </p>
      {sub && (
        <p className="text-xs text-[var(--color-neutral-dark4)] mt-0.5">
          {sub}
        </p>
      )}
    </>
  );

  const cls =
    "bg-[var(--color-neutral-light)] rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-[var(--color-primary)]/30 transition-all duration-200";

  if (href) {
    // We use an anchor instead of Next Link to avoid importing it
    return (
      <a href={href} className={`block ${cls}`}>
        {content}
      </a>
    );
  }
  if (onClick) {
    return (
      <button onClick={onClick} className={`text-left w-full ${cls}`}>
        {content}
      </button>
    );
  }
  return <div className={cls}>{content}</div>;
}

export function StatCard({
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
    <div className="bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm p-4">
      <div
        className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-3`}
      >
        {icon}
      </div>
      <p className="text-xl font-bold text-[var(--color-neutral-dark2)] tabular-nums">
        {value}
      </p>
      <p className="text-xs text-[var(--color-neutral-dark4)] mt-1">{label}</p>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-neutral-light)] rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 sm:py-20 gap-4 px-6">
      <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
        <Icon className="w-7 h-7 text-gray-300" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <p className="text-base font-bold text-[var(--color-neutral-dark2)]">
          {title}
        </p>
        {subtitle && (
          <p className="text-sm text-[var(--color-neutral-dark4)] mt-1 max-w-xs mx-auto">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ─── Full Page Loading ───────────────────────────────────────────────────────

export function PageLoading() {
  return (
    <div className="flex items-center justify-center h-full min-h-[40vh]">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
    </div>
  );
}

export function PageError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[40vh] gap-2 text-sm text-red-500">
      <AlertCircle className="w-4 h-4" /> {message}
    </div>
  );
}

// ─── Skeleton Loaders ────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />
  );
}

export function SkeletonMetricCard() {
  return (
    <div className="bg-[var(--color-neutral-light)] rounded-2xl p-5 shadow-sm border border-gray-100">
      <Skeleton className="w-9 h-9 rounded-xl mb-4" />
      <Skeleton className="h-7 w-16 mb-2" />
      <Skeleton className="h-4 w-24 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <Skeleton className={`h-4 ${i === 0 ? "w-32" : "w-20"}`} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[var(--color-neutral-light)] rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function SkeletonListSection({
  rows = 4,
  header = true,
}: {
  rows?: number;
  header?: boolean;
}) {
  return (
    <div className="bg-[var(--color-neutral-light)] rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {header && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      )}
      <div className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chart Card Wrapper ──────────────────────────────────────────────────────

export function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm p-5">
      <p className="text-sm font-bold text-[var(--color-neutral-dark2)] mb-4">
        {title}
      </p>
      {children}
    </div>
  );
}

// ─── Filter Pill Button ──────────────────────────────────────────────────────

export function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap ${
        active
          ? "bg-[var(--color-primary)] text-[var(--color-neutral-dark2)] shadow-sm"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      {label} · {count}
    </button>
  );
}

// ─── Info Card (for event detail) ────────────────────────────────────────────

export function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-[var(--color-neutral-light)] border border-gray-100 rounded-2xl shadow-sm p-4">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--color-neutral-dark4)]">{label}</p>
        <p className="text-sm font-semibold text-[var(--color-neutral-dark2)] mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ──────────────────────────────────────────────────────────

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  confirmClassName,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm bg-[var(--color-neutral-light)] rounded-2xl shadow-xl border border-gray-100 p-6 animate-[slideUp_0.2s_ease-out]">
        <h3 className="text-base font-bold text-[var(--color-neutral-dark2)]">
          {title}
        </h3>
        <p className="text-sm text-[var(--color-neutral-dark4)] mt-2 leading-relaxed">
          {description}
        </p>
        <div className="flex items-center gap-2 mt-5 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${
              confirmClassName || "bg-red-500 text-white hover:bg-red-600"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
