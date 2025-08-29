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

  const {
    user: me,
    token,
    otpSent,
    loading: authLoading,
    error: authError,
    hydrated,
  } = useAppSelector((s) => s.auth);

  const {
    byId,
    loadingId,
    error: eventsError,
  } = useAppSelector((s) => s.events.details);
  const ev = byId[eventId] as EventPublic | undefined;
  const loadingEvent = loadingId === eventId;

  // booking state
  const [ticketTypeId, setTicketTypeId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [attendee, setAttendee] = useState<Record<string, any>>({});
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    phone: "",
    otp: "",
  });
  const [localAuthMsg, setLocalAuthMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [resendTimer, setResendTimer] = useState<number>(0);

  const isAuthenticated = Boolean(token && me);
  const showAuthBlock = hydrated && !isAuthenticated;

  useEffect(() => {
    if (!ev) dispatch(fetchEventDetails({ eventId }));
  }, [dispatch, eventId, ev]);

  useEffect(() => {
    if (!hydrated) dispatch(hydrateSession());
  }, [hydrated, dispatch]);

  useEffect(() => {
    if (me) {
      setAuthForm({
        name: me.name ?? "",
        email: me.email ?? "",
        phone: me.phone ?? "",
        otp: "",
      });
      setAttendee((a) => ({
        ...a,
        name: me.name,
        email: me.email,
        phone: me.phone,
      }));
    }
  }, [me]);

  useEffect(() => {
    if (!ticketTypeId && ev?.TicketType?.length) {
      setTicketTypeId(ev.TicketType[0].ticketTypeId);
    }
  }, [ev, ticketTypeId]);

  useEffect(() => {
    if (!otpSent || resendTimer <= 0) return;
    const id = window.setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [otpSent, resendTimer]);

  const selectedTicket = useMemo(
    () => ev?.TicketType?.find((t) => t.ticketTypeId === ticketTypeId) ?? null,
    [ev, ticketTypeId],
  );

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

  const onAuthFieldChange =
    (k: keyof typeof authForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setAuthForm((s) => ({ ...s, [k]: e.target.value }));
      setLocalAuthMsg(null);
    };

  const sendOtp = async () => {
    setLocalAuthMsg(null);
    if (
      !authForm.name.trim() ||
      !authForm.email.trim() ||
      !authForm.phone.trim()
    ) {
      setLocalAuthMsg("Name, email and phone are required.");
      return;
    }
    try {
      await dispatch(requestOtp(authForm.phone));
      setLocalAuthMsg("OTP sent. Enter the code below.");
      setResendTimer(300);
    } catch (err: any) {
      setLocalAuthMsg(err?.message || "Failed to send OTP");
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
      setAuthForm((s) => ({ ...s, otp: "" }));
      setLocalAuthMsg(null);
    } catch (err: any) {
      setLocalAuthMsg(err?.message || "Failed to verify OTP");
    } finally {
      setIsVerifying(false);
    }
  };

  const resendOtp = async () => {
    if (!authForm.phone.trim()) {
      setLocalAuthMsg("Phone is required to resend OTP.");
      return;
    }
    if (resendTimer > 0) {
      setLocalAuthMsg(`Please wait ${resendTimer}s before resending.`);
      return;
    }
    try {
      await dispatch(requestOtp(authForm.phone));
      setLocalAuthMsg("OTP resent.");
      setResendTimer(30);
    } catch {
      setLocalAuthMsg("Failed to resend OTP.");
    }
  };

  const onBuy = async () => {
    setBuyError(null);
    setLocalAuthMsg(null);

    if (!isAuthenticated) {
      setBuyError("Please verify phone (OTP) before buying.");
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

      const res = await api.post("/ticket/buy", {
        ticketTypeId,
        quantity,
        attendeeData: finalAttendee,
      });

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

        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

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
              await api.post(
                "/payment/verify",
                {
                  razorpay_order_id: resp?.razorpay_order_id,
                  razorpay_payment_id: resp?.razorpay_payment_id,
                  razorpay_signature: resp?.razorpay_signature,
                },
                headers ? { headers } : undefined,
              );

              const gotoId = ticketId || data?.ticket?.id || data?.ticketId;
              if (gotoId) {
                router.push(`/ticket/${gotoId}`);
              } else {
                router.push("/tickets/my-tickets");
              }
            } catch (verifyErr: any) {
              if (ticketId) {
                try {
                  await api.post(
                    "/payment/failure",
                    { ticketId },
                    headers ? { headers } : undefined,
                  );
                } catch {}
              }

              const msg =
                verifyErr?.response?.data?.message ||
                verifyErr?.message ||
                "Payment verification failed";
              setBuyError(msg);
            }
          },
          modal: {
            ondismiss: async () => {
              try {
                const createdTicketId =
                  ticketId || data?.ticket?.id || data?.ticketId;
                if (createdTicketId) {
                  await api.post(
                    "/payment/failure",
                    { ticketId: createdTicketId },
                    headers ? { headers } : undefined,
                  );
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

  if (loadingEvent) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-zinc-800 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-44 bg-zinc-800 rounded-lg md:col-span-2" />
            <div className="h-44 bg-zinc-800 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (eventsError) return <div className="p-6 text-red-500">{eventsError}</div>;
  if (!ev) return <div className="p-6 text-zinc-400">Event not found</div>;

  return (
    <div className="max-w-6xl sm:w-[80vw] mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
        <div className="lg:col-span-1 space-y-6">
          <div className="relative w-full h-64 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700">
            {ev.banner_horizontal || ev.banner_square ? (
              <img
                src={ev.banner_horizontal || ev.banner_square!}
                alt={ev.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500">
                No image
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>

          <div>
            <h1 className="text-3xl font-semibold text-zinc-100">{ev.title}</h1>
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
            {ev.location && (
              <p className="text-sm text-zinc-500 mt-1">{ev.location}</p>
            )}
          </div>

          {ev.description && (
            <div
              className="mt-4 prose prose-invert prose-sm text-zinc-200 max-w-none"
              dangerouslySetInnerHTML={{ __html: ev.description }}
            />
          )}
        </div>

        <aside className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">
            🎟 Book tickets
          </h2>

          {showAuthBlock && (
            <div className="bg-zinc-800 border border-zinc-700 rounded p-3 mb-4 space-y-3">
              <div className="text-sm text-zinc-300">
                Verify phone to continue
              </div>

              <input
                placeholder="Full name"
                value={authForm.name}
                onChange={onAuthFieldChange("name")}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
              />
              <input
                placeholder="Email address"
                value={authForm.email}
                onChange={onAuthFieldChange("email")}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
              />

              <div className="flex md:flex-row flex-col gap-2">
                <input
                  placeholder="Phone (e.g. +91...)"
                  value={authForm.phone}
                  onChange={onAuthFieldChange("phone")}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
                />
                {!otpSent ? (
                  <button
                    onClick={sendOtp}
                    disabled={authLoading}
                    className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm text-zinc-100"
                  >
                    {authLoading ? "Sending..." : "Send"}
                  </button>
                ) : (
                  <div className="text-xs text-zinc-300 px-3 py-2">
                    OTP sent
                  </div>
                )}
              </div>

              {otpSent && (
                <div className="flex gap-2 mt-2">
                  <input
                    placeholder="Enter OTP"
                    value={authForm.otp}
                    onChange={onAuthFieldChange("otp")}
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
                  />
                  <button
                    onClick={verifyPhoneOtp}
                    disabled={isVerifying}
                    className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm text-zinc-100"
                  >
                    {isVerifying ? "..." : "Verify"}
                  </button>
                </div>
              )}

              {otpSent && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={resendOtp}
                    disabled={resendTimer > 0 || authLoading}
                    className={`flex-1 px-3 py-2 rounded text-sm ${
                      resendTimer > 0
                        ? "bg-zinc-800 text-zinc-400"
                        : "bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
                    }`}
                  >
                    {resendTimer > 0
                      ? `Resend in ${resendTimer}s`
                      : "Resend OTP"}
                  </button>
                </div>
              )}

              {localAuthMsg && (
                <div className="text-xs text-zinc-300 mt-2">{localAuthMsg}</div>
              )}
              {authError && (
                <div className="text-xs text-red-500 mt-2">{authError}</div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-xs text-zinc-400">Ticket type</label>
            <select
              value={ticketTypeId || ""}
              onChange={(e) => setTicketTypeId(e.target.value || null)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
            >
              <option value="">-- select --</option>
              {ev.TicketType.map((t) => (
                <option key={t.ticketTypeId} value={t.ticketTypeId}>
                  {t.name} — ₹{t.price} ({t.quantity} available)
                </option>
              ))}
            </select>

            <div>
              <label className="block text-xs text-zinc-400">Quantity</label>
              <input
                type="number"
                min={1}
                max={selectedTicket?.quantity ?? 100}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-28 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
              />
            </div>
          </div>

          {ev.CustomField?.length ? (
            <div className="mt-4 space-y-3">
              <div className="text-xs text-zinc-400 font-medium">
                Attendee info
              </div>
              {ev.CustomField.map((cf) => (
                <div key={cf.label}>
                  <label className="block text-xs text-zinc-400 mb-1">
                    {cf.label}
                    {cf.required && <span className="text-zinc-300"> *</span>}
                  </label>
                  <input
                    placeholder={cf.fieldType}
                    value={attendee[cf.label] ?? ""}
                    onChange={(e) =>
                      setAttendee((a) => ({ ...a, [cf.label]: e.target.value }))
                    }
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
              ))}
            </div>
          ) : null}

          {buyError && (
            <div className="text-sm text-red-500 mt-3">{buyError}</div>
          )}

          <button
            onClick={onBuy}
            disabled={buying}
            className="flex-1 px-4 py-2 rounded text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-100 disabled:opacity-60 mt-4"
          >
            {buying ? "Processing..." : "Book Ticket"}
          </button>
        </aside>
      </div>
    </div>
  );
}
