"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  Banknote,
  ArrowLeft,
  Zap,
} from "lucide-react";

type Counts = { pending: number; payoutsAction: number };

const navItems = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
    badge: null as null | number,
  },
  {
    href: "/admin/events",
    label: "All Events",
    icon: CalendarDays,
    exact: true,
    badge: null as null | number,
  },
  {
    href: "/admin/events/pending",
    label: "Pending Review",
    icon: Clock,
    exact: false,
    badge: null as null | number,
  },
  {
    href: "/admin/payouts",
    label: "Payouts",
    icon: Banknote,
    exact: true,
    badge: null as null | number,
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

  const isActive = (href: string, exact = false) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const withBadges = navItems.map((item) => ({
    ...item,
    badge:
      item.href === "/admin/events/pending"
        ? counts.pending || null
        : item.href === "/admin/payouts"
          ? counts.payoutsAction || null
          : null,
  }));

  return (
    <div className="flex h-screen bg-[#eff0fb] overflow-hidden font-[family-name:var(--font-bricolage)]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-white border-r border-gray-100">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFE348] flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-[#1E1E1E]" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1E1E1E] leading-none">
                Tixin
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Admin Console</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {withBadges.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-[#FFE348] text-[#1E1E1E] shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-[#1E1E1E]"
                }`}
              >
                <item.icon
                  className="w-4 h-4 shrink-0"
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge != null && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                      active
                        ? "bg-[#1E1E1E] text-[#FFE348]"
                        : "bg-[#FFE348] text-[#1E1E1E]"
                    }`}
                  >
                    {item.badge}
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
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-[#1E1E1E] hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to site
          </Link>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-12 shrink-0 bg-white border-b border-gray-100 flex items-center px-6 gap-2 text-sm">
          <span className="text-gray-400">Admin</span>
          {pathname !== "/admin" && (
            <>
              <span className="text-gray-300">/</span>
              <span className="text-[#1E1E1E] font-medium capitalize">
                {pathname
                  .replace("/admin/events/pending", "Pending Review")
                  .replace("/admin/events/", "Event · ")
                  .replace("/admin/events", "Events")
                  .replace("/admin/payouts", "Payouts")
                  .replace("/admin/", "")}
              </span>
            </>
          )}
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
