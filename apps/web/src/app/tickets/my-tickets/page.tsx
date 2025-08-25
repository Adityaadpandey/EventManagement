"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

type Ticket = {
  ticketId: string;
  status: string;
  event: {
    eventId: string;
    title: string;
    date?: string | null;
    location?: string | null;
  };
  totalPrice?: number;
  createdAt?: string;
};

export default function MyTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/ticket/my-tickets");
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
  }, []);

  if (loading) return <div className="p-6">Loading tickets...</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;

  if (!tickets.length)
    return <div className="p-6">You have no tickets yet.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">My Tickets</h1>
      <div className="grid gap-4">
        {tickets.map((t) => (
          <div
            key={t.ticketId}
            className="border rounded p-4 flex justify-between items-center"
          >
            <div>
              <div className="font-medium">{t.event.title}</div>
              <div className="text-sm opacity-80">
                {t.event.location} · {t.event.date}
              </div>
              <div className="text-sm opacity-70 mt-1">
                Status: <strong>{t.status}</strong>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-sm">₹{(t.totalPrice ?? 0) / 100}</div>
              <Link
                href={`/ticket/${t.ticketId}`}
                className="px-3 py-1 border rounded text-sm"
              >
                View
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
