"use client";

import { useEffect, useState, useMemo, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { Ticket, Calendar, MapPin, CheckCircle, XCircle } from "lucide-react";
import api from "@/lib/api";
import { RootState } from "@/lib/store";

type Ticket = {
  ticketId: string;
  qrCode: string;
  totalPrice?: number;
  quantity?: number;
  createdAt?: string;
  checkedIn?: boolean;
  ticketType?: {
    event?: {
      title?: string;
      location?: string;
      date?: string;
      banner_square?: string;
    };
  };
};

type Tab = "upcoming" | "past";

const TicketCard = memo(
  ({
    ticket,
    isPast = false,
    onClick,
  }: {
    ticket: Ticket;
    isPast?: boolean;
    onClick: () => void;
  }) => {
    const isCheckedIn = ticket.checkedIn;
    const cardBg = isPast
      ? isCheckedIn
        ? "bg-gradient-to-br from-emerald-50/80 to-emerald-25/80 border-emerald-100/50"
        : "bg-gradient-to-br from-red-50/80 to-red-25/80 border-red-100/50"
      : "bg-white border-gray-100/50";
    const statusColor = isPast
      ? isCheckedIn
        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
        : "bg-red-50 border-red-200 text-red-700"
      : "bg-transparent border-transparent text-gray-500";

    return (
      <div
        className={`group relative flex flex-col md:flex-row justify-between items-stretch rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ${cardBg} hover:shadow-2xl hover:border-[#FFE348]/30`}
        onClick={onClick}
      >
        {/* Ticket stub */}
        <div className="relative flex-shrink-0 w-full md:w-[420px] h-48 md:h-auto bg-gradient-to-br from-[#FFE348]/5 to-transparent">
          {ticket.ticketType?.event?.banner_square ? (
            <div
              className="absolute inset-0 bg-center bg-cover group-hover:brightness-105 transition-all duration-500"
              style={{
                backgroundImage: `url(${ticket.ticketType.event.banner_square})`,
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-yellow-400/20 to-orange-500/20 flex items-center justify-center">
              <Ticket className="h-16 w-16 text-white/60" />
            </div>
          )}

          <div className="absolute top-4 left-4 bg-[#FFE348] backdrop-blur-sm rounded-lg px-3 py-1 shadow-md">
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              <p className="text-lg">{ticket.quantity || 1}x</p>
            </div>
          </div>
        </div>

        {/* Main ticket body */}
        <div className="flex-1 p-8 flex flex-col justify-between min-h-[240px] relative z-10 bg-dashed border border-dashed md:rounded-r-3xl rounded-r-none md:rounded-l-none rounded-b-3xl">
          <div
            className="absolute left-0 top-0 w-full h-px border-gray-300/50"
            style={{
              backgroundImage:
                "linear-gradient(to right, transparent 50%, #d1d5db 50%)",
              backgroundSize: "4px 1px",
            }}
          />

          <div className="space-y-4">
            <h1 className="text-gray-900 leading-tight line-clamp-2 bricolage-grotesque font-medium tracking-tighter">
              {ticket.ticketType?.event?.title || "Unknown Event"}
            </h1>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <MapPin className="h-6 w-6 flex-shrink-0" />
                <h3 className="text-gray-700">
                  {ticket.ticketType?.event?.location || "TBD"}
                </h3>
              </div>
              {ticket.ticketType?.event?.date && (
                <div className="flex items-center space-x-4">
                  <Calendar className="h-6 w-6 flex-shrink-0" />
                  <h5 className="text-gray-700">
                    {new Date(
                      ticket.ticketType.event.date,
                    ).toLocaleDateString()}
                  </h5>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-gray-200/50">
              <p className="text-3xl text-gray-900">
                ₹{ticket.totalPrice ?? 0}
              </p>
              <div className="text-right">
                <p className="text-base text-gray-500">
                  Booked{" "}
                  {ticket.createdAt
                    ? new Date(ticket.createdAt).toLocaleDateString()
                    : "-"}
                </p>
              </div>
            </div>
          </div>

          {isPast && (
            <div
              className={`mt-6 self-start flex items-center px-5 py-3 rounded-full border ${statusColor} space-x-2 shadow-md backdrop-blur-sm`}
            >
              {isCheckedIn ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span className="text-base uppercase tracking-wide">
                {isCheckedIn ? "Checked In" : "Not Checked In"}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  },
);

TicketCard.displayName = "TicketCard";

const TabButton = memo(
  ({
    tab,
    label,
    count,
    active,
    onClick,
  }: {
    tab: Tab;
    label: string;
    count?: number;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`relative px-8 py-4 rounded-2xl transition-all duration-300 flex items-center space-x-2 group cursor-pointer ${
        active
          ? "bg-black text-white shadow-lg shadow-[#FFE348]/25"
          : "bg-white/50 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <span className="text-lg">{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            active ? "bg-white/20" : "bg-gray-200"
          }`}
        >
          {count}
        </span>
      )}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#FFE348]/30 to-[#FFE348]/0 -z-10" />
    </button>
  ),
);

TabButton.displayName = "TabButton";

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();

  const { token } = useSelector((state: RootState) => state.auth);

  // Wait for Redux store to hydrate
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && !token) {
      router.replace("/auth");
    }
  }, [token, router, isHydrated]);

  useEffect(() => {
    if (!token) return;

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
  }, [token, isHydrated]);

  const categorizedTickets = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const upcoming: Ticket[] = [];
    const todayEvents: Ticket[] = [];
    const pastCheckedIn: Ticket[] = [];
    const pastNotCheckedIn: Ticket[] = [];

    tickets.forEach((t) => {
      const eventDate = new Date(t.ticketType?.event?.date || "");

      if (eventDate >= today && eventDate <= todayEnd) {
        todayEvents.push(t);
      } else if (eventDate > todayEnd) {
        upcoming.push(t);
      } else {
        if (t.checkedIn) {
          pastCheckedIn.push(t);
        } else {
          pastNotCheckedIn.push(t);
        }
      }
    });

    return { upcoming, todayEvents, pastCheckedIn, pastNotCheckedIn };
  }, [tickets]);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  const handleTicketClick = useCallback(
    (ticketId: string) => {
      router.push(`/tickets/${ticketId}`);
    },
    [router],
  );

  if (!isHydrated || !token) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center text-gray-500 text-xl">
          Loading your tickets...
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center text-red-500 text-xl">{err}</div>
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center text-gray-500 max-w-md">
          <Ticket className="mx-auto h-20 w-20 mb-6 text-gray-300" />
          <p className="text-2xl text-gray-900 mb-3">No tickets yet</p>
          <p className="text-lg text-gray-600">
            Get started by booking your first event.
          </p>
        </div>
      </div>
    );
  }

  const { upcoming, todayEvents, pastCheckedIn, pastNotCheckedIn } =
    categorizedTickets;
  const totalUpcoming = todayEvents.length + upcoming.length;
  const totalPast = pastCheckedIn.length + pastNotCheckedIn.length;

  return (
    <div className="bg-white h-screen overflow-y-auto pb-20">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 pb-20">
        <h1 className="text-5xl text-[#3D3D3D] home-page-heading">
          My Tickets
        </h1>
        <div className="flex gap-3 mb-12">
          <TabButton
            tab="upcoming"
            label="Upcoming"
            count={totalUpcoming}
            active={activeTab === "upcoming"}
            onClick={() => handleTabChange("upcoming")}
          />
          <TabButton
            tab="past"
            label="Past"
            count={totalPast}
            active={activeTab === "past"}
            onClick={() => handleTabChange("past")}
          />
        </div>

        {activeTab === "upcoming" ? (
          <div className="space-y-16">
            {todayEvents.length > 0 && (
              <section className="relative bg-gradient-to-r from-orange-50/50 to-transparent rounded-3xl p-6 md:p-8 border border-orange-100/50 shadow-inner">
                <div className="flex items-center space-x-5 mb-6">
                  <div>
                    <h3 className="text-4xl text-gray-900 bricolage-grotesque font-medium tracking-tighter">
                      Today's Events
                    </h3>
                    <p className="text-lg text-gray-500 mt-1">
                      {todayEvents.length}{" "}
                      {todayEvents.length === 1 ? "ticket" : "tickets"}
                    </p>
                  </div>
                </div>
                <div className="space-y-8">
                  {todayEvents.map((t) => (
                    <TicketCard
                      key={t.ticketId}
                      ticket={t}
                      onClick={() => handleTicketClick(t.ticketId)}
                    />
                  ))}
                </div>
              </section>
            )}

            {upcoming.length > 0 && (
              <section className="relative bg-gradient-to-r from-blue-50/30 to-transparent rounded-3xl p-6 md:p-8 border border-blue-100/40 shadow-inner">
                <div className="flex items-center space-x-5 mb-6">
                  <div>
                    <h3 className="text-4xl text-gray-900 bricolage-grotesque font-medium tracking-tighter">
                      Upcoming Events
                    </h3>
                    <p className="text-lg text-gray-500 mt-1">
                      {upcoming.length}{" "}
                      {upcoming.length === 1 ? "ticket" : "tickets"}
                    </p>
                  </div>
                </div>
                <div className="space-y-8">
                  {upcoming.map((t) => (
                    <TicketCard
                      key={t.ticketId}
                      ticket={t}
                      onClick={() => handleTicketClick(t.ticketId)}
                    />
                  ))}
                </div>
              </section>
            )}

            {totalUpcoming === 0 && (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <p className="text-xl text-gray-500">
                  No upcoming or today events
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-12">
            {totalPast > 0 ? (
              <>
                <div className="space-y-8">
                  {[...pastCheckedIn, ...pastNotCheckedIn].map((t) => (
                    <TicketCard
                      key={t.ticketId}
                      ticket={t}
                      isPast
                      onClick={() => handleTicketClick(t.ticketId)}
                    />
                  ))}
                </div>
                <div className="text-center py-8 border-t border-gray-200/50">
                  <p className="text-lg text-gray-600">
                    {pastCheckedIn.length} checked in •{" "}
                    {pastNotCheckedIn.length} not checked in
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <p className="text-xl text-gray-500">No past events</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
