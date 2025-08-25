"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

type TicketDetails = {
  ticketId: string;
  status: string;
  event: {
    eventId: string;
    title: string;
    date?: string | null;
    location?: string | null;
  };
  ticketType?: { name: string; price: number };
  attendeeData?: Record<string, any>;
  totalPrice?: number;
  createdAt?: string;
};

export default function TicketDetailPage() {
  const { ticketId } = useParams() as { ticketId: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketDetails | null>(null);

  const [requestingRefund, setRequestingRefund] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundMsg, setRefundMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/ticket/${ticketId}`);
        if (!cancelled) setTicket(res.data?.data);
      } catch (e: any) {
        if (!cancelled)
          setErr(e?.response?.data?.message || "Failed to load ticket");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  const submitRefund = async () => {
    if (!refundReason.trim()) {
      setRefundMsg("Please enter a reason");
      return;
    }
    setRequestingRefund(true);
    setRefundMsg(null);
    try {
      const res = await api.post("/payment/refund/request", {
        ticketId,
        reason: refundReason,
      });
      setRefundMsg("Refund requested — admin will review it.");
    } catch (e: any) {
      setRefundMsg(e?.response?.data?.message || "Failed to request refund");
    } finally {
      setRequestingRefund(false);
    }
  };

  if (loading) return <div className="p-6">Loading ticket...</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!ticket) return <div className="p-6">Ticket not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="border rounded p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-lg font-semibold">{ticket.event.title}</div>
            <div className="text-sm opacity-80">
              {ticket.event.location} · {ticket.event.date}
            </div>
            <div className="text-sm mt-2">
              Status: <strong>{ticket.status}</strong>
            </div>
            <div className="text-sm opacity-70 mt-1">
              Ticket: {ticket.ticketType?.name} · ₹
              {(ticket.totalPrice ?? 0) / 100}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="font-medium">Attendee info</h4>
          <pre className="bg-gray-50 p-3 rounded mt-2 text-sm">
            {JSON.stringify(ticket.attendeeData || {}, null, 2)}
          </pre>
        </div>
      </div>

      <div className="border rounded p-4">
        <h4 className="font-semibold">Request Refund</h4>
        <p className="text-sm opacity-70">
          If eligible, submit a refund request and it will be reviewed by
          Lister/Admin.
        </p>
        <textarea
          value={refundReason}
          onChange={(e) => setRefundReason(e.target.value)}
          className="w-full border rounded p-2 mt-3"
          rows={4}
        />
        {refundMsg && <div className="mt-2 text-sm">{refundMsg}</div>}
        <div className="mt-3">
          <button
            disabled={requestingRefund}
            onClick={submitRefund}
            className="px-4 py-2 rounded bg-red-600 text-white"
          >
            {requestingRefund ? "Requesting..." : "Request Refund"}
          </button>
        </div>
      </div>

      <div>
        <button
          onClick={() => router.push("/tickets/my-tickets")}
          className="px-3 py-1.5 border rounded"
        >
          Back to My Tickets
        </button>
      </div>
    </div>
  );
}
