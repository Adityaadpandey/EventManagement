import { fetchPublicEventsSSR } from "@/lib/api/fetchPublicEvents";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import ClientLayout from "./_components/ClientLayout";
import { Bricolage_Grotesque, Inter } from "next/font/google";

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
    metadataBase: new URL("https://www.tixin.in"),
    title: {
      default:
        "Tixin - Book Tickets & Host Events | Payment Integration, Custom Pages & Vendor Management",
      template: "%s | Tixin - India's Leading Event Platform",
    },
    description:
      "Book and host events easily with Tixin. India's premier event management platform with inbuilt payment integration, automated ticket checking, custom event pages with personalized themes, and complete vendor management. Connect with sponsors, artists, and venues. Host fests, hackathons, concerts & workshops with detailed analytics. Seamless booking experience for attendees.",
    keywords: [
      // Brand Keywords - High Priority
      "Tixin",
      "Tixin India",
      "Tixin event platform",
      "Tixin.in",
      "book tickets Tixin",
      "host event on Tixin",

      // Primary Action Keywords
      "buy tickets online",
      "book event tickets",
      "host event online",
      "create event page",
      "sell event tickets",
      "event hosting platform India",

      // Core Features
      "payment integration for events",
      "ticket checking system",
      "QR code ticket verification",
      "custom event pages",
      "event analytics dashboard",
      "vendor management platform",

      // Vendor & Services
      "find event sponsors",
      "hire artists for events",
      "event venue booking",
      "stage setup services",
      "event vendor connections",
      "sponsor contacts for events",

      // Event Types
      "fest tickets India",
      "hackathon registration",
      "concert tickets online",
      "cultural fest booking",
      "tech events India",
      "college fest tickets",
      "DJ night tickets",
      "workshop registration",
      "university events",
      "music festival tickets",
      "comedy show tickets",

      // Location-based - Major Cities
      "events in India",
      "Punjab events",
      "Jalandhar events",
      "Ludhiana events",
      "Chandigarh events",
      "Delhi NCR events",
      "Mumbai events",
      "Bangalore events",
      "Hyderabad events",
      "local events near me",
      "nearby events",

      // Organizer-focused
      "event organizer platform",
      "event management software",
      "ticket booking system for organizers",
      "event page builder",
      "sell tickets online India",
      "event registration platform",

      // Long-tail & Question Keywords
      "how to host an event online",
      "how to sell event tickets",
      "how to get event sponsors",
      "find artists for college fest",
      "best event ticketing platform India",
      "event management platform for students",
      "free event listing India",
      "online ticket sales platform",
    ],
    alternates: {
      canonical: "https://www.tixin.in",
      languages: {
        "en-IN": "https://www.tixin.in",
        "hi-IN": "https://www.tixin.in/hi",
      },
    },
    openGraph: {
      title:
        "Tixin - Book Tickets & Host Events | India's Premier Event Platform",
      description:
        "Book and host events with ease on Tixin. Payment integration, custom event pages, ticket checking, vendor management & analytics. Perfect for fests, hackathons, concerts & workshops. Follow us @tixinhq",
      url: "https://www.tixin.in",
      siteName: "Tixin",
      images: [
        {
          url: "https://www.tixin.in/logos/logoOnBlack.png",
          width: 1200,
          height: 630,
          alt: "Tixin - India's Leading Event Booking and Hosting Platform",
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
      title: "Tixin - Book & Host Events with Payment Integration",
      description:
        "India's premier event platform. Book tickets or host events with custom pages, payment integration, and vendor management. Follow @tixinHQ for updates!",
      images: [
        {
          url: "https://www.tixin.in/logos/logoOnBlack.png",
          alt: "Tixin Event Platform - Follow @tixinHQ",
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
    authors: [{ name: "Tixin", url: "https://www.tixin.in" }],
    creator: "Tixin",
    publisher: "Tixin",
    category: "Events & Entertainment",
    classification: "Event Management and Ticketing Platform",
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "black-translucent",
      instagram: "@tixinhq",
      linkedin: "company/tixin",
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
    eventData = Array.isArray(response)
      ? response
      : response?.events && Array.isArray(response.events)
        ? response.events
        : [];
  } catch (error) {
    console.error("Failed to fetch events for structured data:", error);
    eventData = [];
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
    description:
      event.description ||
      "Discover and book tickets for this event on Tixin - India's leading event platform",
    offers: {
      "@type": "Offer",
      url: `https://www.tixin.in/events/${event.id || "unknown"}`,
      price: event.price != null ? event.price : 0,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      validFrom: event.startDate || new Date().toISOString(),
    },
    organizer: {
      "@type": "Organization",
      name: event.organizerName || "Tixin",
      url: "https://www.tixin.in",
    },
    performer: event.performerName
      ? {
          "@type": "PerformingGroup",
          name: event.performerName,
        }
      : undefined,
  }));

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Tixin",
      alternateName: ["Tixin Event Platform", "Tixin India", "Tixin.in"],
      url: "https://www.tixin.in",
      logo: "https://www.tixin.in/logos/roundedLogo.svg",
      image: "https://www.tixin.in/logos/logoOnBlack.png",
      description:
        "Book and host events easily with Tixin. India's premier event management platform with payment integration, automated ticket checking, custom event pages, and complete vendor management. Connect with sponsors, artists, and venues for seamless event hosting.",
      slogan: "Book and host events easily with Tixin",
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
        "https://www.instagram.com/tixinhq",
        "https://www.linkedin.com/company/tixin/",
        "https://x.com/tixinHQ",
        "https://twitter.com/tixinHQ",
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
      name: "Tixin",
      alternateName: "Tixin Event Platform",
      url: "https://www.tixin.in",
      description:
        "Book and host events easily. India's leading event management platform with payment integration and vendor services.",
      inLanguage: "en-IN",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://www.tixin.in/search?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
      publisher: {
        "@type": "Organization",
        name: "Tixin",
        logo: {
          "@type": "ImageObject",
          url: "https://www.tixin.in/logos/roundedLogo.svg",
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Tixin Event Management Platform",
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
      name: "Upcoming Events on Tixin",
      description:
        "Discover and book tickets for cultural fests, tech events, hackathons, concerts, and workshops across India",
      numberOfItems: eventSchema.length,
      itemListElement: eventSchema.map((event, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Event",
          ...event,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Event Hosting and Management Services",
      provider: {
        "@type": "Organization",
        name: "Tixin",
        url: "https://www.tixin.in",
        sameAs: [
          "https://www.instagram.com/tixinhq",
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
        name: "Tixin Services",
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
          item: "https://www.tixin.in",
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How do I book tickets on Tixin?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Booking tickets on Tixin is simple. Browse events on our platform, select your desired event, choose the number of tickets, and complete the payment through our secure integrated payment gateway. You'll instantly receive a confirmation email with QR code tickets that can be verified at the venue.",
          },
        },
        {
          "@type": "Question",
          name: "How can I host an event on Tixin?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Hosting an event on Tixin is as easy as creating a social media post. Simply sign up, create your custom event page with personalized themes and styles, set your ticket prices and quantities, and publish. Tixin handles payment integration, ticket generation, QR code verification, and provides detailed analytics. No technical expertise required!",
          },
        },
        {
          "@type": "Question",
          name: "Does Tixin provide vendor management and sponsor connections?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! Tixin offers comprehensive vendor management services. We connect event organizers with trusted vendors for stage setup, sound systems, lighting, artists, performers, venues, and sponsors. Our platform simplifies vendor coordination and helps you find all event services in one place.",
          },
        },
        {
          "@type": "Question",
          name: "What features does Tixin offer for event organizers?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Tixin provides custom event pages with personalized themes, integrated payment processing, automated QR code ticket checking, vendor management, sponsor connections, real-time analytics dashboard, attendee management, and promotional tools. Everything you need to host successful events in one platform.",
          },
        },
        {
          "@type": "Question",
          name: "Is Tixin free to use?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, event organizers can list their events on Tixin for free. We charge a small service fee on ticket sales to maintain our platform and provide excellent service. Attendees can browse and discover events completely free.",
          },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      mainEntity: {
        "@type": "Organization",
        name: "Tixin",
        url: "https://www.tixin.in",
        sameAs: [
          "https://www.instagram.com/tixinhq",
          "https://www.linkedin.com/company/tixin/",
          "https://x.com/tixinHQ",
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
        <link rel="apple-touch-icon" href="/logos/pwa-icon-512.png" />

        {/* Favicons */}
        <link rel="icon" href="/logos/roundedLogo.svg" />
        <link rel="apple-touch-icon" href="/logos/roundedLogo.svg" />
        <link rel="shortcut icon" href="/logos/roundedLogo.svg" />

        {/* Canonical */}
        <link rel="canonical" href="https://www.tixin.in" />

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
          content="https://www.instagram.com/tixinhq"
        />
        <meta
          property="og:see_also"
          content="https://www.linkedin.com/company/tixin/"
        />
        <meta property="og:see_also" content="https://x.com/tixinHQ" />

        <meta
          name="subject"
          content="Event Management, Hosting and Ticket Booking Platform"
        />
        <meta
          name="abstract"
          content="Book and host events easily with Tixin - India's premier event platform"
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
            <SpeedInsights />
            <Analytics />
          </ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
