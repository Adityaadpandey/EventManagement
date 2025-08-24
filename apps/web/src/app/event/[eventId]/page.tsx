"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { fetchEventDetails } from "@/lib/features/eventsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

export default function EventDetailsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const dispatch = useAppDispatch();
  const router = useRouter();

  const { byId, loadingId, error } = useAppSelector((s) => s.events.details);
  const { token } = useAppSelector((s) => s.auth);

  const ev = byId[eventId];
  const loading = loadingId === eventId;

  const [ticketTypeId, setTicketTypeId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  useEffect(() => {
    if (!ev) dispatch(fetchEventDetails({ eventId }));
  }, [dispatch, eventId, ev]);

  useEffect(() => {
    if (ev?.ticketTypes && ev.ticketTypes.length && !ticketTypeId) {
      setTicketTypeId(ev.ticketTypes[0].ticketTypeId);
    }
  }, [ev, ticketTypeId]);

  const selectedTicket = useMemo(
    () => ev?.ticketTypes?.find((t) => t.ticketTypeId === ticketTypeId),
    [ev, ticketTypeId],
  );

  const handleBuy = async () => {
    setBuyError(null);
    if (!token) {
      router.push("/auth");
      return;
    }
    if (!ticketTypeId) {
      setBuyError("Please select a ticket type");
      return;
    }

    try {
      setBuying(true);
      // POST /ticket/buy  (auth required)
      const res = await api.post("/ticket/buy", {
        ticketTypeId,
        quantity,
        attendeeData: {}, // plug your attendee form here if needed
      });

      // At this point your backend returns `result.data` (whatever your TicketService provides)
      // If it includes payment order info, open Razorpay here. Example (pseudo-safe):
      // const order = res.data?.data?.order; // if your service returns it
      // await openRazorpayCheckout(order);
      // Then call /payment/verify with the payment response.

      alert("Ticket created successfully. Proceed to payment.");
      console.log("Buy response:", res.data);
    } catch (err: any) {
      setBuyError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create ticket",
      );
    } finally {
      setBuying(false);
    }
  };

  if (loading || !ev)
    return <p>{error ? "Failed to load event." : "Loading event..."}</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={ev.title}
          src={
            (ev.banner_horizontal ||
              ev.banner_vertical ||
              ev.banner_square) as string
          }
          className="h-64 w-full rounded-lg border object-cover"
        />
        <h1 className="mt-4 font-semibold text-2xl">{ev.title}</h1>
        <p className="mt-1 opacity-80">
          {ev.date || ""} {ev.time ? `• ${ev.time}` : ""}{" "}
          {ev.location ? `• ${ev.location}` : ""}
        </p>
        {ev.description ? <p className="mt-4">{ev.description}</p> : null}
      </div>

      <div className="h-fit rounded-lg border p-4 lg:col-span-2">
        <h2 className="mb-3 font-semibold">Book Tickets</h2>

        {!ev.ticketTypes || ev.ticketTypes.length === 0 ? (
          <p>No ticket types available.</p>
        ) : (
          <>
            <label className="mb-1 block text-sm">Ticket Type</label>
            <select
              className="mb-3 w-full rounded border p-2"
              value={ticketTypeId}
              onChange={(e) => setTicketTypeId(e.target.value)}
            >
              {ev.ticketTypes.map((t) => (
                <option key={t.ticketTypeId} value={t.ticketTypeId}>
                  {t.name} — ₹{t.price}
                </option>
              ))}
            </select>

            <label className="mb-1 block text-sm">Quantity</label>
            <input
              type="number"
              min={1}
              className="mb-4 w-full rounded border p-2"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            />

            <button
              className="w-full rounded bg-green-600 p-2 text-white"
              onClick={handleBuy}
              disabled={buying}
            >
              {buying
                ? "Processing..."
                : selectedTicket
                  ? `Pay ₹${selectedTicket.price * quantity}`
                  : "Proceed"}
            </button>

            {buyError ? (
              <p className="mt-2 text-red-600 text-sm">{buyError}</p>
            ) : null}

            {!token ? (
              <p className="mt-3 text-sm">
                You must{" "}
                <span
                  className="cursor-pointer underline"
                  onClick={() => router.push("/auth")}
                >
                  log in
                </span>{" "}
                to buy tickets.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
