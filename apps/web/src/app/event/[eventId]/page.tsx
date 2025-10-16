import type { Metadata } from "next";
import EventClient from "@/app/_components/EventClient";
import { getEventDetails } from "@/lib/api/getEventDetails";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEventDetails(eventId);

  const titleParts = [
    event?.title,
    event?.location ? `in ${event.location}` : null,
    "Tixin",
  ].filter(Boolean);

  const title = titleParts.join(" | ");

  const fallbackDescription =
    "Discover and book tickets for events near you with Tixin — India’s event discovery platform.";

  const rawDescription = event?.description || "";
  const cleanDescription = rawDescription.replace(/<\/?[^>]+(>|$)/g, "");
  const trimmedDescription =
    cleanDescription.length > 150
      ? `${cleanDescription.slice(0, 150).trim()}...`
      : cleanDescription;

  const description = trimmedDescription
    ? `${trimmedDescription} Book your tickets now on Tixin.`
    : fallbackDescription;

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
    ...categories.map((cat) => `buy ${cat.toLowerCase()} tickets`),
    ...categories.map((cat) => `${cat.toLowerCase()} events near me`),
    event?.location ? `events in ${event.location}` : null,
    ...categories.map((cat) =>
      event?.location
        ? `${cat.toLowerCase()} events in ${event.location}`
        : null,
    ),
  ].filter(Boolean) as string[];

  const imageUrl =
    event?.banner_square ||
    event?.banner_horizontal ||
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
          alt: `${event?.title || "Event"} Banner`,
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
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEventDetails(eventId);

  if (!event) {
    return <div className="p-6 text-zinc-400">Event not found</div>;
  }

  // Pass the server-fetched event data to the client component
  return <EventClient eventId={eventId} initialEvent={event} />;
}
