"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  PlusSquare,
  User,
  Bell,
  ShieldCheck,
  TicketIcon,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import {
  hydrateSession,
  logout as logoutAction,
} from "@/lib/features/authSlice";

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const dispatch = useDispatch<AppDispatch>();
  const {
    user: profile,
    loading,
    hydrated,
  } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!hydrated) {
      dispatch(hydrateSession());
    }
  }, [hydrated, dispatch]);

  const logout = () => {
    dispatch(logoutAction());
    router.refresh();
    router.push("/");
  };

  // Icons and links
  const navItems = {
    group1: [
      {
        href: "/",
        label: "Home",
        icon: "/svgs/home.svg",
      },
      ...(profile?.role !== "ADMIN" && profile?.role !== "SUPER_ADMIN"
        ? [
            {
              href: "/tickets/my-tickets",
              label: "Bookings",
              icon: "/svgs/ticket.svg",
            },
          ]
        : []),
    ],
    group2: [{ href: "/profile", label: "Profile", icon: User }],
    group3: [
      ...(profile?.role === "LISTER"
        ? [
            { href: "/lister/events", label: "My Events", icon: PlusSquare },
            {
              href: "/lister/events/create",
              label: "Create Event",
              icon: PlusSquare,
            },
          ]
        : []),
      ...(profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN"
        ? [
            {
              href: "/admin/events/pending",
              label: "Admin – Pending",
              icon: ShieldCheck,
            },
          ]
        : []),
    ],
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`
        fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#ffffffb5]
        rounded-full p-[0.416666vw] backdrop-blur-md
        flex items-center gap-[0.347222vw] max-w-[423px]
      `}
    >
      {/* Group 1: Home + My Bookings */}
      <div className="relative flex items-center gap-[0.347vw] bg-white p-[5px] rounded-full md:w-fit">
        {navItems.group1.map(({ href, label, icon }) => {
          const isActive = pathname === href;

          return (
            <div key={href} className="relative">
              {isActive && (
                <motion.div
                  layoutId="nav-active-indicator"
                  className="absolute inset-0 z-0 bg-[#FFE348] border-b-[0.20833vw] border-[#FFDA0A] rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <Link
                href={href}
                className={`
            relative z-10 flex items-center gap-3
            justify-center text-center
            md:px-5 px-7 py-4 rounded-full
             transition-colors duration-200
            ${isActive ? "text-[#1E1E1E] font-semibold" : "text-zinc-600"}
          `}
              >
                <img src={icon} alt="" />
                <h5>{label}</h5>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Group 2: Notification + Profile */}
      <div className="md:flex items-center gap-4 bg-white p-[0.347vw] pl-[1vw] pr-1  rounded-full hidden">
        <button
          aria-label="Notifications"
          className="text-zinc-400 hover:text-[#1E1E1E] transition-colors relative"
        >
          <Bell size={20} strokeWidth={1.5} />
        </button>

        {navItems.group2.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center justify-center border w-[3.9583vw] h-[3.9583vw] md:gap-2 text-xs md:text-sm transition-all duration-200 rounded-full ${
                isActive ? "text-[#1E1E1E]" : "text-[#3D3D3D]"
              }`}
            >
              <Icon size={20} strokeWidth={1.5} />
            </Link>
          );
        })}
      </div>

      {/* Group 3: Lister/Admin Items */}
      {navItems.group3.length > 0 && (
        <div className="flex items-center gap-4 border-l border-zinc-300 pl-4">
          {navItems.group3.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`group flex flex-col md:flex-row items-center md:gap-2 text-xs md:text-sm transition-all duration-200 ${
                  isActive ? "text-[#1E1E1E] font-medium" : "text-zinc-600"
                }`}
              >
                <Icon size={20} strokeWidth={1.5} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </motion.nav>
  );
}
