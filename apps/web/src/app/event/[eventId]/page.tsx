import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import EventClient from "@/app/_components/EventClient";
import { getEventDetails } from "@/lib/api/getEventDetails";
import EventLoading from "./loading";

// Optimized caching strategy
export const revalidate = 60; // ISR - revalidate every 60 seconds
export const dynamic = "auto"; // Let Next.js choose the best strategy
export const fetchCache = "default-cache"; // Cache fetch requests

// Helper function to strip HTML tags
function stripHtml(html: string): string {
  return html.replace(/<\/?[^>]+(>|$)/g, "");
}

// Helper function to truncate text
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

// Helper function to extract keywords
function extractKeywords(event: any): string[] {
  const categories = Array.isArray(event?.category)
    ? event.category
    : event?.category
      ? [event.category]
      : [];

  const locationKeywords = event?.location
    ? [
        `events in ${event.location}`,
        ...categories.map(
          (cat) => `${cat.toLowerCase()} events in ${event.location}`,
        ),
      ]
    : [];

  return [
    event?.title,
    event?.location,
    "Tixin",
    "book event tickets",
    "events in India",
    ...categories.flatMap((cat) => [
      `buy ${cat.toLowerCase()} tickets`,
      `${cat.toLowerCase()} events near me`,
    ]),
    ...locationKeywords,
  ].filter(Boolean) as string[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;

  try {
    // Fetch with timeout for faster failures
    const event = await Promise.race([
      getEventDetails(eventId),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 3000),
      ),
    ]);

    if (!event) {
      return {
        title: "Event Not Found | Tixin",
        description: "The event you're looking for could not be found.",
      };
    }

    // Build title efficiently
    const titleParts = [
      event.title,
      event.location && `in ${event.location}`,
      "Tixin",
    ].filter(Boolean);
    const title = titleParts.join(" | ");

    // Generate description
    const cleanDescription = event.description
      ? stripHtml(event.description)
      : "";
    const trimmedDescription = cleanDescription
      ? truncateText(cleanDescription, 150)
      : "";
    const description = trimmedDescription
      ? `${trimmedDescription} Book your tickets now on Tixin.`
      : "Discover and book tickets for events near you with Tixin — India's event discovery platform.";

    // Extract keywords
    const keywords = extractKeywords(event);

    // Determine image URL
    const imageUrl =
      event.banner_square ||
      event.banner_horizontal ||
      "/logos/logoOnBlack.png";

    const eventUrl = `https://www.tixin.in/event/${eventId}`;

    return {
      title,
      description,
      keywords,
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
    // Fast fail with minimal metadata
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

  // Fetch event data - this will be cached by Next.js
  const event = await getEventDetails(eventId);

  if (!event) {
    notFound();
  }

  return (
    <Suspense fallback={<EventLoading />}>
      <EventClient eventId={eventId} initialEvent={event} />
    </Suspense>
  );
}
