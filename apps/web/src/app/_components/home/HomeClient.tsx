"use client";

import { fetchPublicEvents, resetEventsList } from "@/lib/features/eventsSlice";
import type { EventSummary } from "@/lib/features/eventsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import Image from "next/image";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Footer from "@/app/_components/Footer";
import { FilterBar } from "@/app/_components/home/FilterBar";
import { LocationSelector } from "@/app/_components/home/LocationSelector";
import { MobileHeader } from "@/app/_components/home/MobileHeader";
import { EventsList } from "@/app/_components/home/EventsList";
import {
  LoadingSkeleton,
  LocationLoading,
  EmptyState,
  ErrorState,
} from "@/app/_components/home/LoadingStates";
import { useLocationService } from "@/app/_components/home/useLocationService";

const MAJOR_CITIES = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Chandigarh",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
];

const FILTERS = [
  "All",
  "Fest",
  "Tech",
  "ESports",
  "Hackathon",
  "Cultural",
  "EDM",
  "Concert",
  "NGO",
];

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: "Welcome to Tixin",
    text: "We're glad to have you join us. Let's get started!",
    read: false,
  },
];

interface HomeClientProps {
  initialEvents: EventSummary[];
}

export default function HomeClient({ initialEvents }: HomeClientProps) {
  const dispatch = useAppDispatch();
  const { items, loading, loadingMore, error, nextCursor, hasNextPage } =
    useAppSelector((s) => s.events.list);

  const {
    userLocation,
    userCoordinates,
    locationLoading,
    isAutoDetected,
    isFirstLoad,
    requestLocationPermission,
    selectLocation,
  } = useLocationService();

  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const hasLoadedOnce = useRef(false);
  const isFetching = useRef(false);
  const prevCoordinates = useRef<string>("");
  const prevFilter = useRef<string>("All");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setNotificationOpen(false);
      }
      if (
        locationRef.current &&
        !locationRef.current.contains(event.target as Node)
      ) {
        setLocationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchEvents = useCallback(
    (params: { reset?: boolean; cursor?: string; append?: boolean } = {}) => {
      if (isFetching.current) return;
      const { reset = false, cursor, append = false } = params;
      if (reset) {
        dispatch(resetEventsList());
        hasLoadedOnce.current = false;
      }
      isFetching.current = true;
      dispatch(
        fetchPublicEvents({
          cursor,
          limit: 10,
          latitude: userCoordinates?.latitude,
          longitude: userCoordinates?.longitude,
          append,
        }),
      ).finally(() => {
        isFetching.current = false;
        if (!hasLoadedOnce.current) hasLoadedOnce.current = true;
      });
    },
    [dispatch, userCoordinates],
  );

  useEffect(() => {
    if (!isFirstLoad && !hasLoadedOnce.current && !isFetching.current) {
      fetchEvents();
    }
  }, [isFirstLoad, fetchEvents]);

  useEffect(() => {
    const coordsKey = userCoordinates
      ? `${userCoordinates.latitude},${userCoordinates.longitude}`
      : "null";
    if (coordsKey === prevCoordinates.current) return;
    if (prevCoordinates.current === "" && !hasLoadedOnce.current) {
      prevCoordinates.current = coordsKey;
      return;
    }
    prevCoordinates.current = coordsKey;
    if (hasLoadedOnce.current) fetchEvents({ reset: true });
  }, [userCoordinates, fetchEvents]);

  useEffect(() => {
    if (prevFilter.current === "All" && activeFilter === "All") {
      prevFilter.current = activeFilter;
      return;
    }
    if (prevFilter.current === activeFilter) return;
    prevFilter.current = activeFilter;
    if (hasLoadedOnce.current) fetchEvents({ reset: true });
  }, [activeFilter, fetchEvents]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !loadingMore &&
          !loading &&
          !isFetching.current
        ) {
          fetchEvents({ cursor: nextCursor || undefined, append: true });
        }
      },
      { threshold: 0.5 },
    );
    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasNextPage, loadingMore, loading, nextCursor, fetchEvents]);

  // Use SSR events as fallback while client-side Redux hasn't loaded yet
  const displayItems = items.length > 0 ? items : initialEvents;

  const filteredItems = useMemo(() => {
    let result = displayItems;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (ev) =>
          ev.title.toLowerCase().includes(query) ||
          ev.location?.toLowerCase().includes(query) ||
          ev.tags?.some((tag) => tag.toLowerCase().includes(query)),
      );
    }
    if (activeFilter !== "All") {
      const filter = activeFilter.toLowerCase();
      result = result.filter((ev) =>
        ev.tags?.some((tag) => tag.toLowerCase() === filter),
      );
    }
    return result;
  }, [displayItems, searchQuery, activeFilter]);

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) setSearchQuery("");
      return !prev;
    });
  }, []);

  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter((prev) =>
      filter === "All" || prev !== filter ? filter : "All",
    );
  }, []);

  const handleRetry = useCallback(() => {
    fetchEvents({ reset: true });
  }, [fetchEvents]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setActiveFilter("All");
  }, []);

  const handleLocationSelect = useCallback(
    async (location: string) => {
      await selectLocation(location);
      setLocationDropdownOpen(false);
    },
    [selectLocation],
  );

  const handleRequestLocation = useCallback(async () => {
    await requestLocationPermission();
    setLocationDropdownOpen(false);
  }, [requestLocationPermission]);

  const showInitialLoading = isFirstLoad && locationLoading;
  const hasActiveFilters = !!(searchQuery || activeFilter !== "All");

  return (
    <div className="relative min-h-screen">
      <Image
        src="/svgs/homeGradient.svg"
        alt=""
        width={500}
        height={300}
        className="absolute top-[70px] md:right-2 md:block hidden z-0 pointer-events-none"
        priority={false}
      />

      <div className="home-page-container z-30 relative">
        <MobileHeader
          locationRef={locationRef}
          notificationRef={notificationRef}
          userLocation={userLocation}
          locationLoading={locationLoading}
          locationDropdownOpen={locationDropdownOpen}
          isAutoDetected={isAutoDetected}
          notificationOpen={notificationOpen}
          notifications={MOCK_NOTIFICATIONS}
          cities={MAJOR_CITIES}
          onToggleLocationDropdown={() =>
            setLocationDropdownOpen(!locationDropdownOpen)
          }
          onRequestLocation={handleRequestLocation}
          onSelectLocation={handleLocationSelect}
          onToggleNotifications={() => setNotificationOpen((prev) => !prev)}
        />

        <h1 className="home-page-heading">Events for you</h1>

        <div className="home-filter-bar relative">
          <FilterBar
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            filters={FILTERS}
            searchOpen={searchOpen}
            searchQuery={searchQuery}
            onSearchToggle={toggleSearch}
            onSearchChange={setSearchQuery}
          />
          <div className="relative md:block hidden" ref={locationRef}>
            <LocationSelector
              userLocation={userLocation}
              locationLoading={locationLoading}
              locationDropdownOpen={locationDropdownOpen}
              isAutoDetected={isAutoDetected}
              cities={MAJOR_CITIES}
              onToggleDropdown={() =>
                setLocationDropdownOpen(!locationDropdownOpen)
              }
              onRequestLocation={handleRequestLocation}
              onSelectLocation={handleLocationSelect}
            />
          </div>
        </div>

        {showInitialLoading ? (
          <LocationLoading />
        ) : loading && displayItems.length === 0 ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState onRetry={handleRetry} />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            hasActiveFilters={hasActiveFilters}
            userLocation={userLocation}
            onClear={clearAllFilters}
          />
        ) : (
          <EventsList
            events={filteredItems}
            hasNextPage={hasNextPage}
            loadingMore={loadingMore}
            observerRef={observerTarget}
          />
        )}

        <Footer />
      </div>
    </div>
  );
}
