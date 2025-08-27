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
          <main className="flex flex-col min-h-screen bg-zinc-950 text-white">
            <Navbar />
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
