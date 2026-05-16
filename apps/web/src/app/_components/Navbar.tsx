"use client";

import { hydrateSession, logoutAsync } from "@/lib/features/authSlice";
import { AppDispatch, RootState } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Ref for the notification container to handle hover
  const notificationRef = useRef<HTMLDivElement>(null);

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

  // Close notification when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const logout = async () => {
    await dispatch(logoutAsync());
    router.push("/");
  };

  const notifications = [
    {
      id: 1,
      title: "Welcome!",
      text: "Welcome to Tixin 🎉 We're excited to have you on board!",
      read: false,
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

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
            {
              href: "/lister/events",
              label: "My Events",
              icon: "/svgs/events.svg",
            },
          ]
        : profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN"
          ? []
          : [
              {
                href: profile ? "/lister/apply" : "/auth",
                label: "Apply",
                icon: "/svgs/lister-apply.svg",
              },
            ]),
      ...(profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN"
        ? [
            {
              href: "/admin/events/pending",
              label: "Admin – Pending",
              icon: "/svgs/admin-pending.svg",
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
        flex items-center gap-[0.347222vw]
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
      <div className="md:flex items-center gap-4 bg-white p-[0.347vw] pl-[1vw] pr-1 rounded-full hidden">
        {/* Notification Bell with Dropdown */}
        <div
          ref={notificationRef}
          className="relative"
          onMouseEnter={() => setNotificationOpen(true)}
          onMouseLeave={() => setNotificationOpen(false)}
        >
          <button
            aria-label="Notifications"
            className="text-zinc-400 hover:text-[#1E1E1E] transition-colors relative p-2 rounded-full hover:bg-gray-100"
          >
            <Bell size={20} strokeWidth={1.5} />
            {/* {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )} */}
          </button>

          {/* Notification Dropdown */}
          <AnimatePresence>
            {notificationOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 mb-3 w-fit p-6 pb-8 rounded-2xl overflow-hidden z-50"
              >
                <div className="w-[398px] p-4 space-y-4 bg-[#ffffffd4] backdrop-blur-3xl rounded-[20px] backdropBlur">
                  {/* Header */}
                  <h3 className="font-semibold text-2xl text-gray-900 bricolage-grotesque leading-none">
                    Notifications
                  </h3>

                  {/* Notifications List */}
                  <div className="max-h-[364px] space-y-4 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer bg-white rounded-xl ${
                            !notification.read ? "" : ""
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 pr-2">
                              <p className="font-medium">
                                {notification.title}
                              </p>
                              <span className="text-[#8B8B8B] mt-1">
                                {notification.text}
                              </span>
                            </div>
                            {/* {!notification.read && (
                              <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1 bg-[var(--color-primary)]" />
                            )} */}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <Bell
                          size={32}
                          className="mx-auto mb-2 text-gray-300"
                        />
                        <p>No notifications yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow pointing to bell */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-gray-200 transform rotate-45 -mt-2" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Link */}
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

      {/* Group 3: Lister / Apply link */}
      {navItems.group3.length > 0 && (
        <div className="relative flex items-center gap-[0.347vw] bg-white p-[5px] rounded-full">
          {navItems.group3.map(({ href, label, icon }) => {
            // Never highlight when linking to /auth; otherwise active on exact path match
            const isActive = href !== "/auth" && pathname === href;
            return (
              <div key={href} className="relative">
                {isActive && (
                  <motion.div
                    layoutId="nav-active-indicator-g3"
                    className="absolute inset-0 z-0 bg-[#FFE348] border-b-[0.20833vw] border-[#FFDA0A] rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Link
                  href={href}
                  className={`relative z-10 flex items-center gap-3 justify-center text-center md:px-5 px-7 py-4 rounded-full transition-colors duration-200 ${
                    isActive ? "text-[#1E1E1E] font-semibold" : "text-zinc-600"
                  }`}
                >
                  <img src={icon} alt="" />
                  <h5>{label}</h5>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </motion.nav>
  );
}
