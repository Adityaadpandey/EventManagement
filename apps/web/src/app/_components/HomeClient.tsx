"use client";

import { fetchPublicEvents } from "@/lib/features/eventsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import EventCard from "@/app/_components/EventCard";
import Footer from "@/app/_components/Footer";

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { items, loading, error, page, totalPages } = useAppSelector(
    (s) => s.events.list,
  );

  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const tagsRef = useRef<HTMLDivElement>(null);

  const filters = [
    "All",
    "Fest",
    "Tech",
    "Hackathon",
    "Cultural",
    "EDM",
    "Concert",
    "NGO",
  ];

  useEffect(() => {
    dispatch(fetchPublicEvents({ page: 1, limit: 10 }));
  }, [dispatch]);

  useEffect(() => {
    const el = tagsRef.current;
    if (!el) return;

    const checkScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setShowLeftFade(scrollLeft > 0);
      setShowRightFade(scrollLeft + clientWidth < scrollWidth - 1);
    };

    checkScroll();
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  const filteredItems =
    activeFilter === "All"
      ? items
      : items.filter((ev) =>
          ev.tags?.some(
            (tag) => tag.toLowerCase() === activeFilter.toLowerCase(),
          ),
        );

  return (
    <div className="home-page-container">
      <div className="w-full flex justify-between border-b md:hidden mb-4 pb-4 border-b-[#00000014]">
        <div className="home-location-box flex">
          <img src="/svgs/location.svg" className="" alt="Location Icon" />
          <p className="home-location-text leading-none">
            Lovely Professional University
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <img src="/svgs/notification.svg" alt="" className="w-7" />

          <Link
            href="/profile"
            className="w-9 h-9 shrink-0 rounded-full overflow-hidden"
          >
            <img
              src="https://thumbs.dreamstime.com/b/simple-vector-illustration-showcases-user-profile-placeholder-icon-consists-black-circle-representing-head-351326903.jpg"
              alt="User Profile Placeholder"
              className="w-full h-full object-cover"
            />
          </Link>
        </div>
      </div>
      <h1 className="home-page-heading">Events for you</h1>

      {/* Filter Bar */}
      <div className="home-filter-bar">
        <div className="flex items-center gap-4">
          <img
            src="/svgs/searchIcon.svg"
            alt=""
            className="h-[52px] w-[52px] p-4 bg-white rounded-full md:block hidden"
          />
          <div className="home-filter-tags-wrapper">
            {showLeftFade && <div className="home-filter-gradient-left" />}
            <div className="home-filter-tags" ref={tagsRef}>
              {filters.map((filter, index) => (
                <h5
                  key={index}
                  className={`home-filter-tag cursor-pointer transition-colors duration-200 ${
                    activeFilter === filter ? "bg-black text-white" : "bg-white"
                  }`}
                  onClick={() => {
                    if (filter === "All") {
                      setActiveFilter("All");
                    } else {
                      setActiveFilter((prev) =>
                        prev === filter ? "All" : filter,
                      );
                    }
                  }}
                >
                  {filter}
                </h5>
              ))}
            </div>
            {showRightFade && <div className="home-filter-gradient-right" />}
          </div>
        </div>

        <div className="home-location-box md:flex hidden">
          <img src="/svgs/location.svg" className="home-location-icon" alt="" />
          <p className="home-location-text">Lovely Professional University</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex gap-4 animate-pulse bg-white rounded-xl overflow-hidden shadow-sm"
            >
              {/* Skeleton Image */}
              <div className="w-[40vw] md:w-[22vw] h-[36vw] md:h-[12vw] bg-zinc-200 rounded-xl" />

              {/* Skeleton Content */}
              <div className="flex-1 py-4 pr-4 space-y-3">
                {/* Title */}
                <div className="h-4 bg-zinc-200 rounded w-3/4" />

                {/* Tags */}
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-zinc-200 rounded-full" />
                  <div className="h-5 w-14 bg-zinc-200 rounded-full" />
                  <div className="h-5 w-20 bg-zinc-200 rounded-full" />
                </div>

                {/* Date, Time, Location */}
                <div className="flex gap-4 flex-wrap">
                  <div className="h-4 w-24 bg-zinc-200 rounded" />
                  <div className="h-4 w-28 bg-zinc-200 rounded" />
                  <div className="h-4 w-32 bg-zinc-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-400 font-medium">{error}</div>
      ) : filteredItems.length === 0 ? (
        <div className="p-6 text-center text-zinc-500">No events found.</div>
      ) : (
        <div className="home-event-list">
          {filteredItems.map((ev) => (
            <Link
              key={ev.eventId}
              href={`/event/${ev.eventId}`}
              className="group"
            >
              <EventCard
                imageUrl={ev.banner_horizontal}
                title={ev.title}
                location={ev.location}
                date={ev.date}
                price={Math.min(...ev.TicketType.map((t) => t.price))}
              />
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="home-pagination pb-40">
          <span>
            Page {page} of {totalPages}
          </span>
        </div>
      )}

      <Footer />
    </div>
  );
}
