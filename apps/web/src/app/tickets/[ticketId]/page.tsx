"use client";

import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import api from "@/lib/api";
import QRCodeLib from "qrcode";
import PDFComponents from "@/app/_components/PDFComponents";

// Types
interface Ticket {
  ticketId: string;
  qrCode: string;
  totalPrice?: number;
  createdAt?: string;
  status?: string;
  checkedIn?: boolean;
  quantity?: number;
  ticketType?: {
    name?: string;
    description?: string | null;
    price?: number;
    quantity?: number;
    soldCount?: number;
    event?: {
      title?: string;
      description?: string;
      location?: string;
      date?: string;
      time?: string;
      banner_horizontal?: string;
      capacity?: number;
    };
  };
  user?: {
    name?: string;
    email?: string;
    phone?: string | null;
  };
}

const QRCodeDisplay = memo(
  ({ qrCode, checkedIn }: { qrCode: string; checkedIn: boolean }) => {
    if (checkedIn) {
      return (
        <div className="flex justify-center">
          <div className="p-4 border-2 border-red-300 bg-red-50 rounded-3xl w-[320px] h-[320px] flex flex-col justify-center items-center text-center shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-red-400 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span className="text-red-500 font-medium">QR code expired</span>
            <span className="text-gray-500 text-sm mt-1">
              You have already checked in
            </span>
          </div>
        </div>
      );
    }

    return <QRCode value={qrCode} level="H" className="rounded size-314" />;
  },
);

QRCodeDisplay.displayName = "QRCodeDisplay";

export default function TicketDetailsPage() {
  const { ticketId } = useParams();
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketId) {
      setError("Invalid ticket ID");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const fetchTicket = async () => {
      try {
        const res = await api.get(`/ticket/${ticketId}`, {
          signal: controller.signal,
        });

        if (!cancelled) {
          const ticketData = res.data?.data || null;
          setTicket(ticketData);

          // Generate QR code data URL only if needed
          if (ticketData?.qrCode) {
            try {
              const url = await QRCodeLib.toDataURL(ticketData.qrCode, {
                errorCorrectionLevel: "H",
                margin: 2,
                width: 256,
              });
              if (!cancelled) {
                setQrDataUrl(url);
              }
            } catch (qrError) {
              console.error("Failed to generate QR code:", qrError);
            }
          }
        }
      } catch (e: any) {
        if (!cancelled && e.name !== "AbortError") {
          setError(
            e?.response?.data?.message || "Failed to load ticket details",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchTicket();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [ticketId]);

  const eventStart = useMemo(
    () =>
      ticket?.ticketType?.event?.time
        ? new Date(ticket.ticketType.event.time)
        : null,
    [ticket?.ticketType?.event?.time],
  );

  const formattedEventDate = useMemo(
    () =>
      eventStart
        ? eventStart.toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
          })
        : null,
    [eventStart],
  );

  const formattedEventTime = useMemo(
    () =>
      eventStart
        ? eventStart.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : null,
    [eventStart],
  );

  const pdfFileName = useMemo(
    () =>
      `${ticket?.ticketType?.event?.title?.replace(/\s+/g, "_") || "ticket"}_${ticketId}.pdf`,
    [ticket?.ticketType?.event?.title, ticketId],
  );

  const addToCalendar = useCallback(() => {
    if (!eventStart || !ticket) return;

    const start = eventStart;
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      ticket.ticketType?.event?.title || "Event",
    )}&dates=${formatDate(start)}/${formatDate(end)}&details=${encodeURIComponent(
      `Ticket for ${ticket.ticketType?.name || "Event"} - Quantity: ${ticket.quantity ?? 1}`,
    )}&location=${encodeURIComponent(ticket.ticketType?.event?.location || "")}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }, [ticket, eventStart]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600 animate-pulse">
          Loading ticket...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    );
  }

  // Not found state
  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Ticket not found.</div>
      </div>
    );
  }

  const event = ticket.ticketType?.event;

  return (
    <div className="h-screen w-full overflow-y-auto py-6 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-[796px] mx-auto flex flex-col gap-1">
        {event?.banner_horizontal && (
          <div
            className="w-full h-40 xs:h-48 sm:h-56 md:h-64 lg:h-72 bg-cover bg-center rounded-3xl md:hidden"
            style={{ backgroundImage: `url(${event.banner_horizontal})` }}
          />
        )}
        <div className="overflow-hidden flex justify-between bg-white rounded-4xl p-8 ">
          {event?.banner_horizontal && (
            <div
              className="w-[314px] h-40 xs:h-48 sm:h-56 md:h-64 lg:h-72 bg-cover bg-center rounded-3xl md:block hidden"
              style={{ backgroundImage: `url(${event.banner_horizontal})` }}
            />
          )}

          <div className="space-y-6 max-w-[382px] w-full">
            <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">
              {event?.title || "Event"}
            </h1>

            <div className="flex items-center gap-2">
              <h5 className="px-4 py-3 bg-[#FFF4B4] border border-[#F6D100] rounded-xl">
                {ticket.ticketType?.name || "Standard"}
              </h5>
              <p className="text-[#8B8B8B]">x{ticket.quantity ?? 1}</p>
            </div>

            <div className="bg-[#F5F5F5] p-5 rounded-3xl">
              <div className="flex items-center gap-2 pb-5">
                <img src="/svgs/calendar.svg" alt="" />
                <h6 className="">{formattedEventDate}</h6>
              </div>

              <div className="flex items-center gap-2 pb-5">
                <img src="/svgs/clock.svg" alt="" />
                <h6 className="">{formattedEventTime}</h6>
              </div>

              <div className="flex items-center gap-2">
                <img src="/svgs/location.svg" alt="" />
                <h6 className="">{event?.location || "Not specified"}</h6>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full bg-white rounded-4xl flex md:flex-row flex-col justify-start md:items-center p-8 gap-8">
          {ticket.qrCode && (
            <div className="flex justify-center">
              <div className="p-3 xs:p-4 border border-[#E5E5E5] rounded-3xl md:w-[314px] w-[81vw] h-[81vw] md:h-[314px] flex justify-center items-center">
                <QRCodeDisplay
                  qrCode={ticket.qrCode}
                  checkedIn={ticket.checkedIn || false}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-8">
            <div className="space-y-1.5">
              <h1>Your Ticket</h1>
              <p className="text-[#8B8B8B] w-[136px]">
                Show this QR at the time of Check in
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={addToCalendar}
                className="flex gap-2.5 w-full justify-center items-center px-5 py-4 border border-[#E5E5E5] rounded-xl text-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!eventStart}
                type="button"
              >
                <img src="/svgs/addToCalendar.svg" alt="" />
                Add to Calendar
              </button>

              {qrDataUrl && (
                <PDFComponents
                  ticket={ticket}
                  qrDataUrl={qrDataUrl}
                  pdfFileName={pdfFileName}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
