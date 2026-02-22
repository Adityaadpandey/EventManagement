"use client";

import api from "@/lib/api";
import {
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  FilterPill,
  MetricCard,
  PageError,
  PageHeader,
  SkeletonCard,
  SkeletonMetricCard,
  StatusBadge,
  Toast,
} from "../_components/admin-components";
import {
  type AdminPayout,
  type PayoutAction,
  PAYOUT_ALLOWED_ACTIONS,
  PAYOUT_STATUSES,
  fmtCur,
  fmtDate,
  getStatusLabel,
} from "../_lib/admin-utils";

const ACTION_CONFIG: Record<
  PayoutAction,
  { label: string; icon: React.FC<any>; className: string }
> = {
  approve: {
    label: "Approve",
    icon: CheckCircle2,
    className:
      "bg-[var(--color-primary)]/15 text-[var(--color-neutral-dark2)] border border-[var(--color-primary)] hover:bg-[var(--color-primary)]/25",
  },
  complete: {
    label: "Complete",
    icon: Check,
    className:
      "bg-[var(--color-primary)] text-[var(--color-neutral-dark2)] hover:bg-[var(--color-primary2)] shadow-sm",
  },
  reject: {
    label: "Reject",
    icon: XCircle,
    className:
      "bg-[var(--color-neutral-light)] text-[var(--color-error)] border border-[var(--color-error)]/20 hover:bg-[var(--color-error-light)]",
  },
  reverse: {
    label: "Reverse",
    icon: RotateCcw,
    className:
      "bg-gray-100 text-[var(--color-neutral-dark3)] border border-gray-200 hover:bg-gray-200",
  },
};

