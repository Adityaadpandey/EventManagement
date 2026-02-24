"use client";

import api from "@/lib/api";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  Edit2,
  Loader2,
  Lock,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountData {
  balance: number;
  payoutStats: {
    totalRevenue: number;
    availableBalance: number;
    lockedFunds: number;
    completedPayouts: number;
  };
}

interface BankDetails {
  bankDetailsId?: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  branchCode?: string;
}

interface Payout {
  payoutId: string;
  amount: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  type: "FULL" | "PARTIAL";
  createdAt: string;
  updatedAt: string;
  remark?: string | null;
  event?: { title?: string | null; eventId?: string | null } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCur = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  PROCESSING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  FAILED: "bg-red-50 text-red-600 border border-red-200",
  CANCELLED: "bg-gray-100 text-gray-500 border border-gray-200",
};

const STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || "bg-gray-100 text-gray-500 border border-gray-200"}`}
    >
      {status}
    </span>
  );
}

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
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold ${
        ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      {msg}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ListerPayoutsPage() {
  // Data state
  const [account, setAccount] = useState<AccountData | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  // UI state
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Forms
  const [bankForm, setBankForm] = useState({
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    branchCode: "",
  });
  const [payoutForm, setPayoutForm] = useState<{
    type: "FULL" | "PARTIAL";
    amount: string;
  }>({ type: "FULL", amount: "" });

  // Bank form validation errors
  const [bankErrors, setBankErrors] = useState<Partial<typeof bankForm>>({});

  // ─── Fetchers ────────────────────────────────────────────────────────────────

  const fetchAccount = useCallback(async () => {
    try {
      const res = await api.get("/lister/account");
      setAccount(res.data?.data || res.data);
    } catch {
      // silently ignore – shown via loading
    }
  }, []);

  const fetchBankDetails = useCallback(async () => {
    try {
      const res = await api.get("/lister/bank/details");
      const d = res.data?.data || res.data;
      // API returns Lister object with nested BankDetails (capital B)
      const bd = d?.BankDetails || d;
      if (bd && bd.bankName) {
        setBankDetails(bd);
        setBankForm({
          bankName: bd.bankName || "",
          accountNumber: bd.accountNumber || "",
          ifscCode: bd.ifscCode || "",
          accountHolderName: bd.accountHolderName || "",
          branchCode: bd.branchCode || "",
        });
      }
    } catch {
      // No bank details yet
    }
  }, []);

  const fetchPayouts = useCallback(async () => {
    try {
      const res = await api.get("/payout");
      const d = res.data?.data || res.data;
      setPayouts(
        Array.isArray(d) ? d : Array.isArray(d?.payouts) ? d.payouts : [],
      );
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchAccount(), fetchBankDetails(), fetchPayouts()]);
      setLoading(false);
    };
    if (typeof window !== "undefined") init();
  }, [fetchAccount, fetchBankDetails, fetchPayouts]);

  // Auto-fill amount on FULL payout
  useEffect(() => {
    if (payoutForm.type === "FULL" && account) {
      setPayoutForm((f) => ({
        ...f,
        amount: String(account.payoutStats?.availableBalance ?? 0),
      }));
    } else if (payoutForm.type === "PARTIAL") {
      setPayoutForm((f) => ({ ...f, amount: "" }));
    }
  }, [payoutForm.type, account]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const validateBank = (): boolean => {
    const errs: Partial<typeof bankForm> = {};
    if (!bankForm.bankName.trim()) errs.bankName = "Required";
    if (!bankForm.accountNumber.trim()) errs.accountNumber = "Required";
    if (!bankForm.ifscCode.trim()) {
      errs.ifscCode = "Required";
    } else if (!IFSC_REGEX.test(bankForm.ifscCode.toUpperCase())) {
      errs.ifscCode = "Invalid IFSC (e.g. SBIN0123456)";
    }
    if (!bankForm.accountHolderName.trim()) errs.accountHolderName = "Required";
    setBankErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveBank = async () => {
    if (!validateBank()) return;
    setSavingBank(true);
    try {
      const payload = {
        ...bankForm,
        ifscCode: bankForm.ifscCode.toUpperCase(),
      };
      await api.post("/lister/bank/details", payload);
      setToast({ msg: "Bank details saved", ok: true });
      setShowBankForm(false);
      await fetchBankDetails();
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || "Failed to save bank details",
        ok: false,
      });
    } finally {
      setSavingBank(false);
    }
  };

  const handleRequestPayout = async () => {
    const available = account?.payoutStats?.availableBalance ?? 0;
    if (!bankDetails) return;
    if (available <= 0) {
      setToast({ msg: "No available balance", ok: false });
      return;
    }

    const amt = parseFloat(payoutForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setToast({ msg: "Enter a valid amount", ok: false });
      return;
    }
    if (payoutForm.type === "PARTIAL" && amt < 100) {
      setToast({ msg: "Minimum partial payout is ₹100", ok: false });
      return;
    }
    if (amt > available) {
      setToast({ msg: "Amount exceeds available balance", ok: false });
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/payout/request", {
        amount: amt,
        type: payoutForm.type,
      });
      setToast({ msg: "Payout requested successfully!", ok: true });
      await Promise.all([fetchAccount(), fetchPayouts()]);
      setPayoutForm({ type: "FULL", amount: "" });
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || "Failed to request payout",
        ok: false,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (payoutId: string) => {
    if (!confirm("Cancel this payout request?")) return;
    setCancellingId(payoutId);
    try {
      await api.patch(`/payout/${payoutId}/cancel`);
      setToast({ msg: "Payout cancelled", ok: true });
      await fetchPayouts();
    } catch (e: any) {
      setToast({
        msg: e?.response?.data?.message || "Failed to cancel payout",
        ok: false,
      });
    } finally {
      setCancellingId(null);
    }
  };

  // ─── Derived ──────────────────────────────────────────────────────────────────

  const available = account?.payoutStats?.availableBalance ?? 0;
  const locked = account?.payoutStats?.lockedFunds ?? 0;
  const totalRevenue = account?.payoutStats?.totalRevenue ?? 0;

  const filteredPayouts = payouts.filter(
    (p) => filter === "ALL" || p.status === filter,
  );

  const canRequestPayout = !!bankDetails && available > 0 && !submitting;

  // ─── Loading Skeleton ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eff0fb] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#eff0fb] pb-24">
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/lister"
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Payouts & Earnings
            </h1>
            <p className="text-xs text-gray-500">Manage your withdrawals</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* ── Account Balance Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
              Account Balance
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Revenue */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs text-gray-500 font-medium">
                  Total Revenue
                </p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {fmtCur(totalRevenue)}
              </p>
            </div>

            {/* Available Balance */}
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center gap-1.5 mb-1">
                <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                <p className="text-xs text-emerald-600 font-medium">
                  Available
                </p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                {fmtCur(available)}
              </p>
            </div>

            {/* Locked Funds */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <div className="flex items-center gap-1.5 mb-1">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-xs text-amber-600 font-medium">Locked</p>
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {fmtCur(locked)}
              </p>
              <p className="text-xs text-amber-500 mt-0.5">
                Pending/Processing
              </p>
            </div>
          </div>
        </div>

        {/* ── Bank Details Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                Bank Details
              </h2>
            </div>
            {bankDetails && !showBankForm && (
              <button
                onClick={() => setShowBankForm(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:brightness-90 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
            {showBankForm && (
              <button
                onClick={() => setShowBankForm(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* No bank details – CTA */}
          {!bankDetails && !showBankForm && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  No bank account linked
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Add your bank details to request payouts
                </p>
              </div>
              <button
                onClick={() => setShowBankForm(true)}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-white text-sm font-bold rounded-xl transition-colors shrink-0"
              >
                Add Bank Details
              </button>
            </div>
          )}

          {/* Display existing bank details */}
          {bankDetails && !showBankForm && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  label: "Account Holder",
                  value: bankDetails.accountHolderName,
                },
                {
                  label: "Account Number",
                  value: `••••${bankDetails.accountNumber.slice(-4)}`,
                },
                { label: "IFSC Code", value: bankDetails.ifscCode },
                { label: "Bank Name", value: bankDetails.bankName },
              ].map((f) => (
                <div key={f.label}>
                  <p className="text-xs text-gray-400">{f.label}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5 font-mono">
                    {f.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Inline bank form */}
          {showBankForm && (
            <div className="space-y-3">
              {[
                {
                  key: "accountHolderName" as const,
                  label: "Account Holder Name",
                  placeholder: "Full name as per bank",
                },
                {
                  key: "bankName" as const,
                  label: "Bank Name",
                  placeholder: "e.g. State Bank of India",
                },
                {
                  key: "accountNumber" as const,
                  label: "Account Number",
                  placeholder: "Account number",
                },
                {
                  key: "ifscCode" as const,
                  label: "IFSC Code",
                  placeholder: "e.g. SBIN0123456",
                  upper: true,
                },
                {
                  key: "branchCode" as const,
                  label: "Branch Code (optional)",
                  placeholder: "Branch code",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    {f.label}
                  </label>
                  <input
                    value={bankForm[f.key]}
                    onChange={(e) =>
                      setBankForm((prev) => ({
                        ...prev,
                        [f.key]: f.upper
                          ? e.target.value.toUpperCase()
                          : e.target.value,
                      }))
                    }
                    placeholder={f.placeholder}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all ${
                      bankErrors[f.key]
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200"
                    }`}
                  />
                  {bankErrors[f.key] && (
                    <p className="text-xs text-red-500 mt-0.5">
                      {bankErrors[f.key]}
                    </p>
                  )}
                </div>
              ))}
              <button
                onClick={handleSaveBank}
                disabled={savingBank}
                className="w-full py-2.5 bg-[var(--color-primary)] hover:brightness-95 text-black text-sm font-bold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              >
                {savingBank ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                {savingBank ? "Saving…" : "Save Bank Details"}
              </button>
            </div>
          )}
        </div>

        {/* ── Request Payout (only if bank details exist) ── */}
        {bankDetails && !showBankForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Banknote className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                Request Payout
              </h2>
            </div>

            {available <= 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400">
                  No available balance to withdraw.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Type toggle */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    Payout Type
                  </p>
                  <div className="flex gap-2">
                    {(["FULL", "PARTIAL"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() =>
                          setPayoutForm((f) => ({ ...f, type: t }))
                        }
                        className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                          payoutForm.type === t
                            ? "bg-[var(--color-primary)] text-black border-[var(--color-primary)]"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {t === "FULL" ? "Full Balance" : "Partial"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={payoutForm.amount}
                      readOnly={payoutForm.type === "FULL"}
                      onChange={(e) =>
                        setPayoutForm((f) => ({
                          ...f,
                          amount: e.target.value,
                        }))
                      }
                      placeholder={
                        payoutForm.type === "PARTIAL" ? "Min ₹100" : ""
                      }
                      className={`w-full pl-7 pr-3 py-2.5 rounded-xl border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all ${
                        payoutForm.type === "FULL"
                          ? "text-gray-400 cursor-not-allowed"
                          : "border-gray-200"
                      }`}
                    />
                  </div>
                  {payoutForm.type === "PARTIAL" && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Available: {fmtCur(available)} · Minimum: ₹100
                    </p>
                  )}
                </div>

                <button
                  onClick={handleRequestPayout}
                  disabled={!canRequestPayout}
                  className="w-full py-3 bg-[var(--color-primary)] hover:brightness-95 text-black text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Banknote className="w-4 h-4" />
                  )}
                  {submitting ? "Requesting…" : "Request Payout"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Payout History ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
              Payout History
            </h2>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {STATUS_FILTERS.map((s) => {
              const count =
                s === "ALL"
                  ? payouts.length
                  : payouts.filter((p) => p.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    filter === s
                      ? "bg-[var(--color-primary)] text-black"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                  {count > 0 && (
                    <span
                      className={`ml-1 ${filter === s ? "opacity-75" : "opacity-60"}`}
                    >
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Payout cards */}
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-10">
              <Banknote className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No payouts found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPayouts.map((payout) => (
                <div
                  key={payout.payoutId}
                  className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-bold text-gray-900">
                          {fmtCur(payout.amount)}
                        </p>
                        <StatusBadge status={payout.status} />
                        <span className="text-xs text-gray-400">
                          {payout.type}
                        </span>
                      </div>
                      {payout.event?.title && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {payout.event.title}
                        </p>
                      )}
                      {payout.remark && (
                        <p className="text-xs text-gray-400 mt-0.5 italic">
                          {payout.remark}
                        </p>
                      )}
                      <p className="text-xs text-gray-300 mt-1">
                        {fmtDate(payout.createdAt)}
                      </p>
                    </div>

                    {/* Cancel button – only for PENDING */}
                    {payout.status === "PENDING" && (
                      <button
                        onClick={() => handleCancel(payout.payoutId)}
                        disabled={cancellingId === payout.payoutId}
                        className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {cancellingId === payout.payoutId ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
