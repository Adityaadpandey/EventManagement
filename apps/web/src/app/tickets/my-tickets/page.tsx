"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import QRCode from "react-qr-code";
import api from "@/lib/api";
import { RootState } from "@/lib/store"; // adjust path to your store

type Ticket = {
  ticketId: string;
  qrCode: string;
  totalPrice?: number;
  createdAt?: string;
  ticketType?: {
    event?: {
      title?: string;
      location?: string;
      date?: string;
      banner_square?: string;
    };
  };
};

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  // 👇 Get auth state from Redux
  const { user, token } = useSelector((state: RootState) => state.auth);

  // 🔒 Redirect if not logged in
  useEffect(() => {
    if (!token) {
      router.replace("/auth");
    }
  }, [token, router]);

  useEffect(() => {
    if (!token) return; // don’t fetch if not logged in
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get("/ticket/my-tickets", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setTickets(res.data?.data || []);
      } catch (e: any) {
        if (!cancelled)
          setErr(e?.response?.data?.message || "Failed to load tickets");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) return null;

  if (loading)
    return (
      <div className="p-6 text-center text-gray-600">Loading tickets...</div>
    );
  if (err) return <div className="p-6 text-center text-red-500">{err}</div>;
  if (!tickets.length)
    return (
      <div className="p-6 text-center text-gray-600">
        You have no tickets yet.
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 pb-48">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
        🎫 My Tickets
      </h1>

      <div className="flex flex-col gap-6">
        {tickets.map((t) => (
          <div
            key={t.ticketId}
            className="flex flex-col sm:flex-row justify-between items-center bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition"
            onClick={() => router.push(`/tickets/${t.ticketId}`)}
          >
            {/* Event Banner */}
            {t.ticketType?.event?.banner_square && (
              <div
                className="w-full sm:w-32 h-32 sm:h-32 flex-shrink-0 bg-center bg-cover"
                style={{
                  backgroundImage: `url(${t.ticketType.event.banner_square})`,
                }}
              />
            )}

            {/* Ticket info */}
            <div className="flex-1 p-4 sm:px-6 space-y-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                {t.ticketType?.event?.title || "Unknown Event"}
              </h2>
              <p className="text-sm text-gray-500">
                {t.ticketType?.event?.location || "Unknown Location"}
              </p>
              {t.ticketType?.event?.date && (
                <p className="text-sm text-gray-500">
                  Date: {new Date(t.ticketType.event.date).toLocaleDateString()}
                </p>
              )}
              <p className="text-sm text-gray-500">
                Price: ₹{t.totalPrice ?? 0} | Booked:{" "}
                {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "-"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
