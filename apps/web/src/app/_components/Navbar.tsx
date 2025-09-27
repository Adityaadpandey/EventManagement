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
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M10.0698 2.81985L3.13978 8.36985C2.35978 8.98985 1.85978 10.2998 2.02978 11.2798L3.35978 19.2398C3.59978 20.6598 4.95978 21.8098 6.39978 21.8098H17.5998C19.0298 21.8098 20.3998 20.6498 20.6398 19.2398L21.9698 11.2798C22.1298 10.2998 21.6298 8.98985 20.8598 8.36985L13.9298 2.82985C12.8598 1.96985 11.1298 1.96985 10.0698 2.81985Z"
              fill="#1E1E1E"
              stroke="#1E1E1E"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M12 18V15"
              stroke="#FFE348"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        ),
      },
      ...(profile?.role !== "ADMIN" && profile?.role !== "SUPER_ADMIN"
        ? [
            {
              href: "/tickets/my-tickets",
              label: "Bookings",
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M17 20.75H7C2.59 20.75 1.25 19.41 1.25 15V14.5C1.25 14.09 1.59 13.75 2 13.75C2.96 13.75 3.75 12.96 3.75 12C3.75 11.04 2.96 10.25 2 10.25C1.59 10.25 1.25 9.91 1.25 9.5V9C1.25 4.59 2.59 3.25 7 3.25H17C21.41 3.25 22.75 4.59 22.75 9V10C22.75 10.41 22.41 10.75 22 10.75C21.04 10.75 20.25 11.54 20.25 12.5C20.25 13.46 21.04 14.25 22 14.25C22.41 14.25 22.75 14.59 22.75 15C22.75 19.41 21.41 20.75 17 20.75ZM2.75 15.16C2.77 18.6 3.48 19.25 7 19.25H17C20.34 19.25 21.15 18.66 21.24 15.66C19.81 15.32 18.75 14.03 18.75 12.5C18.75 10.97 19.82 9.68 21.25 9.34V9C21.25 5.43 20.58 4.75 17 4.75H7C3.48 4.75 2.77 5.4 2.75 8.84C4.18 9.18 5.25 10.47 5.25 12C5.25 13.53 4.18 14.82 2.75 15.16Z"
                    fill="black"
                  />
                  <path
                    d="M10 7.25C9.59 7.25 9.25 6.91 9.25 6.5V4C9.25 3.59 9.59 3.25 10 3.25C10.41 3.25 10.75 3.59 10.75 4V6.5C10.75 6.91 10.41 7.25 10 7.25Z"
                    fill="black"
                  />
                  <path
                    d="M10 14.5802C9.59 14.5802 9.25 14.2402 9.25 13.8302V10.1602C9.25 9.75016 9.59 9.41016 10 9.41016C10.41 9.41016 10.75 9.75016 10.75 10.1602V13.8302C10.75 14.2502 10.41 14.5802 10 14.5802Z"
                    fill="black"
                  />
                  <path
                    d="M10 20.75C9.59 20.75 9.25 20.41 9.25 20V17.5C9.25 17.09 9.59 16.75 10 16.75C10.41 16.75 10.75 17.09 10.75 17.5V20C10.75 20.41 10.41 20.75 10 20.75Z"
                    fill="black"
                  />
                </svg>
              ),
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
            px-5 py-4 rounded-full
             transition-colors duration-200
            ${isActive ? "text-black font-semibold" : "text-zinc-600"}
          `}
              >
                {icon}
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
          className="text-zinc-400 hover:text-black transition-colors relative"
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
                  isActive ? "text-black font-medium" : "text-zinc-600"
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
