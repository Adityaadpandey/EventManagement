"use client";

import { fetchPublicEvents, resetEventsList } from "@/lib/features/eventsSlice";
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

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { items, loading, loadingMore, error, nextCursor, hasNextPage } =
    useAppSelector((s) => s.events.list);

  // Location service hook
  const {
    userLocation,
    userCoordinates,
    locationLoading,
    isAutoDetected,
    isFirstLoad,
    requestLocationPermission,
    selectLocation,
  } = useLocationService();

  // Local state
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  // Refs
  const notificationRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const hasLoadedOnce = useRef(false);
  const isFetching = useRef(false);
  const prevCoordinates = useRef<string>("");
  const prevFilter = useRef<string>("All");

  // Close dropdowns on outside click
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

  // Single unified fetch logic
  const fetchEvents = useCallback(
    (
      params: {
        reset?: boolean;
        cursor?: string;
        append?: boolean;
      } = {},
    ) => {
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
        if (!hasLoadedOnce.current) {
          hasLoadedOnce.current = true;
        }
      });
    },
    [dispatch, userCoordinates],
  );

  // Initial fetch - only when location is ready
  useEffect(() => {
    if (!isFirstLoad && !hasLoadedOnce.current && !isFetching.current) {
      fetchEvents();
    }
  }, [isFirstLoad, fetchEvents]);

  // Handle location changes
  useEffect(() => {
    const coordsKey = userCoordinates
      ? `${userCoordinates.latitude},${userCoordinates.longitude}`
      : "null";

    // Skip if coordinates haven't actually changed
    if (coordsKey === prevCoordinates.current) return;

    // Skip initial render
    if (prevCoordinates.current === "" && !hasLoadedOnce.current) {
      prevCoordinates.current = coordsKey;
      return;
    }

    prevCoordinates.current = coordsKey;

    // Only refetch if we've loaded before
    if (hasLoadedOnce.current) {
      fetchEvents({ reset: true });
    }
  }, [userCoordinates, fetchEvents]);

  // Handle filter changes
  useEffect(() => {
    // Skip initial render
    if (prevFilter.current === "All" && activeFilter === "All") {
      prevFilter.current = activeFilter;
      return;
    }

    // Skip if filter hasn't changed
    if (prevFilter.current === activeFilter) return;

    prevFilter.current = activeFilter;

    // Only refetch if we've loaded before and filter changed
    if (hasLoadedOnce.current) {
      fetchEvents({ reset: true });
    }
  }, [activeFilter, fetchEvents]);

  // Infinite scroll observer
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
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, loadingMore, loading, nextCursor, fetchEvents]);

  // Memoized filtered items
  const filteredItems = useMemo(() => {
    let result = items;

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
  }, [items, searchQuery, activeFilter]);

  // Handlers
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
      const success = await selectLocation(location);
      setLocationDropdownOpen(false);

      // The useEffect watching userCoordinates will handle the refetch
    },
    [selectLocation],
  );

  const handleRequestLocation = useCallback(async () => {
    const success = await requestLocationPermission();
    setLocationDropdownOpen(false);

    // The useEffect watching userCoordinates will handle the refetch
  }, [requestLocationPermission]);

  const showInitialLoading = isFirstLoad && locationLoading;
  const hasActiveFilters = searchQuery || activeFilter !== "All";

  return (
    <div className="relative min-h-screen">
      {/* Background Gradient */}
      <Image
        src="/svgs/homeGradient.svg"
        alt=""
        width={500}
        height={300}
        className="absolute top-[70px] md:right-2 md:block hidden z-0 pointer-events-none"
        priority={false}
      />

      <div className="home-page-container z-30 relative">
        {/* Mobile Header */}
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

        {/* Page Title */}
        <h1 className="home-page-heading">Events for you</h1>

        {/* Filter Bar */}
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

          {/* Desktop Location Selector */}
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

        {/* Content Area */}
        {showInitialLoading ? (
          <LocationLoading />
        ) : loading && items.length === 0 ? (
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
