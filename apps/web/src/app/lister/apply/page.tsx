"use client";

import api, { apiUtils } from "@/lib/api";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ListerApplyPage() {
  const router = useRouter();

  const [form, setForm] = useState({ companyName: "", bio: "" });
  const [errors, setErrors] = useState<{ companyName?: string; bio?: string }>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.companyName.trim()) errs.companyName = "Company name is required";
    else if (form.companyName.trim().length < 2)
      errs.companyName = "Must be at least 2 characters";
    if (!form.bio.trim()) errs.bio = "Bio is required";
    else if (form.bio.trim().length < 20)
      errs.bio = "Bio must be at least 20 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError(null);

    try {
      const res = await api.post("/lister/apply", {
        companyName: form.companyName.trim(),
        bio: form.bio.trim(),
      });

      const token = res.data?.data?.token;
      if (token) {
        // Replace the old USER token with the new LISTER token
        apiUtils.setToken(token);
        localStorage.setItem("token", token);
      }

      setSuccess(true);
      setTimeout(() => router.push("/lister"), 2000);
    } catch (e: any) {
      setApiError(
        e?.response?.data?.message || "Failed to apply. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#eff0fb] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Application Submitted!
          </h2>
          <p className="text-gray-500 text-sm">
            Welcome aboard! Redirecting you to your lister dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eff0fb]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Become a Lister</h1>
            <p className="text-xs text-gray-500">
              Start hosting events on Tixin
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Hero */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              List your events with Tixin
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Create and manage events, sell tickets, and receive payouts
              directly to your bank account. Fill in your company details below
              to get started.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Company / Organisation Name
                <span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, companyName: e.target.value }))
                }
                placeholder="e.g. XYZ eSports"
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all ${
                  errors.companyName
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200"
                }`}
              />
              {errors.companyName && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.companyName}
                </p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                About your organisation
                <span className="text-red-400 ml-0.5">*</span>
              </label>
              <textarea
                value={form.bio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bio: e.target.value }))
                }
                rows={5}
                placeholder="Tell us about your company, the type of events you host, and your vision…"
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all resize-none ${
                  errors.bio ? "border-red-300 bg-red-50" : "border-gray-200"
                }`}
              />
              <div className="flex items-center justify-between mt-1">
                {errors.bio ? (
                  <p className="text-xs text-red-500">{errors.bio}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-gray-400 ml-auto">
                  {form.bio.length} chars
                </p>
              </div>
            </div>

            {/* API error */}
            {apiError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {apiError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
              {submitting ? "Submitting…" : "Apply as Lister"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400">
          By applying you agree to Tixin&apos;s{" "}
          <Link href="/terms-and-conditions" className="underline">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
