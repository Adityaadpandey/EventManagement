import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import EventClient from "@/app/_components/EventClient";
import { getEventDetails } from "@/lib/api/getEventDetails";
import EventLoading from "./loading";

// Aggressive caching for better performance
export const revalidate = 3600; // ISR - revalidate every hour instead of 60s
export const dynamic = "force-static"; // Force static generation when possible
export const fetchCache = "force-cache"; // Aggressively cache fetches

// Precompute helper functions (moved outside to avoid recreation)
const HTML_TAG_REGEX = /<\/?[^>]+(>|$)/g;

function stripHtml(html: string): string {
  return html.replace(HTML_TAG_REGEX, "");
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function extractKeywords(event: any): string[] {
  const categories = Array.isArray(event?.category)
    ? event.category
    : event?.category
      ? [event.category]
      : [];

  const keywords = [
    event?.title,
    event?.location,
    "Tixin",
    "book event tickets",
    "events in India",
  ];

  // Add category keywords
  for (const cat of categories) {
    keywords.push(
      `buy ${cat.toLowerCase()} tickets`,
      `${cat.toLowerCase()} events near me`,
    );
  }

  // Add location-specific keywords
  if (event?.location) {
    keywords.push(`events in ${event.location}`);
    for (const cat of categories) {
      keywords.push(`${cat.toLowerCase()} events in ${event.location}`);
    }
  }

  return keywords.filter(Boolean) as string[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;

  try {
    // Reduced timeout for faster failure
    const event = await Promise.race([
      getEventDetails(eventId),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 2000),
      ),
    ]);

    if (!event) {
      return {
        title: "Event Not Found | Tixin",
        description: "The event you're looking for could not be found.",
      };
    }

    // Optimized title building
    const title = [
      event.title,
      event.location && `in ${event.location}`,
      "Tixin",
    ]
      .filter(Boolean)
      .join(" | ");

    // Optimized description
    const description = event.description
      ? `${truncateText(stripHtml(event.description), 150)} Book your tickets now on Tixin.`
      : "Discover and book tickets for events near you with Tixin — India's event discovery platform.";

    const imageUrl =
      event.banner_square ||
      event.banner_horizontal ||
      "/logos/logoOnBlack.png";

    const eventUrl = `https://www.tixin.in/event/${eventId}`;

    return {
      title,
      description,
      keywords: extractKeywords(event),
      openGraph: {
        title,
        description,
        url: eventUrl,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: `${event.title || "Event"} Banner`,
          },
        ],
        type: "website",
        locale: "en_IN",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
      metadataBase: new URL("https://www.tixin.in"),
      alternates: {
        canonical: eventUrl,
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  } catch (error) {
    return {
      title: "Event | Tixin",
      description: "Discover and book tickets for events near you with Tixin.",
      robots: { index: false, follow: true },
    };
  }
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  // Fetch event data with error boundary
  let event;
  try {
    event = await getEventDetails(eventId);
  } catch (error) {
    console.error("Failed to fetch event:", error);
    notFound();
  }

  if (!event) {
    notFound();
  }

  return (
    <Suspense fallback={<EventLoading />}>
      <EventClient eventId={eventId} initialEvent={event} />
    </Suspense>
  );
}
