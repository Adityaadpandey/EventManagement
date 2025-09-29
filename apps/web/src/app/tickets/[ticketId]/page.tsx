"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import api from "@/lib/api";
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import QRCodeLib from "qrcode";
import { div } from "framer-motion/client";

// Register fonts for PDF (optional, but improves consistency)
Font.register({
  family: "Helvetica",
  src: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Helvetica/Helvetica.ttf",
});
Font.register({
  family: "Helvetica-Bold",
  src: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Helvetica/Helvetica-Bold.ttf",
});

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

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Helvetica",
    fontSize: 12,
    color: "#374151",
    backgroundColor: "#F9FAFB",
    position: "relative",
  },
  banner: {
    width: "100%",
    height: 160,
    objectFit: "cover",
    borderRadius: 12,
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  left: {
    flex: 1,
    paddingRight: 16,
  },
  right: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  eventTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
    color: "#1F2937",
  },
  ticketTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ticketType: {
    fontSize: 12,
    backgroundColor: "#FFF4B4",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    color: "#7A5E00",
    fontFamily: "Helvetica-Bold",
  },
  ticketQty: {
    fontSize: 12,
    color: "#8B8B8B",
    marginLeft: 10,
  },
  infoBox: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#374151",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
    color: "#1F2937",
  },
  label: {
    fontFamily: "Helvetica-Bold",
    color: "#1F2937",
  },
  text: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 1.5,
  },
  qr: {
    width: 140,
    height: 140,
    borderRadius: 16,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    width: "100%",
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#FFDA0A",
    letterSpacing: 1,
  },
});

const TicketPDF = ({
  ticket,
  qrDataUrl,
}: {
  ticket: Ticket;
  qrDataUrl: string | null;
}) => {
  const event = ticket.ticketType?.event;
  const eventStart = event?.time ? new Date(event.time) : null;
  const formattedDate = eventStart?.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = eventStart?.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Document>
      <Page style={styles.page}>
        {/* Banner */}
        {event?.banner_horizontal && (
          <Image style={styles.banner} src={event.banner_horizontal} />
        )}

        {/* Ticket card */}
        <View style={styles.card}>
          <View style={styles.left}>
            <Text style={styles.eventTitle}>
              {event?.title || "Event Ticket"}
            </Text>

            <View style={styles.ticketTypeContainer}>
              <Text style={styles.ticketType}>
                {ticket.ticketType?.name || "Standard"}
              </Text>
              <Text style={styles.ticketQty}>x{ticket.quantity ?? 1}</Text>
            </View>

            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoText}>
                  {formattedDate || "Date not specified"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoText}>
                  {formattedTime || "Time not specified"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoText}>
                  {event?.location || "Location not specified"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.right}>
            {qrDataUrl && <Image style={styles.qr} src={qrDataUrl} />}
          </View>
        </View>

        {/* Ticket details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ticket Details</Text>
          <Text style={styles.text}>
            <Text style={styles.label}>Status: </Text>
            {ticket.status || "Unknown"}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.label}>Price: </Text>
            {ticket.totalPrice?.toFixed(2) ?? "0.00"} Rupees
          </Text>
          <Text style={styles.text}>
            <Text style={styles.label}>Booked On: </Text>
            {ticket.createdAt
              ? new Date(ticket.createdAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "Not specified"}
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Powered by Tixin</Text>
      </Page>
    </Document>
  );
};

// Main Page
export default function TicketDetailsPage() {
  const { ticketId } = useParams();
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchTicket = async () => {
      try {
        const res = await api.get(`/ticket/${ticketId}`);
        if (!cancelled) {
          const t = res.data?.data || null;
          setTicket(t);
          if (t?.qrCode) {
            const url = await QRCodeLib.toDataURL(t.qrCode, {
              errorCorrectionLevel: "H",
              margin: 2,
              width: 256,
            });
            setQrDataUrl(url);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.response?.data?.message || "Failed to load ticket details",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTicket();
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  const eventStart = useMemo(
    () =>
      ticket?.ticketType?.event?.time
        ? new Date(ticket.ticketType.event.time)
        : null,
    [ticket],
  );

  const addToCalendar = useMemo(
    () =>
      eventStart
        ? () => {
            const start = eventStart;
            const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // Assume 2 hours
            const formatDate = (d: Date) =>
              d.toISOString().replace(/-|:|\.\d+/g, "");
            const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
              ticket.ticketType!.event!.title || "Event",
            )}&dates=${formatDate(start)}/${formatDate(end)}&details=${encodeURIComponent(
              `Ticket for ${ticket.ticketType?.name || "Event"} - Quantity: ${ticket.quantity ?? 1}`,
            )}&location=${encodeURIComponent(ticket.ticketType!.event!.location || "")}`;
            window.open(url, "_blank");
          }
        : () => {},
    [ticket, eventStart],
  );

  const pdfFileName = useMemo(
    () =>
      `${ticket?.ticketType?.event?.title?.replace(/\s+/g, "_") || "ticket"}_${ticketId}.pdf`,
    [ticket, ticketId],
  );

  const formattedEventDateTime = eventStart
    ? eventStart.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "Not specified";

  const formattedBookedOn = ticket?.createdAt
    ? new Date(ticket.createdAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not specified";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600 animate-pulse">
          Loading ticket...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    );
  }

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
          {event?.banner_square && (
            <div
              className="w-[314px] h-40 xs:h-48 sm:h-56 md:h-64 lg:h-72 bg-cover bg-center rounded-3xl md:block hidden"
              style={{ backgroundImage: `url(${event.banner_horizontal})` }}
            />
          )}

          <div className="space-y-6 max-w-[382px]">
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
                <h6 className="">
                  {eventStart &&
                    new Date(eventStart).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                    })}{" "}
                </h6>
              </div>

              <div className="flex items-center gap-2 pb-5">
                <img src="/svgs/clock.svg" alt="" />
                <h6 className="">
                  {eventStart &&
                    `${new Date(eventStart).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}`}
                </h6>
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
                {!ticket.checkedIn ? (
                  <QRCode
                    value={ticket.qrCode}
                    level="H"
                    className="rounded size-314"
                  />
                ) : (
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
                      <span className="text-red-500 font-medium">
                        QR code expired
                      </span>
                      <span className="text-gray-500 text-sm mt-1">
                        You have already checked in
                      </span>
                    </div>
                  </div>
                )}
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
                className="flex gap-2.5 w-full justify-center items-center px-5 py-4 border border-[#E5E5E5] rounded-xl text-base cursor-pointer"
                disabled={!eventStart}
              >
                <img src="/svgs/addToCalendar.svg" alt="" />
                Add to Calendar
              </button>

              <PDFDownloadLink
                document={<TicketPDF ticket={ticket} qrDataUrl={qrDataUrl} />}
                fileName={pdfFileName}
                className="flex gap-2.5 w-full justify-center items-center px-5 py-4 bg-black rounded-xl text-white text-base cursor-pointer"
              >
                {({ loading }) => (
                  <>
                    <img src="/svgs/download.svg" alt="" />
                    {loading ? "Generating PDF..." : "Download Ticket"}
                  </>
                )}
              </PDFDownloadLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
