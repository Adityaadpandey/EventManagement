"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchPublicEvents } from "@/lib/features/eventsSlice";

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { items, loading, error, page, totalPages } = useAppSelector(
    (s) => s.events.list,
  );

  useEffect(() => {
    dispatch(fetchPublicEvents({ page: 1, limit: 10 }));
  }, [dispatch]);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm">
        Loading events...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-400 font-medium">{error}</div>
    );
  }

  if (!items.length) {
    return (
      <div className="p-6 text-center text-gray-500">No events found.</div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-white">
      <h1 className="text-3xl font-bold mb-8 text-white">Upcoming Events</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((ev) => (
          <Link
            key={ev.eventId}
            href={`/event/${ev.eventId}`}
            className="group bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="relative w-full h-48 bg-zinc-800">
              {ev.banner_square || ev.banner_horizontal ? (
                <img
                  src={(ev.banner_square || ev.banner_horizontal)!}
                  alt={ev.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                  No Image
                </div>
              )}
            </div>

            <div className="p-4 w-80">
              <h3 className="font-semibold text-lg text-white line-clamp-1">
                {ev.title}
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                {ev.date ? (
                  <>
                    {new Date(ev.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </>
                ) : null}
                {ev.time ? (
                  <>
                    {" • "}
                    {new Date(ev.time).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </>
                ) : null}
              </p>
              <p className="text-sm text-zinc-500 mt-1 line-clamp-1">
                {ev.location || ""}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-center pt-10">
        <span className="text-sm text-zinc-500">
          Page {page} of {totalPages}
        </span>
      </div>
    </div>
  );
}
