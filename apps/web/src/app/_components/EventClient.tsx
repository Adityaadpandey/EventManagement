"use client";

import Modal from "@/app/_components/Modal";
import ReadMore from "@/app/_components/ReadMore";
import api from "@/lib/api";
import {
  hydrateSession,
  requestOtp,
  verifyOtp,
} from "@/lib/features/authSlice";
import { fetchEventDetails } from "@/lib/features/eventsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

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

type EventClientProps = {
  eventId: string;
  initialEvent: EventPublic;
};

export default function EventClient({
  eventId,
  initialEvent,
}: EventClientProps) {
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

  // event state - use initialEvent as fallback
  const {
    byId,
    loadingId,
    error: eventsError,
  } = useAppSelector((s) => s.events.details);
  const ev = (byId[eventId] as EventPublic | undefined | any) || initialEvent;
  const loadingEvent = loadingId === eventId && !initialEvent;

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

  // Store initial event in Redux if not already there
  useEffect(() => {
    if (initialEvent && !byId[eventId]) {
      // Optionally dispatch to store the initial event in Redux
      dispatch(fetchEventDetails({ eventId }));
    }
  }, [dispatch, eventId, initialEvent, byId]);

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
  // previous: const verifyEmailOtp = async () => { ... }
  const verifyEmailOtp = async (otpParam?: string) => {
    setLocalAuthMsg(null);

    const otpToUse = (otpParam ?? authForm.otp ?? "").toString();

    if (!authForm.identifier?.trim() || !otpToUse.trim()) {
      setLocalAuthMsg("Email and OTP are required.");
      return;
    }

    try {
      setIsVerifying(true);

      await dispatch(
        verifyOtp({
          identifier: authForm.identifier,
          otp: otpToUse,
          name: authForm.name,
          email: authForm.identifier,
        }),
      ).unwrap();

      // success: clear otp in UI state
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
              // show processing UI inside the modal
              setModalStep(3);

              await api.post(
                "/payment/verify",
                {
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                  ticketId,
                },
                serverConfig,
              );

              const gotoId = ticketId || data?.ticket?.id || data?.ticketId;
              if (gotoId) {
                router.push(`/tickets/${gotoId}`);
              } else {
                router.push("/tickets/my-tickets");
              }
            } catch (verifyErr: any) {
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

              // revert UI to checkout so user can retry/cancel
              setModalStep(2);
              setBuying(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else if (data?.paymentUrl) {
        // fallback redirect
        setModalStep(3);
        window.location.href = data.paymentUrl;
      } else {
        const gotoId = ticketId || data?.ticket?.ticketId || data?.ticketId;
        if (gotoId) {
          router.push(`/ticket/${gotoId}`);
        } else {
          setBuyError(
            "Purchase succeeded but server response unexpected. Check My Bookings.",
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

  // Render errors only (loading is handled by loading.tsx)
  if (eventsError) return <div className="p-6 text-red-500">{eventsError}</div>;
  if (!ev) return <div className="p-6 text-zinc-400">Event not found</div>;

  // main page render
  return (
    <div className="max-w-6xl md:w-[80vw] mx-auto px-4 py-8 pb-48 w-[100vw] overflow-x-hidden">
      <div className="md:flex gap-2 items-center pb-4 px-1 hidden">
        <Link href="/" className="text-sm text-[#8B8B8B]">
          Home
        </Link>{" "}
        <span className="text-[#8B8B8B]">{">"}</span> <p>Event page</p>
      </div>

      <Link
        href="/"
        className="text-sm text-[#8B8B8B] flex gap-2 items-center pb-4 md:hidden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="13"
          viewBox="0 0 12 13"
          fill="none"
        >
          <path
            opacity="0.3"
            d="M5.44023 12.5L0 6.5L5.44023 0.5L6.4898 1.64469L2.84548 5.66399H12V7.33601H2.84548L6.4898 11.3489L5.44023 12.5Z"
            fill="#1E1E1E"
          />
        </svg>
        Event Details
      </Link>
      <div className="flex gap-6 md:flex-row flex-col w-fit">
        {/* Left: event details */}
        <div className="space-y-5">
          <div className="relative md:w-[36.319vw] md:h-[36.319vw] w-[91.794vw] h-[91.794vw] md:rounded-[1.3888888vw] rounded-[5.128vw] overflow-hidden bg-zinc-300">
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
        </div>

        {/* Right: booking summary + open modal */}
        <aside className="md:w-full max-w-[92vw] space-y-4 overflow-hidden">
          <div className="flex flex-col gap-4 bg-white md:rounded-[1.3888888vw] rounded-[20px] py-5 px-4">
            <h1 className="text-3xl font-semibold leading-none md:max-w-[464px] w-[80%]">
              {ev.title}
            </h1>

            <div className="flex gap-2 flex-wrap">
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

            <div className="px-6 py-5 bg-[#F5F5F5] md:rounded-[0.833333vw] rounded-xl flex flex-wrap w-full shrink-0 gap-5 justify-between">
              <div className="flex items-center gap-2 shrink-0">
                <img src="/svgs/calendar.svg" alt="" />
                <h6 className="">
                  {ev.date &&
                    new Date(ev.date).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                    })}{" "}
                </h6>
              </div>

              <div className="flex gap-2 items-center shrink-0">
                <img src="/svgs/clock.svg" alt="" />

                <h6>5:00PM to 7:00PM</h6>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <img src="/svgs/location.svg" alt="" width={16} />
                <h6 className="">{ev.location}</h6>
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-white px-5 py-4 md:rounded-[1.3888888vw] rounded-xl">
            <h6>About Event</h6>

            <ReadMore text={ev.description} maxLength={2240} />
          </div>
        </aside>
      </div>

      <div className="mt-4 md:w-[523px] space-y-2">
        <h5>About Organiser</h5>
        <ReadMore text={ev.lister.bio} maxLength={328} />
      </div>

      <div className="flex items-center gap-6 md:p-1 md:pl-8 rounded-full md:bg-white fixed bottom-7 md:w-full md:max-w-[524px] max-w-[358px] w-[92vw] -translate-x-[50%] left-[50%]">
        <div className="md:flex hidden flex-col gap-1 w-15">
          <span className="text-[#8B8B8B] shrink-0">Starts at</span>

          <h2>₹{Math.min(...ev.TicketType.map((t) => t.price))}</h2>
        </div>
        <button
          onClick={openModal}
          className="bg-[#FFE348] md:py-7 py-5 rounded-full w-full border-b-3 border-[#FFDA0A] cursor-pointer relative overflow-hidden"
          style={{ boxShadow: "inset 0 0 15px 2px #FFF" }}
        >
          {/* Shine animation using Framer Motion */}
          <motion.div
            className="absolute top-0 h-full w-full pointer-events-none overflow-hidden rounded-full"
            initial={{ x: "-50%", y: "-5%" }}
            animate={{ x: "120%", y: "0" }}
            transition={{
              delay: 1,
              duration: 3.3,
              ease: "backInOut",
              repeat: Infinity,
            }}
          >
            <img
              src="/svgs/shine.svg"
              alt="shine"
              className="h-full object-cover opacity-60 rounded-full"
            />
          </motion.div>
          <div className="flex justify-center items-center gap-2">
            <img src="/svgs/ticket.svg" alt="" />
            <h2 className="z-10">Book Ticket</h2>
          </div>
        </button>
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
        setLocalAuthMsg={setLocalAuthMsg}
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
