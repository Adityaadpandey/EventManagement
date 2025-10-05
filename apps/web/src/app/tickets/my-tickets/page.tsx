"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  Ticket,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  Hash,
} from "lucide-react";
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

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const router = useRouter();

  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!token) router.replace("/auth");
  }, [token, router]);

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
  }, [token]);

  if (!token) return null;

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center text-gray-500 text-xl">
          Loading your tickets...
        </div>
      </div>
    );
  if (err)
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center text-red-500 text-xl">{err}</div>
      </div>
    );
  if (!tickets.length)
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

  // Helper to group tickets
  const today = new Date();
  const isSameDay = (date1: Date, date2: Date) =>
    date1.toDateString() === date2.toDateString();

  const upcoming = tickets.filter((t) => {
    const eventDate = new Date(t.ticketType?.event?.date || "");
    return eventDate > today;
  });

  const todayEvents = tickets.filter((t) => {
    const eventDate = new Date(t.ticketType?.event?.date || "");
    return isSameDay(eventDate, today);
  });

  const past = tickets.filter((t) => {
    const eventDate = new Date(t.ticketType?.event?.date || "");
    return eventDate < today && !isSameDay(eventDate, today);
  });

  const pastCheckedIn = past.filter((t) => t.checkedIn === true);
  const pastNotCheckedIn = past.filter((t) => t.checkedIn === false);

  const renderTicket = (t: Ticket, isPast = false) => {
    const isCheckedIn = t.checkedIn;
    const accent = "#FFE348";
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
        key={t.ticketId}
        className={`group relative flex flex-col md:flex-row justify-between items-stretch rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ${cardBg} hover:shadow-2xl hover:border-[#FFE348]/30`}
        onClick={() => router.push(`/tickets/${t.ticketId}`)}
      >
        {/* Ticket stub - left side with banner and notch */}
        <div className="relative flex-shrink-0 w-full md:w-[420px] h-48 md:h-auto bg-gradient-to-br from-[#FFE348]/5 to-transparent">
          {t.ticketType?.event?.banner_square ? (
            <div
              className="absolute inset-0 bg-center bg-cover group-hover:brightness-105 transition-all duration-500"
              style={{
                backgroundImage: `url(${t.ticketType.event.banner_square})`,
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-yellow-400/20 to-orange-500/20 flex items-center justify-center">
              <Ticket className="h-16 w-16 text-white/60" />
            </div>
          )}

          {/* Ticket number */}
          <div className="absolute top-4 left-4 bg-[#FFE348] backdrop-blur-sm rounded-lg px-3 py-1 shadow-md">
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              <p className="text-lg ">{t.quantity || 1}x</p>
            </div>
          </div>
        </div>

        {/* Main ticket body */}
        <div className="flex-1 p-8 flex flex-col justify-between min-h-[240px] relative z-10 bg-dashed border border-dashed md:rounded-r-3xl rounded-r-none md:rounded-l-none rounded-b-3xl">
          {/* Perforated line simulation */}
          <div
            className="absolute left-0 top-0 w-full h-px  border-gray-300/50"
            style={{
              backgroundImage:
                "linear-gradient(to right, transparent 50%, #d1d5db 50%)",
              backgroundSize: "4px 1px",
            }}
          />

          <div className="space-y-4">
            <h1 className=" text-gray-900 leading-tight line-clamp-2 bricolage-grotesque font-medium tracking-tighter">
              {t.ticketType?.event?.title || "Unknown Event"}
            </h1>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <MapPin className="h-6 w-6 flex-shrink-0" />
                <h3 className="text-gray-700">
                  {t.ticketType?.event?.location || "TBD"}
                </h3>
              </div>
              {t.ticketType?.event?.date && (
                <div className="flex items-center space-x-4">
                  <Calendar className="h-6 w-6 flex-shrink-0" />
                  <h5 className="text-gray-700">
                    {new Date(t.ticketType.event.date).toLocaleDateString()}
                  </h5>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-gray-200/50">
              <p className="text-3xl text-gray-900">₹{t.totalPrice ?? 0}</p>
              <div className="text-right">
                <p className="text-base text-gray-500">
                  Booked{" "}
                  {t.createdAt
                    ? new Date(t.createdAt).toLocaleDateString()
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
  };

  const TabButton = ({
    tab,
    label,
    count,
    active,
  }: {
    tab: Tab;
    label: string;
    count?: number;
    active: boolean;
  }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`relative px-8 py-4 rounded-2xl transition-all duration-300 flex items-center space-x-2 group cursor-pointer ${
        active
          ? "bg-black text-white shadow-lg shadow-[#FFE348]/25"
          : "bg-white/50 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <span className="text-lg">{label}</span>
      {count && count > 0 && (
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
  );

  const renderSection = () => {
    if (activeTab === "upcoming") {
      const totalUpcoming = todayEvents.length + upcoming.length;
      return (
        <div className="space-y-16">
          {/* Today subsection - only if exists */}
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
                {todayEvents.map((t) => renderTicket(t))}
              </div>
            </section>
          )}

          {/* Upcoming subsection */}
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
                {upcoming.map((t) => renderTicket(t))}
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
      );
    } else if (activeTab === "past") {
      const totalPast = pastCheckedIn.length + pastNotCheckedIn.length;
      return (
        <div className="space-y-12">
          {totalPast > 0 ? (
            <>
              {/* Past tickets - mixed list with visual differentiation */}
              <div className="space-y-8">
                {[...pastCheckedIn, ...pastNotCheckedIn].map((t) =>
                  renderTicket(t, true),
                )}
              </div>
              {/* Summary at bottom */}
              <div className="text-center py-8 border-t border-gray-200/50">
                <p className="text-lg text-gray-600">
                  {pastCheckedIn.length} checked in • {pastNotCheckedIn.length}{" "}
                  not checked in
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
      );
    }
    return null;
  };

  return (
    <div className="bg-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 pb-20">
        <h1 className="text-5xl text-[#3D3D3D] home-page-heading">
          My Tickets
        </h1>

        {/* Tab Navigation - Only 2 tabs */}
        <div className="flex gap-3 mb-12">
          <TabButton
            tab="upcoming"
            label="Upcoming"
            count={todayEvents.length + upcoming.length}
            active={activeTab === "upcoming"}
          />
          <TabButton
            tab="past"
            label="Past"
            count={pastCheckedIn.length + pastNotCheckedIn.length}
            active={activeTab === "past"}
          />
        </div>

        {/* Active Section */}
        {renderSection()}
      </div>
    </div>
  );
}
