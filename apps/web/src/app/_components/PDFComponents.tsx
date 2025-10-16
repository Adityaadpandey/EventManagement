"use client";

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

// Register fonts for PDF
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

// PDF Document Component
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
        {event?.banner_horizontal && (
          <Image style={styles.banner} src={event.banner_horizontal} />
        )}

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

        <Text style={styles.footer}>Powered by Tixin</Text>
      </Page>
    </Document>
  );
};

export default function PDFComponents({
  ticket,
  qrDataUrl,
  pdfFileName,
}: {
  ticket: Ticket;
  qrDataUrl: string | null;
  pdfFileName: string;
}) {
  return (
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
  );
}