function AdminPayoutsContent() {
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/payout/all");
      const d = res.data?.data;
      setPayouts(
        Array.isArray(d) ? d : Array.isArray(d?.payouts) ? d.payouts : [],
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      load();
    }
  }, [load]);

  const doAction = async (payoutId: string, action: PayoutAction) => {
    const label = ACTION_CONFIG[action].label.toLowerCase();
    if (!confirm(`${ACTION_CONFIG[action].label} this payout?`)) return;
    setActing(`${payoutId}-${action}`);
    try {
      await api.patch(`/admin/payout/${payoutId}/${action}`);
      setToast({ msg: `Payout ${label}d successfully`, ok: true });
      await load();
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || `Failed to ${label}`,
        ok: false,
      });
    } finally {
      setActing(null);
    }
  };

  const filtered = useMemo(
    () =>
      payouts.filter(
        (p) => statusFilter === "ALL" || p.status === statusFilter,
      ),
    [payouts, statusFilter],
  );

  if (error) return <PageError message={error} />;

  const completedTotal = payouts
    .filter((p) => p.status === "COMPLETED")
    .reduce((s, p) => s + p.amount, 0);
  const pendingTotal = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 pb-24 lg:pb-10">
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />
      )}

      <PageHeader
        title="Payouts"
        subtitle="Manage lister withdrawal requests"
      />

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonMetricCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Total Requests"
            value={payouts.length}
            sub="all time"
            icon={Banknote}
            color="text-[var(--color-neutral-dark3)]"
            bg="bg-gray-100"
          />
          <MetricCard
            label="Pending Amount"
            value={fmtCur(pendingTotal)}
            sub={`${payouts.filter((p) => p.status === "PENDING").length} requests`}
            icon={Loader2}
            color="text-[var(--color-neutral-dark3)]"
            bg="bg-gray-100"
          />
          <MetricCard
            label="Total Paid Out"
            value={fmtCur(completedTotal)}
            sub="completed payouts"
            icon={CheckCircle2}
            color="text-[var(--color-neutral-dark2)]"
            bg="bg-[var(--color-primary)]/10"
          />
          <MetricCard
            label="Needs Action"
            value={
              payouts.filter(
                (p) => (PAYOUT_ALLOWED_ACTIONS[p.status]?.length ?? 0) > 0,
              ).length
            }
            sub="approve or complete"
            icon={RotateCcw}
            color="text-[var(--color-neutral-dark2)]"
            bg="bg-[var(--color-primary2)]/15"
          />
        </div>
      )}

      {/* Status filter */}
      <div className="bg-[var(--color-neutral-light)] rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 flex items-center gap-2 flex-wrap">
        {PAYOUT_STATUSES.map((s) => {
          const count =
            s === "ALL"
              ? payouts.length
              : payouts.filter((p) => p.status === s).length;
          return (
            <FilterPill
              key={s}
              label={s === "ALL" ? "All" : getStatusLabel(s)}
              count={count}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          );
        })}
      </div>

      {/* Payouts list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="No payouts with this status"
          subtitle="Try changing the status filter"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((payout) => {
            const actions = PAYOUT_ALLOWED_ACTIONS[payout.status] || [];
            const isExp = expanded === payout.payoutId;

            return (
              <div
                key={payout.payoutId}
                className="bg-[var(--color-neutral-light)] rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Main row */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 cursor-pointer hover:bg-[var(--background)]/30 transition-colors"
                  onClick={() => setExpanded(isExp ? null : payout.payoutId)}
                >
                  {/* Lister icon */}
                  <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gray-100 items-center justify-center shrink-0">
                    <Building2
                      className="w-5 h-5 text-gray-400"
                      strokeWidth={1.5}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-bold text-[var(--color-neutral-dark2)] tabular-nums">
                        {fmtCur(payout.amount)}
                      </p>
                      <StatusBadge status={payout.status} type="payout" />
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      <p className="text-xs text-gray-500">
                        {payout.lister?.companyName ||
                          payout.lister?.user?.name ||
                          payout.lister?.user?.email ||
                          "Unknown lister"}
                      </p>
                      {payout.event?.title && (
                        <p className="text-xs text-[var(--color-neutral-dark4)] truncate max-w-[200px]">
                          {payout.event.title}
                        </p>
                      )}
                      <p className="text-xs text-gray-300">
                        {fmtDate(payout.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div
                    className="flex items-center gap-2 shrink-0 flex-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actions.map((action) => {
                      const cfg = ACTION_CONFIG[action];
                      if (!cfg) return null;
                      const key = `${payout.payoutId}-${action}`;
                      const isActing = acting === key;
                      const ActionIcon = cfg.icon;

                      return (
                        <button
                          key={action}
                          disabled={!!acting}
                          onClick={() => doAction(payout.payoutId, action)}
                          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all disabled:opacity-50 ${cfg.className}`}
                        >
                          {isActing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ActionIcon
                              className="w-3.5 h-3.5"
                              strokeWidth={2.5}
                            />
                          )}
                          {cfg.label}
                        </button>
                      );
                    })}
                    <button
                      onClick={() =>
                        setExpanded(isExp ? null : payout.payoutId)
                      }
                      className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      {isExp ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-300" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Bank details */}
                {isExp && (
                  <div className="border-t border-gray-100 px-4 sm:px-5 py-4 bg-gray-50/50">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-300 mb-3">
                      Bank Details
                    </p>
                    {payout.lister?.BankDetails ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          {
                            label: "Account Holder",
                            value: payout.lister.BankDetails.accountHolderName,
                          },
                          {
                            label: "Account Number",
                            value: payout.lister.BankDetails.accountNumber,
                          },
                          {
                            label: "IFSC Code",
                            value: payout.lister.BankDetails.ifscCode,
                          },
                          {
                            label: "Bank Name",
                            value: payout.lister.BankDetails.bankName,
                          },
                        ].map((f) =>
                          f.value ? (
                            <div key={f.label}>
                              <p className="text-[11px] text-[var(--color-neutral-dark4)]">
                                {f.label}
                              </p>
                              <p className="text-sm font-semibold text-[var(--color-neutral-dark2)] mt-0.5 font-mono tracking-wide">
                                {f.value}
                              </p>
                            </div>
                          ) : null,
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-300">
                        No bank details on record
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminPayoutsContent;
