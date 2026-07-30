"use client";

import { usePathname } from "next/navigation";
import NavBar from "./Navbar";
import React from "react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hideNavOnRoutes = ["/event", "/checker", "/admin"];
  const shouldHideNav =
    pathname === "/" ||
    hideNavOnRoutes.some((path) => pathname.startsWith(path));

  return (
    <main className="flex flex-col h-screen relative overflow-auto">
      {children}
      {!shouldHideNav && <NavBar />}
    </main>
  );
}
