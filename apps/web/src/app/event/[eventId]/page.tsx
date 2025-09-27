"use client";

import Modal from "@/app/_components/Modal";
import api from "@/lib/api";
import {
  hydrateSession,
  requestOtp,
  verifyOtp,
} from "@/lib/features/authSlice";
import { fetchEventDetails } from "@/lib/features/eventsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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

  // event state
  const {
    byId,
    loadingId,
    error: eventsError,
  } = useAppSelector((s) => s.events.details);
  const ev = byId[eventId] as EventPublic | undefined | any;
  const loadingEvent = loadingId === eventId;

  // booking UI state (outside modal)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<number>(0); // 0: types, 1: details, 2: checkout
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [attendee, setAttendee] = useState<Record<string, any>>({});
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  // local auth form for details step (identifier = email)
  const [authForm, setAuthForm] = useState({
    name: "",
    identifier: "",
    otp: "",
  });
  const [localAuthMsg, setLocalAuthMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState<number>(0);

  const isAuthenticated = Boolean(token && me);
  const showAuthBlock = hydrated && !isAuthenticated;

  useEffect(() => {
    if (!ev) {
      dispatch(fetchEventDetails({ eventId }));
    }
  }, [dispatch, eventId, ev]);

  useEffect(() => {
    if (!hydrated) {
      dispatch(hydrateSession());
    }
  }, [hydrated, dispatch]);

  // prefill auth form and attendee when user exists
  useEffect(() => {
    if (me && !attendee.name && !attendee.email) {
      setAuthForm({
        name: me.name ?? "",
        identifier: me.email ?? me.phone ?? "",
        otp: "",
      });
      setAttendee({
        name: me.name ?? "",
        email: me.email ?? me.phone ?? "",
        phone: me.phone ?? "",
      });
    }
  }, [me]);

  useEffect(() => {
    if (!selectedTicketId && ev?.TicketType?.length) {
      setSelectedTicketId(ev.TicketType[0].ticketTypeId);
      setSelectedQuantity(1);
    }
  }, [ev, selectedTicketId]);

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
    () =>
      ev?.TicketType?.find((t: any) => t.ticketTypeId === selectedTicketId) ??
      null,
    [ev, selectedTicketId],
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

  // helpers
  const fmtCurrency = (amountInPaise: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amountInPaise / 100);

  // auth form handlers
  const onAuthChange =
    (k: keyof typeof authForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setAuthForm((s) => ({ ...s, [k]: e.target.value }));
      setLocalAuthMsg(null);
    };

  const sendOtp = async () => {
    setLocalAuthMsg(null);
    // require identifier (email) and name for sending OTP per your new flow
    if (!authForm.identifier.trim() || !authForm.name.trim()) {
      setLocalAuthMsg("Name and email are required to request OTP.");
      return;
    }
    try {
      // dispatch requestOtp with identifier (backend autodetects email)
      await dispatch(requestOtp(authForm.identifier));
      setLocalAuthMsg("OTP sent to your email. Check inbox/spam.");
      setResendTimer(300); // 5 minutes cooldown shown to user
    } catch (err: any) {
      setLocalAuthMsg(err?.message || "Failed to send OTP");
    }
  };

  const verifyEmailOtp = async () => {
    setLocalAuthMsg(null);
    if (!authForm.identifier.trim() || !authForm.otp.trim()) {
      setLocalAuthMsg("Email and OTP are required.");
      return;
    }
    try {
      setIsVerifying(true);
      // dispatch verifyOtp with identifier + otp + optional name/email so profile can be patched
      await dispatch(
        verifyOtp({
          identifier: authForm.identifier,
          otp: authForm.otp,
          name: authForm.name,
          email: authForm.identifier,
        }),
      ).unwrap();

      // success: auth slice should populate token & user
      setAuthForm((s) => ({ ...s, otp: "" }));
      setLocalAuthMsg(null);
    } catch (err: any) {
      setLocalAuthMsg(
        err?.response?.data?.message || err?.message || "Failed to verify OTP",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const resendOtp = async () => {
    if (!authForm.identifier.trim()) {
      setLocalAuthMsg("Email is required to resend OTP.");
      return;
    }
    if (resendTimer > 0) {
      setLocalAuthMsg(`Please wait ${resendTimer}s before resending.`);
      return;
    }
    try {
      await dispatch(requestOtp(authForm.identifier));
      setLocalAuthMsg("OTP resent.");
      setResendTimer(30);
    } catch {
      setLocalAuthMsg("Failed to resend OTP.");
    }
  };

  // modal actions
  const openModal = () => {
    setModalOpen(true);
    setModalStep(0);
    setBuyError(null);
    setLocalAuthMsg(null);
  };
  const closeModal = () => {
    setModalOpen(false);
    setModalStep(0);
    setSelectedTicketId(null);
    setSelectedQuantity(1);
    setBuyError(null);
    setLocalAuthMsg(null);
  };

  const selectTicketType = (ticketTypeId: string) => {
    setSelectedTicketId(ticketTypeId);
    setSelectedQuantity(1);
    setLocalAuthMsg(null);
  };

  const handleAttendeeChange = useCallback((label: string, value: string) => {
    setAttendee((prev) => ({ ...prev, [label]: value }));
  }, []);

  const incQty = () => {
    if (!selectedTicket) return;
    setSelectedQuantity((q) => Math.min(q + 1, selectedTicket.quantity));
  };
  const decQty = () => {
    setSelectedQuantity((q) => Math.max(1, q - 1));
  };

  const proceedFromTypes = () => {
    if (!selectedTicketId || !selectedTicket) {
      setLocalAuthMsg("Select a ticket and quantity to proceed.");
      return;
    }
    setModalStep(1);
    setLocalAuthMsg(null);
  };

  // ensure profile complete before checkout: if missing name/email, patch via API
  const ensureProfileComplete = async () => {
    if (!token) return;
    // if backend already returned user with name/email, nothing to do
    if (me?.name && me?.email) return;

    try {
      const payload: any = {};
      if (!me?.name && authForm.name) payload.name = authForm.name;
      if (!me?.email && authForm.identifier)
        payload.email = authForm.identifier;

      if (Object.keys(payload).length === 0) return;

      await api.patch("/user/profile", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // refresh profile in client (simple approach: hydrate session)
      await dispatch(hydrateSession());
    } catch (err) {
      // we don't fatal — but surface error
      console.error("Failed to patch profile:", err);
      throw new Error("Failed to save profile details");
    }
  };

  // booking -> buy
  const onBuy = async () => {
    setBuyError(null);
    setLocalAuthMsg(null);

    if (!token || !me) {
      setBuyError("Please verify via email OTP (or login) before buying.");
      return;
    }
    if (!selectedTicketId || !selectedTicket) {
      setBuyError("Select a ticket type first.");
      return;
    }
    if (selectedQuantity <= 0) {
      setBuyError("Quantity must be at least 1.");
      return;
    }
    if (ev?.CustomField) {
      for (const f of ev.CustomField) {
        if (f.required && !attendee[f.label]) {
          setBuyError(`Please fill ${f.label}`);
          setModalStep(1); // send them back to details
          return;
        }
      }
    }

    setBuying(true);

    try {
      // ensure profile complete (server expects name/email sometimes)
      await ensureProfileComplete();

      const finalAttendee = {
        ...(attendee || {}),
        name: me?.name ?? authForm.name,
        email: me?.email ?? authForm.identifier,
        phone: me?.phone ?? undefined,
      };

      const payload = {
        ticketTypeId: selectedTicketId,
        quantity: selectedQuantity,
        attendeeData: finalAttendee,
      };

      // include auth header when creating ticket
      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : undefined;
      const res = await api.post("/ticket/buy", payload, config);

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

      // handle typical Razorpay flow
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
          selectedTicket.price * selectedQuantity * 100;
        const currency = orderInfo.currency || "INR";
        const key =
          orderInfo.key ||
          orderInfo.razorpay_key ||
          (process.env.NEXT_PUBLIC_RAZORPAY_KEY as string | undefined);

        if (!key) {
          setBuyError("Payment key missing. Contact admin.");
          setBuying(false);
          return;
        }

        await loadRazorpay();

        // config for server-verification calls
        const serverConfig = token
          ? { headers: { Authorization: `Bearer ${token}` } }
          : undefined;

        const options: any = {
          key,
          amount,
          currency,
          name: ev?.title || "Event",
          description: `Tickets for ${ev?.title || "event"}`,
          order_id: orderId,
          prefill: {
            name: me?.name ?? authForm.name ?? undefined,
            email: me?.email ?? authForm.identifier ?? undefined,
            contact: me?.phone ?? undefined,
          },
          handler: async (resp: any) => {
            try {
              // backend verify requires auth middleware (so include token)
              await api.post(
                "/payment/verify",
                {
                  razorpay_order_id: resp?.razorpay_order_id,
                  razorpay_payment_id: resp?.razorpay_payment_id,
                  razorpay_signature: resp?.razorpay_signature,
                },
                serverConfig,
              );

              // success navigation
              const gotoId = ticketId || data?.ticket?.id || data?.ticketId;
              if (gotoId) {
                router.push(`/ticket/${gotoId}`);
              } else {
                router.push("/tickets/my-tickets");
              }
            } catch (verifyErr: any) {
              // try to mark payment failure for the created ticket
              if (ticketId) {
                try {
                  await api.post(
                    "/payment/failure",
                    { ticketId },
                    serverConfig,
                  );
                } catch (_) {}
              }
              setBuyError(
                verifyErr?.response?.data?.message ||
                  verifyErr?.message ||
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
                  await api.post(
                    "/payment/failure",
                    { ticketId: createdTicketId },
                    serverConfig,
                  );
                }
              } catch {}
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else if (data?.paymentUrl) {
        // fallback redirect
        window.location.href = data.paymentUrl;
      } else {
        const gotoId = ticketId || data?.ticket?.ticketId || data?.ticketId;
        if (gotoId) {
          router.push(`/ticket/${gotoId}`);
        } else {
          setBuyError(
            "Purchase succeeded but server response unexpected. Check My Tickets.",
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

  // Render skeletons & errors
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

  // main page render
  return (
    <div className="max-w-6xl md:w-[80vw] mx-auto px-4 py-8">
      <div className="flex gap-6">
        {/* Left: event details */}
        <div className="space-y-5">
          <div className="relative w-[36.319vw] h-[36.319vw] rounded-[1.3888888vw] overflow-hidden bg-zinc-800">
            {ev.banner_square || ev.banner_horizontal ? (
              <img
                src={ev.banner_square || ev.banner_horizontal!}
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

          <div>About organiser</div>
        </div>

        {/* Right: booking summary + open modal */}
        <aside className="w-full space-y-4">
          <div className="flex flex-col gap-4 bg-white rounded-[1.3888888vw] py-5 px-4">
            <h1 className="text-3xl font-semibold leading-none">{ev.title}</h1>

            <div className="flex gap-2">
              <div className="bg-[#EBF9FF] rounded-full text-[12px] py-1 px-2">
                Car show
              </div>

              <div className="bg-[#FFF7CC] rounded-full text-[12px] py-1 px-2">
                Concert
              </div>

              <div className="bg-[#FFF1EB] rounded-full text-[12px] py-1 px-2">
                Fashion show
              </div>

              <div className="bg-[#FFF1EB] rounded-full text-[12px] py-1 px-2">
                Talent hunt
              </div>
            </div>

            <div className="px-6 py-5 bg-[#F5F5F5] rounded-[0.833333vw]">
              <div className="flex gap-2 items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="19"
                  height="20"
                  viewBox="0 0 19 20"
                  fill="none"
                >
                  <path
                    d="M9.33332 2.2222C5.04776 2.2222 1.55554 5.71442 1.55554 9.99998C1.55554 14.2855 5.04776 17.7778 9.33332 17.7778C13.6189 17.7778 17.1111 14.2855 17.1111 9.99998C17.1111 5.71442 13.6189 2.2222 9.33332 2.2222ZM12.7167 12.7766C12.6078 12.9633 12.4133 13.0644 12.2111 13.0644C12.11 13.0644 12.0089 13.0411 11.9155 12.9789L9.50443 11.54C8.90554 11.1822 8.46221 10.3966 8.46221 9.70442V6.51553C8.46221 6.19664 8.72665 5.9322 9.04554 5.9322C9.36443 5.9322 9.62888 6.19664 9.62888 6.51553V9.70442C9.62888 9.98442 9.86221 10.3966 10.1033 10.5366L12.5144 11.9755C12.7944 12.1389 12.8878 12.4966 12.7167 12.7766Z"
                    fill="#1E1E1E"
                  />
                </svg>

                <h6>5:00PM to 7:00PM</h6>
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-white px-5 py-4 rounded-[1.3888888vw]">
            <h6>About Event</h6>

            <p className="text-[#8B8B8B]">{ev.description}</p>
          </div>

          <div className="flex items-center gap-3 p-1 pl-4 rounded-full bg-white">
            <div className="flex flex-col gap-1 w-15">
              <span className="text-[#8B8B8B] shrink-0">Starts at</span>

              <h2 className="shrink-0">₹{ev.TicketType[0].price}</h2>
            </div>
            <button
              onClick={openModal}
              className="bg-[#FFE348] py-7 rounded-full w-full border-b-2 border-[#FFDA0A]"
            >
              <div className="flex justify-center items-center gap-2">
                <img src="/svgs/ticket.svg" alt="" />
                <h3>Book Ticket</h3>
              </div>
            </button>
          </div>
        </aside>
      </div>

      {/* modal */}
      <Modal
        modalOpen={modalOpen}
        closeModal={() => setModalOpen(false)}
        modalStep={modalStep}
        setModalStep={setModalStep}
        ev={ev}
        selectedTicketId={selectedTicketId}
        selectedTicket={selectedTicket}
        selectedQuantity={selectedQuantity}
        incQty={incQty}
        decQty={decQty}
        selectTicketType={selectTicketType}
        fmtCurrency={fmtCurrency}
        localAuthMsg={localAuthMsg}
        setLocalAuthMsg={setLocalAuthMsg} // Add this line
        authForm={authForm}
        onAuthChange={onAuthChange}
        isAuthenticated={isAuthenticated}
        sendOtp={sendOtp}
        otpSent={otpSent}
        isVerifying={isVerifying}
        verifyEmailOtp={verifyEmailOtp}
        resendOtp={resendOtp}
        resendTimer={resendTimer}
        authLoading={authLoading}
        token={token}
        attendee={attendee}
        handleAttendeeChange={handleAttendeeChange}
        buyError={buyError}
        buying={buying}
        onBuy={onBuy}
        me={me}
        proceedFromTypes={proceedFromTypes}
      />
    </div>
  );
}
