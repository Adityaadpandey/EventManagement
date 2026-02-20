"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Building2,
  Banknote,
} from "lucide-react";

type Payout = {
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

type Action = "approve" | "complete" | "reject" | "reverse";

const STATUS_PILL: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  APPROVED: "bg-blue-50 text-blue-700 border border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  REJECTED: "bg-red-50 text-red-600 border border-red-200",
  REVERSED: "bg-orange-50 text-orange-700 border border-orange-200",
};

const ALLOWED_ACTIONS: Record<string, Action[]> = {
  PENDING: ["approve", "reject"],
  APPROVED: ["complete", "reject"],
  COMPLETED: ["reverse"],
  REJECTED: [],
  REVERSED: [],
};

const ACTION_CONFIG: Record<
  Action,
  { label: string; icon: React.FC<any>; className: string }
> = {
  approve: {
    label: "Approve",
    icon: CheckCircle2,
    className:
      "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100",
  },
  complete: {
    label: "Complete",
    icon: Check,
    className: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
  },
  reject: {
    label: "Reject",
    icon: XCircle,
    className: "bg-white text-red-500 border border-red-200 hover:bg-red-50",
  },
  reverse: {
    label: "Reverse",
    icon: RotateCcw,
    className:
      "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100",
  },
};

const ALL_STATUSES = [
  "ALL",
  "PENDING",
  "APPROVED",
  "COMPLETED",
  "REJECTED",
  "REVERSED",
] as const;

const fmtCur = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function Toast({
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
  }, []);
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl text-sm font-medium shadow-lg border ${
        ok
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-red-50 text-red-600 border-red-200"
      }`}
    >
      {msg}
    </div>
  );
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, []);

  const doAction = async (payoutId: string, action: Action) => {
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

  const filtered = payouts.filter(
    (p) => statusFilter === "ALL" || p.status === statusFilter,
  );

  if (loading)
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-[#FFE348]" />
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center h-full gap-2 text-sm text-red-500">
        <AlertCircle className="w-4 h-4" /> {error}
      </div>
    );

  const completedTotal = payouts
    .filter((p) => p.status === "COMPLETED")
    .reduce((s, p) => s + p.amount, 0);
  const pendingTotal = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-6 space-y-5 pb-10">
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E1E1E]">Payouts</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Manage lister withdrawal requests
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Requests",
            value: payouts.length,
            sub: "all time",
            icon: Banknote,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
          },
          {
            label: "Pending Amount",
            value: fmtCur(pendingTotal),
            sub: `${payouts.filter((p) => p.status === "PENDING").length} requests`,
            icon: Loader2,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Total Paid Out",
            value: fmtCur(completedTotal),
            sub: "completed payouts",
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Needs Action",
            value: payouts.filter((p) => ALLOWED_ACTIONS[p.status]?.length > 0)
              .length,
            sub: "approve or complete",
            icon: RotateCcw,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          >
            <div
              className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}
            >
              <card.icon
                className={`w-4.5 h-4.5 ${card.color}`}
                strokeWidth={1.8}
              />
            </div>
            <p className="text-xl font-bold text-[#1E1E1E] tabular-nums">
              {card.value}
            </p>
            <p className="text-sm font-medium text-[#1E1E1E] mt-1">
              {card.label}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-2 flex-wrap">
        {ALL_STATUSES.map((s) => {
          const count =
            s === "ALL"
              ? payouts.length
              : payouts.filter((p) => p.status === s).length;
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                active
                  ? "bg-[#FFE348] text-[#1E1E1E] shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s === "ALL" ? "All" : s} · {count}
            </button>
          );
        })}
      </div>

      {/* Payouts list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
            <Banknote className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-300">No payouts with this status</p>
          </div>
        ) : (
          filtered.map((payout) => {
            const actions = ALLOWED_ACTIONS[payout.status] || [];
            const isExp = expanded === payout.id;

            return (
              <div
                key={payout.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Main row */}
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer hover:bg-[#eff0fb]/30 transition-colors"
                  onClick={() => setExpanded(isExp ? null : payout.id)}
                >
                  {/* Lister icon */}
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <Building2
                      className="w-5 h-5 text-gray-400"
                      strokeWidth={1.5}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-bold text-[#1E1E1E] tabular-nums">
                        {fmtCur(payout.amount)}
                      </p>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_PILL[payout.status] || "bg-gray-100 text-gray-500"}`}
                      >
                        {payout.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      <p className="text-xs text-gray-500">
                        {payout.lister?.companyName ||
                          payout.lister?.user?.name ||
                          payout.lister?.user?.email ||
                          "Unknown lister"}
                      </p>
                      {payout.event?.title && (
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">
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
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actions.map((action) => {
                      const cfg = ACTION_CONFIG[action];
                      const key = `${payout.id}-${action}`;
                      const isActing = acting === key;
                      return (
                        <button
                          key={action}
                          disabled={!!acting}
                          onClick={() => doAction(payout.id, action)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-50 ${cfg.className}`}
                        >
                          {isActing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <cfg.icon
                              className="w-3.5 h-3.5"
                              strokeWidth={2.5}
                            />
                          )}
                          {cfg.label}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setExpanded(isExp ? null : payout.id)}
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
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-300 mb-3">
                      Bank Details
                    </p>
                    {payout.bankDetails ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          {
                            label: "Account Holder",
                            value: payout.bankDetails.accountHolderName,
                          },
                          {
                            label: "Account Number",
                            value: payout.bankDetails.accountNumber,
                          },
                          {
                            label: "IFSC Code",
                            value: payout.bankDetails.ifsc,
                          },
                          {
                            label: "Bank Name",
                            value: payout.bankDetails.bankName,
                          },
                        ].map((f) =>
                          f.value ? (
                            <div key={f.label}>
                              <p className="text-[11px] text-gray-400">
                                {f.label}
                              </p>
                              <p className="text-sm font-semibold text-[#1E1E1E] mt-0.5 font-mono tracking-wide">
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
          })
        )}
      </div>
    </div>
  );
}
