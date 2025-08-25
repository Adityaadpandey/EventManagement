"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import api from "@/lib/api";

type Profile = {
  userId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: "USER" | "LISTER" | "ADMIN" | "SUPER_ADMIN";
};

export default function NavBar() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hasToken =
          typeof window !== "undefined" &&
          (!!localStorage.getItem("token") ||
            !!sessionStorage.getItem("token"));
        if (!hasToken) {
          if (!cancelled) setLoading(false);
          return;
        }
        const res = await api.get("/user/profile");
        if (!cancelled) setProfile(res.data?.data || null);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    setProfile(null);
    router.refresh();
    router.push("/");
  };

  const links = [
    { href: "/", label: "Home" },
    ...(profile?.role === "LISTER"
      ? [
          { href: "/lister/events", label: "My Events" },
          { href: "/lister/events/create", label: "Create Event" },
        ]
      : []),
    ...(profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN"
      ? [{ href: "/admin/events/pending", label: "Admin – Pending Events" }]
      : []),
  ];

  return (
    <div className="flex md:min-h-screen bg-zinc-950 text-white">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900 border-r border-zinc-800 px-4 py-6">
        <Link href="/" className="text-xl font-bold mb-6">
          Tixin
        </Link>

        <nav className="flex flex-col gap-3 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-white text-zinc-400"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-800 text-sm text-zinc-400">
          {loading ? (
            <span>Loading...</span>
          ) : profile ? (
            <div className="flex flex-col gap-1">
              <span>
                {profile.name || profile.email || profile.phone} ·{" "}
                {profile.role}
              </span>
              <button
                onClick={logout}
                className="text-left mt-2 text-red-400 hover:underline"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link href="/auth" className="hover:underline">
              Login
            </Link>
          )}
        </div>
      </aside>

      {/* Top nav (mobile) */}
      <div className="md:hidden w-full">
        <nav className="flex items-center justify-between px-4 h-14 border-b border-zinc-800 bg-zinc-900 w-screen">
          <Link href="/" className="text-lg font-bold">
            Tixin
          </Link>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {mobileOpen && (
          <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-4">
            <nav className="flex flex-col gap-3 text-sm">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="hover:text-white text-zinc-400"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 border-t border-zinc-800 pt-4 text-sm text-zinc-400">
              {loading ? (
                <span>Loading...</span>
              ) : profile ? (
                <div className="flex flex-col gap-1">
                  <span>
                    {profile.name || profile.email || profile.phone} ·{" "}
                    {profile.role}
                  </span>
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="text-left mt-2 text-red-400 hover:underline"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="hover:underline"
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* <main className="flex-1 p-6">
      </main> */}
    </div>
  );
}
