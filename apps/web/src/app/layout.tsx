import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import ClientLayout from "./_components/ClientLayout";
import { Bricolage_Grotesque } from "next/font/google";
import { fetchPublicEventsSSR } from "@/lib/api/fetchPublicEvents";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL("https://www.tixin.in"),
    title: {
      default: "Tixin – Buy Event Tickets & Discover Local Events",
      template: "%s | Tixin",
    },
    description:
      "Discover and book tickets for cultural fests, tech events, hackathons, concerts, and more across India with Tixin – your go-to event discovery and ticketing platform.",
    keywords: [
      "Tixin",
      "events India",
      "book event tickets",
      "buy tickets online",
      "local events India",
      "concert tickets",
      "festival tickets",
      "Lovely Professional University events",
      "cultural fests",
      "tech events",
      "hackathons",
      "university events",
      "ticket booking",
      "edm",
      "DJ Night",
      "workshops",
      "live music",
      "Jalandhar",
      "Punjab",
      "Ludhiana",
      "free events",
    ],
    alternates: {
      canonical: "https://www.tixin.in",
      languages: {
        "en-IN": "https://www.tixin.in",
        "hi-IN": "https://www.tixin.in/hi",
      },
    },
    openGraph: {
      title: "Tixin – Discover Events and Book Tickets",
      description:
        "Discover and book tickets for cultural fests, tech events, hackathons, concerts, and more across India with Tixin.",
      url: "https://www.tixin.in",
      siteName: "Tixin",
      images: [
        {
          url: "/logos/logoOnBlack.png",
          width: 1200,
          height: 630,
          alt: "Tixin - Discover and Book Events in India",
        },
      ],
      locale: "en_IN",
      type: "website",
      countryName: "India",
    },
    twitter: {
      card: "summary_large_image",
      site: "@tixinHQ",
      creator: "@tixinHQ",
      title: "Tixin – Discover Events and Book Tickets",
      description:
        "Book tickets for cultural fests, tech events, concerts, and more on Tixin, India's leading event booking platform.",
      images: [
        {
          url: "/logos/logoOnBlack.png",
          alt: "Tixin - Event Booking Platform",
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    verification: {
      google: "BNY6wgxrGFUkTXiKyJWJ-SekyawGaeoFxs5BoirrS80",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let eventData = [];
  try {
    const response = await fetchPublicEventsSSR({ page: 1, limit: 10 });
    // Handle cases where response might be an object with an events array
    eventData = Array.isArray(response)
      ? response
      : response?.events && Array.isArray(response.events)
        ? response.events
        : [];
  } catch (error) {
    console.error("Failed to fetch events for structured data:", error);
    eventData = []; // Fallback to empty array on error
  }

  const eventSchema = eventData.map((event) => ({
    "@type": "Event",
    name: event.name || "Untitled Event",
    startDate: event.startDate || new Date().toISOString(),
    endDate: event.endDate || event.startDate || new Date().toISOString(),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.venue || "Unknown Venue",
      address: {
        "@type": "PostalAddress",
        addressLocality: event.city || "Unknown City",
        addressRegion: event.state || "Unknown State",
        addressCountry: "IN",
      },
    },
    image: event.imageUrl
      ? event.imageUrl.startsWith("http")
        ? event.imageUrl
        : `https://www.tixin.in${event.imageUrl}`
      : "https://www.tixin.in/logos/logoOnBlack.png",
    description: event.description || "No description available",
    offers: {
      "@type": "Offer",
      url: `https://www.tixin.in/events/${event.id || "unknown"}`,
      price: event.price != null ? event.price : 0,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
    organizer: {
      "@type": "Organization",
      name: "Tixin",
      url: "https://www.tixin.in",
    },
  }));

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logos/roundedLogo.svg" />
        <link rel="canonical" href="https://www.tixin.in" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "Tixin",
                url: "https://www.tixin.in",
                logo: "https://www.tixin.in/logos/roundedLogo.svg",
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "Tixin",
                url: "https://www.tixin.in",
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate:
                      "https://www.tixin.in/search?q={search_term_string}",
                  },
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                name: "Tixin Events",
                url: "https://www.tixin.in",
                description:
                  "A collection of events including cultural fests, tech events, hackathons, and concerts available for booking on Tixin – your go-to event discovery and ticketing platform.",
                hasPart: eventSchema,
              },
              {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "Home",
                    item: "https://www.tixin.in",
                  },
                ],
              },
            ]),
          }}
        />
      </head>
      <body>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
