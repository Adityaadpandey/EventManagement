import type { Metadata } from "next";
import HomeClient from "@/app/_components/HomeClient";
import { fetchPublicEventsSSR } from "@/lib/api/fetchPublicEvents";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Find Events Near You | Tixin - India's Event Booking Platform",
    description:
      "Discover and book tickets for cultural fests, tech events, hackathons, concerts, and more across India with Tixin. — your go-to event discovery and ticketing platform.",
    metadataBase: new URL("https://www.tixin.in"),
    alternates: {
      canonical: "https://www.tixin.in",
      languages: {
        "en-IN": "https://www.tixin.in",
      },
    },
    keywords: [
      "Tixin",
      "events India",
      "book event tickets",
      "Lovely Professional University events",
      "cultural fests",
      "tech events",
      "hackathons",
      "concerts",
      "event booking platform",
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
    openGraph: {
      title: "Find Events Near You | Tixin - India's Event Booking Platform",
      description:
        "Discover and book tickets for cultural fests, tech events, hackathons, concerts, and more across India with Tixin. — your go-to event discovery and ticketing platform.",
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
      type: "website",
      locale: "en_IN",
      countryName: "India",
    },
    twitter: {
      card: "summary_large_image",
      title: "Find Events Near You | Tixin",
      description:
        "Book tickets for cultural fests, tech events, concerts, and more on Tixin, India's leading event booking platform. — your go-to event discovery and ticketing platform.",
      images: [
        {
          url: "/logos/logoOnBlack.png",
          alt: "Tixin - Event Booking Platform",
        },
      ],
      site: "@tixinHQ",
      creator: "@tixinHQ",
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
    other: {
      "application/ld+json": JSON.stringify([
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Tixin",
          url: "https://www.tixin.in",
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://www.tixin.in/search?q={search_term_string}",
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
            "A collection of events including cultural fests, tech events, hackathons, and concerts available for booking on Tixin. — your go-to event discovery and ticketing platform.",
          hasPart: [],
        },
      ]),
    },
    verification: {
      google:
        "google-site-verification=BNY6wgxrGFUkTXiKyJWJ-SekyawGaeoFxs5BoirrS80",
    },
  };
}

export default async function HomePage() {
  const eventData = await fetchPublicEventsSSR({ page: 1, limit: 10 });
  return <HomeClient />;
}
