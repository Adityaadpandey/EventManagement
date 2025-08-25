"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { fetchEventDetails } from "@/lib/features/eventsSlice";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import {
  requestOtp,
  verifyOtp,
  hydrateSession,
} from "@/lib/features/authSlice";

type TicketType = {
  ticketTypeId: string;
  name: string;
  price: number;
  quantity: number;
};

type CustomField = {
  label: string;
  fieldType: string;
  required: boolean;
  options?: string | null;
};

type EventPublic = {
  title: string;
  description?: string | null;
  banner_horizontal?: string | null;
  banner_vertical?: string | null;
  banner_square?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  capacity?: number | null;
  TicketType: TicketType[];
  CustomField: CustomField[];
};

export default function EventPage() {
  const { eventId } = useParams() as { eventId: string };
  const router = useRouter();
  const dispatch = useAppDispatch();

  // auth state
  const {
    user: me,
    token,
    otpSent,
    loading: authLoading,
    error: authError,
    hydrated,
  } = useAppSelector((s) => s.auth);

  // events slice state
  const {
    byId,
    loadingId,
    error: eventsError,
  } = useAppSelector((s) => s.events.details);
  const ev = byId[eventId] as EventPublic | undefined;
  const loadingEvent = loadingId === eventId;

  // local UI / booking state
  const [ticketTypeId, setTicketTypeId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [attendee, setAttendee] = useState<Record<string, any>>({});
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  // local auth form (for non-logged in flows on the page)
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    phone: "",
    otp: "",
  });
  const [localAuthMsg, setLocalAuthMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const isAuthenticated = Boolean(token && me);
  // show auth block only when hydration finished and user is not authenticated
  const showAuthBlock = hydrated && !isAuthenticated;

  // Fetch event via eventsSlice (will cache in redux)
  useEffect(() => {
    if (!ev) {
      dispatch(fetchEventDetails({ eventId }));
    }
  }, [dispatch, eventId, ev]);

  // ensure session hydration at page-level if not done yet
  useEffect(() => {
    if (!hydrated) {
      dispatch(hydrateSession());
    }
  }, [hydrated, dispatch]);

  // Prefill auth form when user is available (optional, for Razorpay prefill)
  useEffect(() => {
    if (me) {
      setAuthForm({
        name: me.name ?? "",
        email: me.email ?? "",
        phone: me.phone ?? "",
        otp: "",
      });
      // also prefill attendee so required custom fields won't complain
      setAttendee((a) => ({
        ...a,
        name: me.name,
        email: me.email,
        phone: me.phone,
      }));
    }
  }, [me]);

  // When event loads, default ticket type to first available
  useEffect(() => {
    if (!ticketTypeId && ev?.TicketType?.length) {
      setTicketTypeId(ev.TicketType[0].ticketTypeId);
    }
  }, [ev, ticketTypeId]);

  const selectedTicket = useMemo(
    () => ev?.TicketType?.find((t) => t.ticketTypeId === ticketTypeId) ?? null,
    [ev, ticketTypeId],
  );

  // Razorpay script loader
  const loadRazorpay = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (typeof window === "undefined")
        return reject(new Error("Client only"));
      if ((window as any).Razorpay) return resolve();
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Razorpay script failed to load"));
      document.body.appendChild(script);
    });

  // --- Auth helpers used in this page ---
  const onAuthFieldChange =
    (k: keyof typeof authForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setAuthForm((s) => ({ ...s, [k]: e.target.value }));
      setLocalAuthMsg(null);
    };

  const sendOtp = async () => {
    setLocalAuthMsg(null);

    // when not authenticated we require name/email/phone to request OTP
    if (
      !authForm.name.trim() ||
      !authForm.email.trim() ||
      !authForm.phone.trim()
    ) {
      setLocalAuthMsg("Name, email and phone are required to request OTP.");
      return;
    }
    try {
      await dispatch(requestOtp(authForm.phone));
      setLocalAuthMsg("OTP sent. Check your phone.");
    } catch (e: any) {
      setLocalAuthMsg(e?.message || "Failed to send OTP");
    }
  };

  const verifyPhoneOtp = async () => {
    setLocalAuthMsg(null);
    if (!authForm.phone.trim() || !authForm.otp.trim()) {
      setLocalAuthMsg("Phone and OTP are required.");
      return;
    }
    try {
      setIsVerifying(true);
      await dispatch(
        verifyOtp({
          phone: authForm.phone,
          otp: authForm.otp,
          name: authForm.name,
          email: authForm.email,
        }),
      ).unwrap();

      // after successful verify, auth slice stores token/user and otpSent false
      setAuthForm((s) => ({ ...s, otp: "" }));
      setLocalAuthMsg(null);
    } catch (e: any) {
      setLocalAuthMsg(
        e?.response?.data?.message || e?.message || "Failed to verify OTP",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const resendOtp = async () => {
    if (!authForm.phone.trim()) {
      setLocalAuthMsg("Phone is required to resend OTP.");
      return;
    }
    try {
      await dispatch(requestOtp(authForm.phone));
      setLocalAuthMsg("OTP resent.");
    } catch {
      setLocalAuthMsg("Failed to resend OTP.");
    }
  };

  // --- Booking flow ---
  const onBuy = async () => {
    setBuyError(null);
    setLocalAuthMsg(null);

    if (!isAuthenticated) {
      setBuyError(
        "Please verify your phone (send OTP and verify) before buying.",
      );
      return;
    }

    if (!ticketTypeId || !selectedTicket) {
      setBuyError("Select a ticket type first");
      return;
    }
    if (quantity <= 0) {
      setBuyError("Quantity must be at least 1");
      return;
    }
    if (ev?.CustomField) {
      for (const f of ev.CustomField) {
        if (f.required && !attendee[f.label]) {
          setBuyError(`Please fill ${f.label}`);
          return;
        }
      }
    }

    setBuying(true);

    try {
      const finalAttendee = {
        ...(attendee || {}),
        name: me?.name ?? authForm.name,
        email: me?.email ?? authForm.email,
        phone: me?.phone ?? authForm.phone,
      };

      const payload = { ticketTypeId, quantity, attendeeData: finalAttendee };
      const res = await api.post("/ticket/buy", payload);

      const data = res.data?.data || res.data;
      const ticketId =
        data?.ticket?.ticketId ||
        data?.ticketId ||
        data?.ticket?.id ||
        data?.ticket?.id;

      const orderInfo =
        data?.paymentOrder ||
        data?.razorpayOrder ||
        data?.razorpay_order ||
        data?.order ||
        data?.payment;

      if (
        orderInfo &&
        (orderInfo.order_id || orderInfo.id || orderInfo.razorpay_order_id)
      ) {
        const orderId =
          orderInfo.order_id || orderInfo.id || orderInfo.razorpay_order_id;
        const amount =
          orderInfo.amount ||
          orderInfo.amount_paid ||
          orderInfo.total ||
          selectedTicket.price * quantity * 100;
        const currency = orderInfo.currency || "INR";
        const key =
          orderInfo.key ||
          orderInfo.razorpay_key ||
          (process.env.NEXT_PUBLIC_RAZORPAY_KEY as string | undefined);

        if (!key) {
          setBuyError("Payment key missing. Please contact admin.");
          setBuying(false);
          return;
        }

        await loadRazorpay();

        const options: any = {
          key,
          amount,
          currency,
          name: ev?.title || "Tixin",
          description: `Ticket(s) for ${ev?.title || "event"}`,
          order_id: orderId,
          prefill: {
            name: me?.name || authForm.name || undefined,
            email: me?.email || authForm.email || undefined,
            contact: me?.phone || authForm.phone || undefined,
          },
          handler: async (resp: any) => {
            try {
              await api.post("/payment/verify", {
                razorpay_order_id: resp?.razorpay_order_id,
                razorpay_payment_id: resp?.razorpay_payment_id,
                razorpay_signature: resp?.razorpay_signature,
              });

              const gotoId = ticketId || data?.ticket?.id || data?.ticketId;
              if (gotoId) {
                router.push(`/ticket/${gotoId}`);
              } else {
                router.push("/tickets/my-tickets");
              }
            } catch (verifyErr: any) {
              if (ticketId) {
                try {
                  await api.post("/payment/failure", { ticketId });
                } catch {}
              }
              setBuyError(
                verifyErr?.response?.data?.message ||
                  "Payment verification failed",
              );
            }
          },
          modal: {
            ondismiss: async () => {
              try {
                const createdTicketId =
                  ticketId || data?.ticket?.id || data?.ticketId;
                if (createdTicketId) {
                  await api.post("/payment/failure", {
                    ticketId: createdTicketId,
                  });
                }
              } catch {}
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        const gotoId = ticketId || data?.ticket?.ticketId || data?.ticketId;
        if (gotoId) {
          router.push(`/ticket/${gotoId}`);
        } else {
          setBuyError(
            "Purchase succeeded but response was unexpected. Check My Tickets.",
          );
          router.push("/tickets/my-tickets");
        }
      }
    } catch (e: any) {
      setBuyError(
        e?.response?.data?.message || e?.message || "Failed to create ticket",
      );
    } finally {
      setBuying(false);
    }
  };

  // --- render conditions ---
  if (loadingEvent) return <div className="p-6">Loading event...</div>;
  if (eventsError) return <div className="p-6 text-red-600">{eventsError}</div>;
  if (!ev) return <div className="p-6">Event not found</div>;

  return (
    <div className="mx-auto px-4 py-8 text-white space-y-10 w-full h-screen overflow-y-auto">
      {/* Event banner + info */}
      <div>
        {ev.banner_horizontal || ev.banner_square ? (
          <div className="relative w-full h-64 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700">
            <img
              src={ev.banner_horizontal || ev.banner_square!}
              alt={ev.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        ) : null}

        <h1 className="text-3xl font-bold mt-6">{ev.title}</h1>
        <p className="text-sm text-zinc-400 mt-2">
          {ev.date &&
            new Date(ev.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          {ev.time && (
            <>
              {" • "}
              {new Date(ev.time).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </>
          )}
        </p>

        {ev.description && (
          <div
            className="mt-6 prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: ev.description }}
          />
        )}
      </div>

      {/* Ticket booking */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">🎟 Book Tickets</h2>

        <div className="space-y-4">
          {/* Auth only if not verified AND session hydration completed */}
          {showAuthBlock && (
            <div className="bg-zinc-800 border border-zinc-700 rounded p-4 space-y-3">
              <div className="text-sm text-zinc-300 font-medium">
                Your details (required)
              </div>

              {/* name */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Full name
                </label>
                <input
                  type="text"
                  value={authForm.name}
                  onChange={onAuthFieldChange("name")}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                  placeholder="Your full name"
                />
              </div>

              {/* email */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={onAuthFieldChange("email")}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                  placeholder="you@example.com"
                />
              </div>

              {/* phone + OTP */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Phone
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={authForm.phone}
                    onChange={onAuthFieldChange("phone")}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                    placeholder="+91 98XXXXXXXX"
                  />
                  {!otpSent ? (
                    <button
                      onClick={sendOtp}
                      disabled={authLoading}
                      className="px-3 py-2 bg-indigo-600 rounded text-sm"
                    >
                      {authLoading ? "Sending..." : "Verify"}
                    </button>
                  ) : (
                    <span className="text-sm text-emerald-400 font-semibold">
                      OTP sent
                    </span>
                  )}
                </div>
              </div>

              {otpSent && (
                <div className="pt-2">
                  <label className="block text-xs text-zinc-400 mb-1">
                    Enter OTP
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={authForm.otp}
                      onChange={onAuthFieldChange("otp")}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                      placeholder="123456"
                    />
                    <button
                      onClick={verifyPhoneOtp}
                      disabled={isVerifying}
                      className="px-3 py-2 bg-emerald-600 rounded text-sm"
                    >
                      {isVerifying ? "Verifying..." : "Verify"}
                    </button>
                    <button
                      onClick={resendOtp}
                      disabled={authLoading}
                      className="px-3 py-2 bg-zinc-700 rounded text-sm"
                    >
                      Resend
                    </button>
                  </div>
                </div>
              )}

              {localAuthMsg && (
                <div className="text-sm text-yellow-300">{localAuthMsg}</div>
              )}
              {authError && (
                <div className="text-sm text-red-500">{authError}</div>
              )}
            </div>
          )}

          {/* Ticket type */}
          <div>
            <label className="block text-sm mb-1 font-medium text-zinc-300">
              Ticket Type
            </label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
              value={ticketTypeId || ""}
              onChange={(e) => setTicketTypeId(e.target.value || null)}
            >
              <option value="">-- Select a ticket type --</option>
              {ev.TicketType.map((t) => (
                <option key={t.ticketTypeId} value={t.ticketTypeId}>
                  {t.name} — ₹{t.price} ({t.quantity} available)
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm mb-1 font-medium text-zinc-300">
              Quantity
            </label>
            <input
              type="number"
              min={1}
              max={selectedTicket?.quantity ?? 100}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-28 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
            />
          </div>

          {/* Custom fields */}
          {ev.CustomField?.length > 0 && (
            <div>
              <label className="block text-sm mb-2 font-medium text-zinc-300">
                Attendee Details
              </label>
              <div className="space-y-3">
                {ev.CustomField.map((cf) => (
                  <div key={cf.label}>
                    <label className="block text-sm text-zinc-400 mb-1">
                      {cf.label}
                      {cf.required && <span className="text-red-500"> *</span>}
                    </label>
                    <input
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                      value={attendee[cf.label] ?? ""}
                      onChange={(e) =>
                        setAttendee((a) => ({
                          ...a,
                          [cf.label]: e.target.value,
                        }))
                      }
                      placeholder={cf.fieldType}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {buyError && (
            <div className="text-sm text-red-500 font-medium">{buyError}</div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-4">
            <button
              disabled={buying}
              onClick={onBuy}
              className="bg-green-600 hover:bg-green-700 transition-colors px-5 py-2.5 rounded text-sm font-medium disabled:opacity-60"
            >
              {buying ? "Processing..." : "Buy & Pay"}
            </button>
            <button
              onClick={() => router.push("/tickets/my-tickets")}
              className="border border-zinc-600 hover:border-zinc-500 text-sm px-4 py-2 rounded"
            >
              My Tickets
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
