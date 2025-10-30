"use client";

import { memo } from "react";
import Link from "next/link";
import EventCard from "@/app/_components/EventCard";
import { InfiniteScrollLoader } from "./LoadingStates";

interface Event {
  eventId: string;
  banner_horizontal: string;
  title: string;
  location: string;
  date: string;
  TicketType?: Array<{ price: number }>;
  discountedPrice?: string | number;
}

interface EventsListProps {
  events: Event[];
  hasNextPage: boolean;
  loadingMore: boolean;
  observerRef: React.RefObject<HTMLDivElement>;
}

export const EventsList = memo(
  ({ events, hasNextPage, loadingMore, observerRef }: EventsListProps) => {
    return (
      <>
        <div className="home-event-list">
          {events.map((ev) => (
            <Link
              key={ev.eventId}
              href={`/event/${ev.eventId}`}
              className="group"
            >
              <EventCard
                discountedPrice={
                  ev.TicketType && ev.TicketType.length > 0
                    ? Math.min(...ev.TicketType.map((t) => t.discountedPrice))
                    : 0
                }
                imageUrl={ev.banner_horizontal}
                title={ev.title}
                location={ev.location}
                date={ev.date}
                price={
                  ev.TicketType && ev.TicketType.length > 0
                    ? Math.min(...ev.TicketType.map((t) => t.price))
                    : 0
                }
              />
            </Link>
          ))}
        </div>

        {hasNextPage && (
          <div ref={observerRef} className="w-full py-8">
            {loadingMore && <InfiniteScrollLoader />}
          </div>
        )}

        {!hasNextPage && events.length > 0 && (
          <div className="py-8 text-center text-gray-400">
            <p className="text-sm">You've reached the end of the list</p>
          </div>
        )}
      </>
    );
  },
);

EventsList.displayName = "EventsList";
