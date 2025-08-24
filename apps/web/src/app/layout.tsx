// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./_components/Navbar";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Tixin",
  description: "Discover events and book tickets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
