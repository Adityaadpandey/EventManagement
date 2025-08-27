"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchPublicEvents } from "@/lib/features/eventsSlice";
import { p } from "framer-motion/client";
import { Calendar, Clock, MapPin, Users, Ticket, User } from "lucide-react";

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { items, loading, error, page, totalPages } = useAppSelector(
    (s) => s.events.list,
  );

  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchPublicEvents({ page: 1, limit: 10 }));
  }, [dispatch]);

  const filteredEvents = items.filter(
    (ev) =>
      ev.title?.toLowerCase().includes(search.toLowerCase()) ||
      ev.location?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-white w-full pb-20">
      <h1 className="text-3xl font-bold mb-6 text-white">Explore Events</h1>

      {/* Search */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row items-start gap-4 rounded-lg overflow-hidden shadow-md bg-zinc-900 animate-pulse"
            >
              <div className="w-full sm:w-64 h-48 bg-zinc-800" />
              <div className="p-4 flex-1 space-y-2">
                <div className="h-5 w-3/4 bg-zinc-800 rounded" />
                <div className="h-4 w-1/2 bg-zinc-800 rounded" />
                <div className="h-4 w-1/3 bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-400 font-medium">{error}</div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-6 text-center text-zinc-500">No events found.</div>
      ) : (
        <div className="space-y-6">
          {filteredEvents.map((ev) => (
            <Link
              key={ev.eventId}
              href={`/event/${ev.eventId}`}
              className="group flex flex-col sm:flex-row items-stretch gap-6 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 hover:shadow-md transition-shadow bg-zinc-900"
            >
              <div className="w-full sm:w-64 min-h-48 bg-zinc-700 flex-shrink-0 relative">
                {ev.banner_square || ev.banner_horizontal ? (
                  <img
                    src={(ev.banner_square || ev.banner_horizontal)!}
                    alt={ev.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                    No Image
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="py-5 px-4 sm:pl-0 flex-1 min-w-0 flex flex-col justify-between space-y-4">
                {/* Header */}
                <div className="space-y-1.5">
                  <h3 className="text-white text-lg font-medium leading-snug line-clamp-1">
                    {ev.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-400 font-medium">
                    {ev.date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-zinc-500" />
                        <span>
                          {new Date(ev.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                    {ev.time && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-zinc-500" />
                        <span>
                          {new Date(ev.time).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {ev.location && (
                    <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                      <MapPin size={14} className="text-zinc-500" />
                      <span className="line-clamp-1">{ev.location}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-2">
                  <div className="flex flex-col gap-1">
                    {ev.capacity && (
                      <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                        <Users size={14} className="text-zinc-500" />
                        <span>{ev.capacity} capacity</span>
                      </div>
                    )}

                    {ev.TicketType && ev.TicketType.length > 0 && (
                      <div className="space-y-1 text-sm text-zinc-400">
                        {ev.TicketType.slice(0, 2).map((ticket, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <Ticket size={14} className="text-zinc-500" />
                            <span className="truncate">
                              {ticket.name} – ${ticket.price}
                            </span>
                          </div>
                        ))}
                        {ev.TicketType.length > 2 && (
                          <span className="text-xs text-zinc-500 italic">
                            + {ev.TicketType.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lister */}
                  {ev.lister?.user?.name && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 italic">
                      <User size={12} className="text-zinc-500" />
                      <span>Listed by {ev.lister.user.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="flex items-center justify-center pt-10">
          <span className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
