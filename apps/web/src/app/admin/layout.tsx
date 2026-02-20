"use client";

import api from "@/lib/api";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Clock,
  LayoutDashboard,
  Menu,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Counts = { pending: number; payoutsAction: number };

const navItems = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/events",
    label: "All Events",
    icon: CalendarDays,
    exact: true,
  },
  {
    href: "/admin/events/pending",
    label: "Pending Review",
    icon: Clock,
    exact: false,
  },
  {
    href: "/admin/payouts",
    label: "Payouts",
    icon: Banknote,
    exact: true,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<Counts>({
    pending: 0,
    payoutsAction: 0,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/admin/get-all-pending-events").catch(() => null),
      api.get("/admin/payout/all").catch(() => null),
    ]).then(([pendRes, payRes]) => {
      const pendArr = Array.isArray(pendRes?.data?.data)
        ? pendRes.data.data
        : [];
      const payData = payRes?.data?.data;
      const payArr = Array.isArray(payData)
        ? payData
        : Array.isArray(payData?.payouts)
          ? payData.payouts
          : [];
      setCounts({
        pending: pendArr.length,
        payoutsAction: payArr.filter(
          (p: any) => p.status === "PENDING" || p.status === "APPROVED",
        ).length,
      });
    });
  }, [pathname]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close sidebar on escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const isActive = useCallback(
    (href: string, exact = false) =>
      exact
        ? pathname === href
        : pathname === href || pathname.startsWith(href + "/"),
    [pathname],
  );

  const getBadge = (href: string): number | null => {
    if (href === "/admin/events/pending") return counts.pending || null;
    if (href === "/admin/payouts") return counts.payoutsAction || null;
    return null;
  };

  const getBreadcrumb = (): string | null => {
    if (pathname === "/admin") return null;
    return pathname
      .replace("/admin/events/pending", "Pending Review")
      .replace(/\/admin\/events\/[^/]+/, "Event Detail")
      .replace("/admin/events", "Events")
      .replace("/admin/payouts", "Payouts")
      .replace("/admin/", "");
  };

  const breadcrumb = getBreadcrumb();

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)] flex items-center justify-center shadow-sm">
            <Zap
              className="w-4 h-4 text-[var(--color-neutral-dark2)]"
              strokeWidth={2.5}
            />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--color-neutral-dark2)] leading-none">
              Tixin
            </p>
            <p className="text-[11px] text-[var(--color-neutral-dark4)] mt-0.5">
              Admin Console
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          const badge = getBadge(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-[var(--color-primary)] text-[var(--color-neutral-dark2)] shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-[var(--color-neutral-dark2)]"
              }`}
            >
              <item.icon
                className="w-4 h-4 shrink-0"
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span className="flex-1">{item.label}</span>
              {badge != null && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    active
                      ? "bg-[var(--color-neutral-dark2)] text-[var(--color-primary)]"
                      : "bg-[var(--color-primary)] text-[var(--color-neutral-dark2)]"
                  }`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-gray-100 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-[var(--color-neutral-dark2)] hover:bg-gray-50 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to site
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden font-[family-name:var(--font-bricolage)]">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col bg-[var(--color-neutral-light)] border-r border-gray-100">
        {sidebarContent}
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          {/* Drawer */}
          <aside
            className="relative w-64 h-full flex flex-col bg-[var(--color-neutral-light)] shadow-2xl"
            style={{
              animation: "slideRight 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-3 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ── Content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-12 sm:h-14 shrink-0 bg-[var(--color-neutral-light)] border-b border-gray-100 flex items-center px-4 sm:px-6 gap-3 text-sm">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 -ml-1 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-500" />
          </button>

          {/* Mobile brand */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-6 h-6 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
              <Zap
                className="w-3 h-3 text-[var(--color-neutral-dark2)]"
                strokeWidth={2.5}
              />
            </div>
            <span className="text-xs font-bold text-[var(--color-neutral-dark2)]">
              Tixin
            </span>
          </div>

          {/* Breadcrumb (desktop) */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-[var(--color-neutral-dark4)]">Admin</span>
            {breadcrumb && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-[var(--color-neutral-dark2)] font-medium">
                  {breadcrumb}
                </span>
              </>
            )}
          </div>

          {/* Breadcrumb (mobile) */}
          {breadcrumb && (
            <span className="lg:hidden text-xs font-medium text-[var(--color-neutral-dark2)] ml-auto">
              {breadcrumb}
            </span>
          )}
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>

      {/* ── Mobile bottom nav ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-[var(--color-neutral-light)] border-t border-gray-100 safe-area-bottom">
        <div className="flex items-center justify-around py-1.5">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const badge = getBadge(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  active ? "text-[var(--color-neutral-dark2)]" : "text-gray-400"
                }`}
              >
                <div className="relative">
                  <item.icon
                    className="w-5 h-5"
                    strokeWidth={active ? 2.2 : 1.6}
                  />
                  {badge != null && (
                    <span className="absolute -top-1.5 -right-2 text-[8px] font-bold bg-[var(--color-primary)] text-[var(--color-neutral-dark2)] min-w-[14px] h-[14px] rounded-full flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && (
                  <div className="absolute -top-1.5 w-6 h-0.5 rounded-full bg-[var(--color-primary)]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Slide animation keyframe */}
      <style jsx>{`
        @keyframes slideRight {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </div>
  );
}
