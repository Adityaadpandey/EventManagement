import NotificationModalWrapper from "@/components/NotificationModalWrapper";
import {
  fetchPublicEventsSSR,
  type SSREventData,
} from "@/lib/api/fetchPublicEvents";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import ClientLayout from "./_components/ClientLayout";
import PwaPrompt from "./_components/PwaPrompt";
import "./globals.css";
import Providers from "./providers";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL("https://www.tunyt.com"),
    title: {
      default: "Tunyt - Book Tickets & Host Events",
      template: "%s | Tunyt - India's Leading Event Platform",
    },
    description:
      "Book and host events easily with Tunyt. India's premier event management platform with inbuilt payment integration, automated ticket checking, custom event pages with personalized themes, and complete vendor management. Connect with sponsors, artists, and venues. Host fests, hackathons, concerts & workshops with detailed analytics. Seamless booking experience for attendees.",
    keywords: [
      // ==========================
      // Brand (Highest Priority)
      // ==========================
      "tunyt",
      "tunyt india",
      "tunyt events",
      "tunyt tickets",
      "tunyt event platform",
      "tunyt ticket booking",
      "tunyt host events",
      "tunyt.com",

      // ==========================
      // Primary Search Intent
      // ==========================
      "event ticket booking",
      "book event tickets",
      "buy event tickets",
      "online event booking",
      "discover events",
      "find events near me",
      "things to do near me",
      "upcoming events",
      "events near me today",
      "weekend events",
      "local events",
      "event discovery platform",

      // ==========================
      // Event Hosting
      // ==========================
      "host an event",
      "create an event",
      "publish an event",
      "sell tickets online",
      "ticket selling platform",
      "event management platform",
      "event organizer platform",
      "event registration platform",
      "event booking platform",
      "online ticketing platform",
      "event management software",
      "ticket booking software",
      "event website builder",
      "event page builder",
      "event registration software",

      // ==========================
      // College & Student Events
      // ==========================
      "college fest tickets",
      "college events",
      "campus events",
      "university events",
      "student events",
      "college fest registration",
      "hackathon registration",
      "hackathon tickets",
      "tech fest tickets",
      "cultural fest tickets",
      "freshers party tickets",
      "farewell party tickets",

      // ==========================
      // Entertainment
      // ==========================
      "concert tickets",
      "music festival tickets",
      "dj night tickets",
      "standup comedy tickets",
      "comedy show tickets",
      "live music events",
      "open mic events",
      "gaming tournament registration",
      "esports tournament",
      "startup events",
      "networking events",

      // ==========================
      // Business Events
      // ==========================
      "conference registration",
      "seminar registration",
      "workshop registration",
      "bootcamp registration",
      "webinar registration",
      "business networking events",
      "startup meetup",
      "tech conference india",

      // ==========================
      // Features
      // ==========================
      "online ticket payments",
      "event payment integration",
      "QR ticket verification",
      "QR code tickets",
      "digital event tickets",
      "event check in",
      "event analytics",
      "event dashboard",
      "vendor management",
      "sponsor management",
      "artist booking",
      "venue booking",
      "custom event pages",

      // ==========================
      // Location Keywords
      // ==========================
      "events in india",
      "events in delhi",
      "events in mumbai",
      "events in bangalore",
      "events in hyderabad",
      "events in pune",
      "events in chennai",
      "events in kolkata",
      "events in gurugram",
      "events in chandigarh",
      "events in ludhiana",
      "events in jalandhar",
      "events in punjab",

      // ==========================
      // Long-tail
      // ==========================
      "best event ticketing platform india",
      "best platform to host events",
      "how to sell event tickets online",
      "how to organize an event",
      "how to host a college fest",
      "how to get event sponsors",
      "find vendors for events",
      "book tickets online india",
      "free event listing platform",
      "event management platform india",
      "online event ticket booking india",
      "college event management platform",
      "student event platform india",
    ],
    alternates: {
      languages: {
        "en-IN": "https://www.tunyt.com",
      },
    },
    openGraph: {
      title:
        "Tunyt - Book Tickets & Host Events | India's Premier Event Platform",
      description:
        "Book and host events with ease on Tunyt. Payment integration, custom event pages, ticket checking, vendor management & analytics. Perfect for fests, hackathons, concerts & workshops. Follow us @tunyt",
      url: "https://www.tunyt.com",
      siteName: "Tunyt",
      images: [
        {
          url: "https://www.tunyt.com/logos/logoOnBlack.png",
          width: 1200,
          height: 630,
          alt: "Tunyt - India's Leading Event Booking and Hosting Platform",
        },
      ],
      locale: "en_IN",
      type: "website",
      countryName: "India",
    },
    twitter: {
      card: "summary_large_image",
      site: "@Tunyt",
      creator: "@Tunyt",
      title: "Tunyt - Book & Host Events with Payment Integration",
      description:
        "India's premier event platform. Book tickets or host events with custom pages, payment integration, and vendor management. Follow @Tunyt for updates!",
      images: [
        {
          url: "https://www.tunyt.com/logos/logoOnBlack.png",
          alt: "Tunyt Event Platform - Follow @Tunyt",
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
    authors: [{ name: "Tunyt", url: "https://www.tunyt.com" }],
    creator: "Tunyt",
    publisher: "Tunyt",
    category: "Events & Entertainment",
    classification: "Event Management and Ticketing Platform",
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "black-translucent",
      instagram: "@tunyt",
      linkedin: "company/tixin",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let eventData: SSREventData[] = [];
  try {
    const response = await fetchPublicEventsSSR();
    eventData = response.items ?? [];
  } catch (error) {
    console.error("Failed to fetch events for structured data:", error);
    eventData = [];
  }

  const stripHtml = (html: string) => html.replace(/<\/?[^>]+(>|$)/g, "");

  const eventSchema = eventData.map((event) => {
    const img =
      event.banner_horizontal || event.banner_square || event.banner_vertical;
    const image = img
      ? img.startsWith("http")
        ? img
        : `https://www.tunyt.com${img}`
      : "https://www.tunyt.com/logos/logoOnBlack.png";

    return {
      "@type": "Event",
      name: event.title || "Untitled Event",
      startDate: event.date || new Date().toISOString(),
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: {
        "@type": "Place",
        name: event.location || "TBA",
        ...(event.latitude && event.longitude
          ? {
              geo: {
                "@type": "GeoCoordinates",
                latitude: event.latitude,
                longitude: event.longitude,
              },
            }
          : {}),
        address: {
          "@type": "PostalAddress",
          name: event.location || "India",
          addressCountry: "IN",
        },
      },
      image,
      description: event.description
        ? stripHtml(event.description).slice(0, 200)
        : `Book tickets for ${event.title} on Tunyt`,
      offers: {
        "@type": "Offer",
        url: `https://www.tunyt.com/event/${event.eventId}`,
        price: event.minPrice ?? 0,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        validFrom: event.date || new Date().toISOString(),
      },
      organizer: {
        "@type": "Organization",
        name: event.lister?.user?.name || "Tunyt",
        url: "https://www.tunyt.com",
      },
    };
  });

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Tunyt",
      alternateName: ["Tunyt Event Platform", "Tunyt India", "Tunyt.in"],
      url: "https://www.tunyt.com",
      logo: "https://www.tunyt.com/logos/icon.png",
      image: "https://www.tunyt.com/logos/logoOnBlack.png",
      description:
        "Book and host events easily with Tunyt. India's premier event management platform with payment integration, automated ticket checking, custom event pages, and complete vendor management. Connect with sponsors, artists, and venues for seamless event hosting.",
      slogan: "Book and host events easily with Tunyt",
      foundingDate: "2023",
      foundingLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressCountry: "IN",
        },
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "Customer Service",
        availableLanguage: ["English", "Hindi"],
      },
      sameAs: [
        "https://www.instagram.com/tunyt",
        "https://www.linkedin.com/company/tixin/",
        "https://x.com/Tunyt",
        "https://twitter.com/Tunyt",
      ],
      areaServed: {
        "@type": "Country",
        name: "India",
      },
      knowsAbout: [
        "Event Management",
        "Ticket Booking",
        "Payment Integration",
        "Event Hosting",
        "Vendor Management",
        "Event Analytics",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Tunyt",
      alternateName: "Tunyt Event Platform",
      url: "https://www.tunyt.com",
      description:
        "Book and host events easily. India's leading event management platform with payment integration and vendor services.",
      inLanguage: "en-IN",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://www.tunyt.com/search?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
      publisher: {
        "@type": "Organization",
        name: "Tunyt",
        logo: {
          "@type": "ImageObject",
          url: "https://www.tunyt.com/logos/icon.png",
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Tunyt Event Management Platform",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        ratingCount: "500",
        bestRating: "5",
        worstRating: "1",
      },
      featureList: [
        "Event Hosting",
        "Ticket Booking",
        "Payment Integration",
        "QR Code Ticket Checking",
        "Custom Event Pages with Themes",
        "Vendor Management",
        "Sponsor Connections",
        "Artist Booking",
        "Venue Finder",
        "Event Analytics Dashboard",
        "Real-time Sales Tracking",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Upcoming Events on Tunyt",
      description:
        "Discover and book tickets for cultural fests, tech events, hackathons, concerts, and workshops across India",
      numberOfItems: eventSchema.length,
      itemListElement: eventSchema.map((event, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: event,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Event Hosting and Management Services",
      provider: {
        "@type": "Organization",
        name: "Tunyt",
        url: "https://www.tunyt.com",
        sameAs: [
          "https://www.instagram.com/tunyt",
          "https://www.linkedin.com/company/tixin/",
        ],
      },
      serviceType: "Event Management Platform",
      areaServed: {
        "@type": "Country",
        name: "India",
      },
      audience: {
        "@type": "Audience",
        audienceType: "Event Organizers, Students, Universities, Companies",
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Tunyt Services",
        itemListElement: [
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Event Hosting Platform",
              description:
                "Create and host events with custom pages, personalized themes, and easy-to-use interface. Host events as easily as creating a social media post.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Ticket Booking System",
              description:
                "Seamless ticket booking experience with integrated payment gateway and instant QR code generation.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Payment Integration",
              description:
                "Built-in secure payment processing for ticket sales with automatic settlement.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Ticket Checking & Verification",
              description:
                "Automated QR code-based ticket verification system for smooth entry management.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Vendor Management & Connections",
              description:
                "Connect with event vendors including stage setup, sound systems, artists, venues, sponsors, and more.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Event Analytics & Insights",
              description:
                "Comprehensive analytics dashboard with real-time sales tracking, attendee demographics, and performance metrics.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Custom Event Pages",
              description:
                "Build beautiful, branded event pages with customizable themes and styles.",
            },
          },
        ],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://www.tunyt.com",
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How do I book tickets on Tunyt?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Booking tickets on Tunyt is simple. Browse events on our platform, select your desired event, choose the number of tickets, and complete the payment through our secure integrated payment gateway. You'll instantly receive a confirmation email with QR code tickets that can be verified at the venue.",
          },
        },
        {
          "@type": "Question",
          name: "How can I host an event on Tunyt?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Hosting an event on Tunyt is as easy as creating a social media post. Simply sign up, create your custom event page with personalized themes and styles, set your ticket prices and quantities, and publish. Tunyt handles payment integration, ticket generation, QR code verification, and provides detailed analytics. No technical expertise required!",
          },
        },
        {
          "@type": "Question",
          name: "Does Tunyt provide vendor management and sponsor connections?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! Tunyt offers comprehensive vendor management services. We connect event organizers with trusted vendors for stage setup, sound systems, lighting, artists, performers, venues, and sponsors. Our platform simplifies vendor coordination and helps you find all event services in one place.",
          },
        },
        {
          "@type": "Question",
          name: "What features does Tunyt offer for event organizers?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Tunyt provides custom event pages with personalized themes, integrated payment processing, automated QR code ticket checking, vendor management, sponsor connections, real-time analytics dashboard, attendee management, and promotional tools. Everything you need to host successful events in one platform.",
          },
        },
        {
          "@type": "Question",
          name: "Is Tunyt free to use?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, event organizers can list their events on Tunyt for free. We charge a small service fee on ticket sales to maintain our platform and provide excellent service. Attendees can browse and discover events completely free.",
          },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      mainEntity: {
        "@type": "Organization",
        name: "Tunyt",
        url: "https://www.tunyt.com",
        sameAs: [
          "https://www.instagram.com/tunyt",
          "https://www.linkedin.com/company/tixin/",
          "https://x.com/Tunyt",
        ],
      },
    },
  ];

  return (
    <html lang="en" className={`${bricolage.variable} ${inter.variable}`}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="apple-touch-icon" href="/logos/pwa-icon-192.png" />

        {/* Favicons */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" href="/logos/icon.png" />
        <link rel="icon" href="/logos/roundedLogo.svg" />
        <link rel="apple-touch-icon" href="/logos/roundedLogo.svg" />
        <link rel="shortcut icon" href="/logos/roundedLogo.svg" />

        {/* Canonical */}
        <link rel="canonical" href="https://www.tunyt.com" />

        {/* Preconnect for Performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        <meta name="theme-color" content="#000000" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="geo.region" content="IN" />
        <meta name="geo.placename" content="India" />

        {/* Social Media Profile Links */}
        <meta
          property="og:see_also"
          content="https://www.instagram.com/tunyt"
        />
        <meta
          property="og:see_also"
          content="https://www.linkedin.com/company/tixin/"
        />
        <meta property="og:see_also" content="https://x.com/Tunyt" />

        <meta
          name="subject"
          content="Event Management, Hosting and Ticket Booking Platform"
        />
        <meta
          name="abstract"
          content="Book and host events easily with Tunyt - India's premier event platform"
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>
      <body className={`${bricolage.variable} ${inter.variable}`}>
        <Providers>
          <ClientLayout>
            {children}
            <PwaPrompt />
            <NotificationModalWrapper />
            <SpeedInsights />
            <Analytics />
          </ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
