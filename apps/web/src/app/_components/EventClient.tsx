"use client";

import Modal from "@/app/_components/Modal";
import ReadMore from "@/app/_components/ReadMore";
import EventCard from "@/app/_components/EventCard";
import api from "@/lib/api";
import {
  hydrateSession,
  requestOtp,
  verifyOtp,
} from "@/lib/features/authSlice";
import {
  fetchEventDetails,
  fetchPublicEvents,
} from "@/lib/features/eventsSlice";
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
  discount?: boolean;
  TicketType: TicketType[];
  CustomField: CustomField[];
  chips: string[];
  tags?: string[];
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

  // list state for recommendations
  const { items: allEvents, loading: listLoading } = useAppSelector(
    (s) => s.events.list,
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<number>(0);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [attendee, setAttendee] = useState<Record<string, any>>({});
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState<string>("");

  const chipColors = ["#EBF9FF", "#FFF7CC", "#FFF1EB", "#FFF1EB"];

  // local auth form for details step (identifier = email)
  const [authForm, setAuthForm] = useState({
    name: "",
    identifier: "",
    phone: "",
    otp: "",
  });
  const [localAuthMsg, setLocalAuthMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState<number>(0);

  const isAuthenticated = Boolean(token && me);
  const showAuthBlock = hydrated && !isAuthenticated;

  // Helper to get unique words from text
  const getWords = (text: string | null | undefined): string[] => {
    if (!text) return [];
    return [
      ...new Set(
        text
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2),
      ),
    ]; // Ignore short words
  };

  // Jaccard similarity function for sets of strings
  const jaccardSimilarity = (setA: Set<string>, setB: Set<string>): number => {
    if (setA.size === 0 && setB.size === 0) return 0;
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const unionSize = setA.size + setB.size - intersection.size;
    return unionSize === 0 ? 0 : intersection.size / unionSize;
  };

  const similarEvents = useMemo(() => {
    if (!ev || !allEvents || allEvents.length === 0) return [];

    const currentTags = [...(ev.chips || []), ...(ev.tags || [])];
    const currentTitleWords = getWords(ev.title);
    const currentDescWords = getWords(ev.description);

    const currentTagSet = new Set(currentTags.map((t) => t.toLowerCase()));
    const currentTitleSet = new Set(currentTitleWords);
    const currentDescSet = new Set(currentDescWords);

    return allEvents
      .filter((event: any) => event.eventId !== eventId)
      .map((event: any) => {
        const eventTags = [...(event.chips || []), ...(event.tags || [])];
        const eventTitleWords = getWords(event.title);
        const eventDescWords = getWords(event.description);

        const eventTagSet = new Set(eventTags.map((t) => t.toLowerCase()));
        const eventTitleSet = new Set(eventTitleWords);
        const eventDescSet = new Set(eventDescWords);

        const tagScore = jaccardSimilarity(currentTagSet, eventTagSet);
        const titleScore = jaccardSimilarity(currentTitleSet, eventTitleSet);
        const descScore = jaccardSimilarity(currentDescSet, eventDescSet);

        // Combined score: weighted average (more weight to tags, then desc, then title)
        const score = 0.5 * tagScore + 0.3 * descScore + 0.2 * titleScore;

        return { event, score };
      })
      .filter(({ score }) => score > 0.1) // Threshold to avoid weak matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ event }) => event);
  }, [ev, allEvents, eventId]);

  // Store initial event in Redux if not already there
  useEffect(() => {
    if (initialEvent && !byId[eventId]) {
      dispatch(fetchEventDetails({ eventId }));
    }
  }, [dispatch, eventId, initialEvent, byId]);

  // Fetch public events for recommendations
  useEffect(() => {
    if (!ev) return;
    dispatch(fetchPublicEvents({ page: 1, limit: 20 }));
  }, [dispatch, ev]);

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
    if (!authForm.identifier.trim() || !authForm.name.trim()) {
      setLocalAuthMsg("Name and email are required to request OTP.");
      return;
    }
    try {
      await dispatch(requestOtp(authForm.identifier));
      setLocalAuthMsg("OTP sent to your email. Check inbox/spam.");
      setResendTimer(300);
    } catch (err: any) {
      setLocalAuthMsg(err?.message || "Failed to send OTP");
    }
  };

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
          phone: authForm.phone,
        }),
      ).unwrap();

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
    setDiscountCode("");
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

  // ensure profile complete before checkout
  const ensureProfileComplete = async () => {
    if (!token) return;
    if (me?.name && me?.email && me?.phone) return;

    try {
      const payload: any = {};
      if (!me?.name && authForm.name) payload.name = authForm.name;
      if (!me?.email && authForm.identifier)
        payload.email = authForm.identifier;
      if (!me?.phone && authForm.phone) payload.phone = authForm.phone;

      if (Object.keys(payload).length === 0) return;

      await api.patch("/user/profile", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await dispatch(hydrateSession());
    } catch (err) {
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

    // Validate required custom fields
    if (ev?.CustomField) {
      for (const f of ev.CustomField) {
        if (f.required && !attendee[f.label]) {
          setBuyError(`Please fill ${f.label}`);
          setModalStep(1);
          return;
        }
      }
    }

    setBuying(true);

    try {
      await ensureProfileComplete();

      // Build complete attendeeData including custom fields
      const finalAttendee: Record<string, any> = {
        name: me?.name ?? authForm.name,
        email: me?.email ?? authForm.identifier,
        phone: me?.phone ?? authForm.phone ?? undefined,
      };

      // Add all custom field values to attendeeData
      if (ev?.CustomField) {
        for (const cf of ev.CustomField) {
          if (attendee[cf.label]) {
            finalAttendee[cf.label] = attendee[cf.label];
          }
        }
      }

      // Build payload
      const payload: any = {
        ticketTypeId: selectedTicketId,
        quantity: selectedQuantity,
        attendeeData: finalAttendee,
      };

      if (discountCode && discountCode.trim() !== "") {
        payload.discountCode = discountCode.trim();
      }

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

              setModalStep(2);
              setBuying(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else if (data?.paymentUrl) {
        setModalStep(3);
        window.location.href = data.paymentUrl;
      } else {
        const gotoId = ticketId || data?.ticket?.ticketId || data?.ticketId;
        if (gotoId) {
          router.push(`/tickets/${gotoId}`);
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

  if (eventsError) return <div className="p-6 text-red-500">{eventsError}</div>;
  if (!ev) return <div className="p-6 text-zinc-400">Event not found</div>;

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

        <aside className="md:w-full max-w-[92vw] space-y-4 overflow-hidden">
          <div className="flex flex-col gap-4 bg-white md:rounded-[1.3888888vw] rounded-[20px] py-5 px-4">
            <h1 className="text-3xl font-semibold leading-none md:max-w-[464px] w-[80%]">
              {ev.title}
            </h1>

            <div className="flex gap-2 flex-wrap">
              {ev.chips.map((chip, index) => (
                <div
                  key={index}
                  className="rounded-full text-[12px] py-1 px-2"
                  style={{
                    backgroundColor: chipColors[index % chipColors.length],
                  }}
                >
                  {chip}
                </div>
              ))}
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

      {/* Recommendations Section */}
      {similarEvents.length > 0 && (
        <div className="mt-8 space-y-4">
          <h1 className="bricolage-grotesque font-semibold">
            Events you may like
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {similarEvents.map((recEvent: any) => (
              <Link
                key={recEvent.eventId}
                href={`/event/${recEvent.eventId}`}
                className="group"
              >
                <EventCard
                  imageUrl={recEvent.banner_horizontal}
                  title={recEvent.title}
                  location={recEvent.location}
                  date={recEvent.date}
                  price={Math.min(
                    ...recEvent.TicketType.map((t: any) => t.price),
                  )}
                />
              </Link>
            ))}
          </div>
        </div>
      )}

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

      <Modal
        modalOpen={modalOpen}
        closeModal={closeModal}
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
        discountCode={discountCode}
        setDiscountCode={setDiscountCode}
      />
    </div>
  );
}
