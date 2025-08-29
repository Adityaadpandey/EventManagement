"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { usePathname } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import {
  hydrateSession,
  logout as logoutAction,
} from "@/lib/features/authSlice";

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

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

  const navItems = [
    { href: "/", label: "Home", icon: Home },
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

    ...(profile?.role !== "ADMIN" && profile?.role !== "SUPER_ADMIN"
      ? [
          {
            href: "/tickets/my-tickets",
            label: "My Bookings",
            icon: TicketIcon,
          },
        ]
      : []),

    { href: "/profile", label: "Profile", icon: User },
  ];

  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`
        fixed bottom-10 left-1/2 -translate-x-1/2 z-50
        w-[95%] sm:w-[500px] md:w-[700px]
        bg-zinc-900 border border-zinc-700
        rounded-full px-6 py-3
        shadow-xl backdrop-blur-md
        flex justify-between items-center gap-4
      `}
    >
      <div className="flex flex-1 justify-evenly items-center gap-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`
                group flex flex-col md:flex-row items-center md:gap-2 text-xs md:text-sm
                transition-all duration-200
                ${isActive ? "text-white font-semibold" : "text-zinc-400 hover:text-white"}
              `}
            >
              <Icon size={20} strokeWidth={1.5} />
              <span>{label}</span>
            </Link>
          );
        })}

        <button
          aria-label="Notifications"
          className="text-zinc-400 hover:text-white transition-colors relative"
        >
          <Bell size={20} strokeWidth={1.5} />
          {/* <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" /> */}
        </button>
      </div>

      {loading ? (
        <span className="text-zinc-400 text-sm">...</span>
      ) : profile ? (
        <button
          onClick={logout}
          className="text-xs md:text-sm text-red-400 hover:underline ml-2"
        >
          Logout
        </button>
      ) : null}
    </motion.nav>
  );
}
