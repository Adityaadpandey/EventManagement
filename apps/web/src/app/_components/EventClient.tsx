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
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
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
  lister?: { bio?: string };
  _count?: { DiscountCode?: number };
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
  const razorpayLoadingRef = useRef(false);
  const mountedRef = useRef(true);

  // Auth state
  const {
    user: me,
    token,
    otpSent,
    loading: authLoading,
    error: authError,
    hydrated,
  } = useAppSelector((s) => s.auth);

  // Event state
  const {
    byId,
    loadingId,
    error: eventsError,
  } = useAppSelector((s) => s.events.details);
  const ev = (byId[eventId] as EventPublic | undefined) || initialEvent;
  const loadingEvent = loadingId === eventId && !initialEvent;

  // List state for recommendations
  const { items: allEvents, loading: listLoading } = useAppSelector(
    (s) => s.events.list,
  );

  // Modal & booking state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<number>(0);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [attendee, setAttendee] = useState<Record<string, any>>({});
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState<string>("");
  const [countryCode, setCountryCode] = useState("91");

  const chipColors = ["#EBF9FF", "#FFF7CC", "#FFF1EB", "#FFF1EB"];

  // Auth form state
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

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Helper to get unique words from text
  const getWords = useCallback((text: string | null | undefined): string[] => {
    if (!text) return [];
    return [
      ...new Set(
        text
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2),
      ),
    ];
  }, []);

  // Jaccard similarity function
  const jaccardSimilarity = useCallback(
    (setA: Set<string>, setB: Set<string>): number => {
      if (setA.size === 0 && setB.size === 0) return 0;
      const intersection = new Set([...setA].filter((x) => setB.has(x)));
      const unionSize = setA.size + setB.size - intersection.size;
      return unionSize === 0 ? 0 : intersection.size / unionSize;
    },
    [],
  );

  // Calculate similar events
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

        const score = 0.5 * tagScore + 0.3 * descScore + 0.2 * titleScore;

        return { event, score };
      })
      .filter(({ score }) => score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ event }) => event);
  }, [ev, allEvents, eventId, getWords, jaccardSimilarity]);

  // Store initial event in Redux
  useEffect(() => {
    if (initialEvent && !byId[eventId]) {
      dispatch(fetchEventDetails({ eventId }));
    }
  }, [dispatch, eventId, initialEvent, byId]);

  // Fetch public events for recommendations
  useEffect(() => {
    if (ev && allEvents.length === 0 && !listLoading) {
      dispatch(fetchPublicEvents({ page: 1, limit: 20 }));
    }
  }, [dispatch, ev, allEvents.length, listLoading]);

  // Hydrate session
  useEffect(() => {
    if (!hydrated) {
      dispatch(hydrateSession());
    }
  }, [hydrated, dispatch]);

  // Auto-fill form when modal opens and user is authenticated
  useEffect(() => {
    if (modalOpen && me && isAuthenticated) {
      let phoneNumber = "";
      let extractedCountryCode = "91";

      if (me.phone) {
        let phone = me.phone;

        if (phone.startsWith("+")) {
          phone = phone.substring(1);

          if (phone.startsWith("91") && phone.length === 12) {
            extractedCountryCode = "91";
            phoneNumber = phone.substring(2);
          } else if (phone.startsWith("1") && phone.length === 11) {
            extractedCountryCode = "1";
            phoneNumber = phone.substring(1);
          } else {
            const match = phone.match(/^(\d{1,3})(\d{10})$/);
            if (match) {
              extractedCountryCode = match[1];
              phoneNumber = match[2];
            } else {
              phoneNumber = phone;
            }
          }
        } else if (phone.length > 10) {
          extractedCountryCode = phone.substring(0, phone.length - 10);
          phoneNumber = phone.substring(phone.length - 10);
        } else {
          phoneNumber = phone;
        }
      }

      setCountryCode(extractedCountryCode);
      setAuthForm({
        name: me.name || "",
        identifier: me.email || "",
        phone: phoneNumber,
        otp: "",
      });
    }
  }, [modalOpen, me, isAuthenticated]);

  // Auto-select most expensive ticket
  useEffect(() => {
    if (modalOpen && ev?.TicketType && ev.TicketType.length > 0) {
      if (!selectedTicketId) {
        const sortedTickets = [...ev.TicketType].sort(
          (a, b) => b.price - a.price,
        );
        const topTicket = sortedTickets[0];
        if (topTicket) {
          setSelectedTicketId(topTicket.ticketTypeId);
          setSelectedQuantity(1);
        }
      }
    }
  }, [modalOpen, ev?.TicketType, selectedTicketId]);

  // Resend timer countdown
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
      ev?.TicketType?.find((t) => t.ticketTypeId === selectedTicketId) ?? null,
    [ev, selectedTicketId],
  );

  // Load Razorpay script
  const loadRazorpay = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        return reject(new Error("Client only"));
      }
      if ((window as any).Razorpay) {
        return resolve();
      }
      if (razorpayLoadingRef.current) {
        // Already loading, wait for it
        const checkInterval = setInterval(() => {
          if ((window as any).Razorpay) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        return;
      }

      razorpayLoadingRef.current = true;
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        razorpayLoadingRef.current = false;
        resolve();
      };
      script.onerror = () => {
        razorpayLoadingRef.current = false;
        reject(new Error("Razorpay script failed to load"));
      };
      document.body.appendChild(script);
    });
  }, []);

  // Format currency
  const fmtCurrency = useCallback(
    (amountInPaise: number) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amountInPaise / 100),
    [],
  );

  // Auth form handlers
  const onAuthChange = useCallback(
    (k: keyof typeof authForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setAuthForm((s) => ({ ...s, [k]: e.target.value }));
      setLocalAuthMsg(null);
      setBuyError(null);
    },
    [],
  );

  const sendOtp = useCallback(async () => {
    setLocalAuthMsg(null);
    setBuyError(null);

    const trimmedEmail = authForm.identifier?.trim();
    const trimmedName = authForm.name?.trim();

    if (!trimmedEmail || !trimmedName) {
      setLocalAuthMsg("Name and email are required to request OTP.");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setLocalAuthMsg("Please enter a valid email address.");
      return;
    }

    try {
      await dispatch(requestOtp(trimmedEmail)).unwrap();
      setLocalAuthMsg("OTP sent to your email. Check inbox/spam.");
      setResendTimer(300);
    } catch (err: any) {
      const errorMsg =
        err?.message || err?.response?.data?.message || "Failed to send OTP";
      setLocalAuthMsg(errorMsg);
    }
  }, [authForm.identifier, authForm.name, dispatch]);

  const verifyEmailOtp = useCallback(
    async (otpParam?: string) => {
      setLocalAuthMsg(null);
      setBuyError(null);

      const otpToUse = (otpParam ?? authForm.otp ?? "").toString().trim();
      const trimmedEmail = authForm.identifier?.trim();

      if (!trimmedEmail || !otpToUse) {
        setLocalAuthMsg("Email and OTP are required.");
        return;
      }

      if (otpToUse.length !== 6 || !/^\d{6}$/.test(otpToUse)) {
        setLocalAuthMsg("OTP must be exactly 6 digits.");
        return;
      }

      try {
        setIsVerifying(true);

        const fullPhone = `+${countryCode}${authForm.phone}`;

        await dispatch(
          verifyOtp({
            identifier: trimmedEmail,
            otp: otpToUse,
            name: authForm.name?.trim(),
            email: trimmedEmail,
            phone: fullPhone,
          }),
        ).unwrap();

        setAuthForm((s) => ({ ...s, otp: "" }));
        setLocalAuthMsg(null);
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message ||
          err?.message ||
          "Invalid OTP. Please try again.";
        setLocalAuthMsg(errorMsg);
      } finally {
        if (mountedRef.current) {
          setIsVerifying(false);
        }
      }
    },
    [authForm, countryCode, dispatch],
  );

  const resendOtp = useCallback(async () => {
    const trimmedEmail = authForm.identifier?.trim();

    if (!trimmedEmail) {
      setLocalAuthMsg("Email is required to resend OTP.");
      return;
    }

    if (resendTimer > 0) {
      setLocalAuthMsg(`Please wait ${resendTimer}s before resending.`);
      return;
    }

    try {
      await dispatch(requestOtp(trimmedEmail)).unwrap();
      setLocalAuthMsg("OTP resent successfully.");
      setResendTimer(30);
    } catch (err: any) {
      const errorMsg =
        err?.message || err?.response?.data?.message || "Failed to resend OTP";
      setLocalAuthMsg(errorMsg);
    }
  }, [authForm.identifier, resendTimer, dispatch]);

  // Modal actions
  const openModal = useCallback(() => {
    setModalOpen(true);
    setModalStep(0);
    setBuyError(null);
    setLocalAuthMsg(null);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalStep(0);
    setSelectedTicketId(null);
    setSelectedQuantity(1);
    setBuyError(null);
    setLocalAuthMsg(null);
    setDiscountCode("");
  }, []);

  const selectTicketType = useCallback((ticketTypeId: string) => {
    setSelectedTicketId(ticketTypeId);
    setSelectedQuantity(1);
    setLocalAuthMsg(null);
    setBuyError(null);
  }, []);

  const handleAttendeeChange = useCallback((label: string, value: string) => {
    setAttendee((prev) => ({ ...prev, [label]: value }));
    setBuyError(null);
  }, []);

  const incQty = useCallback(() => {
    if (!selectedTicket) return;
    setSelectedQuantity((q) => Math.min(q + 1, selectedTicket.quantity));
  }, [selectedTicket]);

  const decQty = useCallback(() => {
    setSelectedQuantity((q) => Math.max(1, q - 1));
  }, []);

  const proceedFromTypes = useCallback(() => {
    if (!selectedTicketId || !selectedTicket) {
      setLocalAuthMsg("Please select a ticket type to proceed.");
      return;
    }
    setModalStep(1);
    setLocalAuthMsg(null);
    setBuyError(null);
  }, [selectedTicketId, selectedTicket]);

  const ensureProfileComplete = useCallback(async () => {
    if (!token) return;

    const payload: any = {};

    const trimmedName = authForm.name?.trim();
    const trimmedEmail = authForm.identifier?.trim();
    const trimmedPhone = authForm.phone?.trim();

    if (!me?.name && trimmedName) {
      payload.name = trimmedName;
    }

    if (!me?.email && trimmedEmail) {
      payload.email = trimmedEmail;
    }

    if (trimmedPhone) {
      const fullPhone = `+${countryCode}${trimmedPhone.replace(/\D/g, "")}`;
      if (!me?.phone || me.phone !== fullPhone) {
        payload.phone = fullPhone;
      }
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    try {
      await api.patch("/user/profile", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await dispatch(hydrateSession());
    } catch (err: any) {
      console.error(
        "Failed to patch profile:",
        err?.response?.data || err?.message || err,
      );
      throw new Error("Failed to update profile. Please try again.");
    }
  }, [token, authForm, countryCode, me, dispatch]);

  const onBuy = useCallback(async () => {
    setBuyError(null);
    setLocalAuthMsg(null);

    if (!token || !me) {
      setBuyError("Please verify via email OTP before purchasing.");
      setModalStep(1);
      return;
    }

    if (!selectedTicketId || !selectedTicket) {
      setBuyError("Please select a ticket type.");
      setModalStep(0);
      return;
    }

    if (selectedQuantity <= 0) {
      setBuyError("Quantity must be at least 1.");
      return;
    }

    // Validate required custom fields
    if (ev?.CustomField) {
      for (const f of ev.CustomField) {
        if (f.required && !attendee[f.label]?.trim()) {
          setBuyError(`Please fill in ${f.label}`);
          setModalStep(1);
          return;
        }
      }
    }

    setBuying(true);

    try {
      await ensureProfileComplete();

      const fullPhone = `+${countryCode}${authForm.phone.replace(/\D/g, "")}`;

      const finalAttendee: Record<string, any> = {
        name: me?.name ?? authForm.name?.trim(),
        email: me?.email ?? authForm.identifier?.trim(),
        phone: me?.phone ?? fullPhone,
      };

      if (ev?.CustomField) {
        for (const cf of ev.CustomField) {
          if (attendee[cf.label]?.trim()) {
            finalAttendee[cf.label] = attendee[cf.label].trim();
          }
        }
      }

      const payload: any = {
        ticketTypeId: selectedTicketId,
        quantity: selectedQuantity,
        attendeeData: finalAttendee,
      };

      if (discountCode?.trim()) {
        payload.discountCode = discountCode.trim();
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };

      const res = await api.post("/ticket/buy", payload, config);

      const data = res.data?.data || res.data;
      const ticketId =
        data?.ticket?.ticketId ||
        data?.ticketId ||
        data?.ticket?.id ||
        data?.id;

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
          selectedTicket.price * selectedQuantity * 100;
        const currency = orderInfo.currency || "INR";
        const key =
          orderInfo.key ||
          orderInfo.razorpay_key ||
          process.env.NEXT_PUBLIC_RAZORPAY_KEY;

        if (!key) {
          throw new Error("Payment key missing. Please contact support.");
        }

        await loadRazorpay();

        if (!mountedRef.current) return;

        const options: any = {
          key,
          amount,
          currency,
          name: ev?.title || "Event",
          description: `Tickets for ${ev?.title || "event"}`,
          order_id: orderId,
          prefill: {
            name: me?.name ?? authForm.name?.trim() ?? undefined,
            email: me?.email ?? authForm.identifier?.trim() ?? undefined,
            contact: me?.phone ?? fullPhone ?? undefined,
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
                config,
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
                  await api.post("/payment/failure", { ticketId }, config);
                } catch (_) {}
              }
              const errorMsg =
                verifyErr?.response?.data?.message ||
                verifyErr?.message ||
                "Payment verification failed. Please check My Bookings.";
              setBuyError(errorMsg);
              setModalStep(2);
            } finally {
              if (mountedRef.current) {
                setBuying(false);
              }
            }
          },
          modal: {
            ondismiss: async () => {
              try {
                if (ticketId) {
                  await api.post("/payment/failure", { ticketId }, config);
                }
              } catch (_) {}

              if (mountedRef.current) {
                setModalStep(2);
                setBuying(false);
                setBuyError(
                  "Payment was cancelled. Please try again if you wish to complete your purchase.",
                );
              }
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
            "Purchase succeeded but response unexpected. Check My Bookings.",
          );
          setTimeout(() => router.push("/tickets/my-tickets"), 2000);
        }
      }
    } catch (e: any) {
      const errorMsg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to create ticket. Please try again.";
      setBuyError(errorMsg);
      setModalStep(2);
    } finally {
      if (mountedRef.current) {
        setBuying(false);
      }
    }
  }, [
    token,
    me,
    selectedTicketId,
    selectedTicket,
    selectedQuantity,
    ev,
    attendee,
    authForm,
    countryCode,
    discountCode,
    ensureProfileComplete,
    loadRazorpay,
    router,
  ]);

  if (eventsError)
    return (
      <div className="p-6 text-red-500" role="alert">
        {eventsError}
      </div>
    );
  if (!ev)
    return (
      <div className="p-6 text-zinc-400">Event not found or unavailable</div>
    );

  const minPrice =
    ev.TicketType && ev.TicketType.length > 0
      ? Math.min(...ev.TicketType.map((t) => t.price))
      : 0;

  return (
    <div className="max-w-6xl md:w-[80vw] mx-auto px-4 py-8 pb-48 w-[100vw] overflow-x-hidden">
      <div className="md:flex gap-2 items-center pb-4 px-1 hidden">
        <Link href="/" className="text-sm text-[#8B8B8B]">
          Home
        </Link>
        <span className="text-[#8B8B8B]">{">"}</span>
        <p>Event page</p>
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

            {ev.chips && ev.chips.length > 0 && (
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
            )}

            <div className="px-6 py-5 bg-[#F5F5F5] md:rounded-[0.833333vw] rounded-xl flex flex-wrap w-full shrink-0 gap-5 justify-between">
              {ev.date && (
                <div className="flex items-center gap-2 shrink-0">
                  <img src="/svgs/calendar.svg" alt="" />
                  <h6 className="">
                    {new Date(ev.date).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                    })}
                  </h6>
                </div>
              )}

              <div className="flex gap-2 items-center shrink-0">
                <img src="/svgs/clock.svg" alt="" />
                <h6>5:00PM to 7:00PM</h6>
              </div>

              {ev.location && (
                <div className="flex items-center gap-2 shrink-0">
                  <img src="/svgs/location.svg" alt="" width={16} />
                  <h6 className="">{ev.location}</h6>
                </div>
              )}
            </div>
          </div>

          {ev.description && (
            <div className="space-y-4 bg-white px-5 py-4 md:rounded-[1.3888888vw] rounded-xl">
              <h6>About Event</h6>
              <ReadMore text={ev.description} maxLength={2240} />
            </div>
          )}
        </aside>
      </div>

      {ev.lister?.bio && (
        <div className="mt-4 md:w-[523px] space-y-2">
          <h5>About Organiser</h5>
          <ReadMore text={ev.lister.bio} maxLength={328} />
        </div>
      )}

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
                  price={
                    recEvent.TicketType && recEvent.TicketType.length > 0
                      ? Math.min(
                          ...recEvent.TicketType.map((t: any) => t.price),
                        )
                      : 0
                  }
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-6 md:p-1 md:pl-8 rounded-full md:bg-white fixed bottom-7 md:w-full md:max-w-[524px] max-w-[358px] w-[92vw] -translate-x-[50%] left-[50%]">
        <div className="md:flex hidden flex-col gap-1 w-15">
          <span className="text-[#8B8B8B] shrink-0">Starts at</span>
          <h2>₹{minPrice}</h2>
        </div>
        <button
          onClick={openModal}
          className="bg-[#FFE348] md:py-7 py-5 rounded-full w-full border-b-3 border-[#FFDA0A] cursor-pointer relative overflow-hidden"
          style={{ boxShadow: "inset 0 0 15px 2px #FFF" }}
          disabled={!ev.TicketType || ev.TicketType.length === 0}
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
        countryCode={countryCode}
        setCountryCode={setCountryCode}
      />
    </div>
  );
}
