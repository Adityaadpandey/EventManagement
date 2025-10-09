"use client";

import { fetchPublicEvents, resetEventsList } from "@/lib/features/eventsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EventCard from "@/app/_components/EventCard";
import Footer from "@/app/_components/Footer";
import {
  Bell,
  X,
  MapPin,
  Loader2,
  ChevronDown,
  Navigation,
} from "lucide-react";

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

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { items, loading, loadingMore, error, nextCursor, hasNextPage } =
    useAppSelector((s) => s.events.list);

  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<string>("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const tagsRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const hasLoadedOnce = useRef(false);
  const locationAttempted = useRef(false);

  // Function to request location permission
  const requestLocationPermission = async () => {
    if (locationLoading) return;

    setLocationLoading(true);

    try {
      if (!navigator.geolocation) {
        setLocationLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              { signal: AbortSignal.timeout(5000) },
            );
            const data = await response.json();

            const location =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.state ||
              "Your Location";

            // If location is the same and auto-detected, just close dropdown
            if (location === userLocation && isAutoDetected) {
              setLocationLoading(false);
              setIsFirstLoad(false);
              return;
            }

            setUserLocation(location);
            setIsAutoDetected(true);

            localStorage.setItem("userLocation", location);
            localStorage.setItem(
              "userLocationTimestamp",
              Date.now().toString(),
            );
            localStorage.setItem("isAutoDetected", "true");

            if (hasLoadedOnce.current) {
              dispatch(resetEventsList());
              hasLoadedOnce.current = false;
            }
          } catch (error) {
            console.error("Reverse geocoding failed:", error);
          } finally {
            setLocationLoading(false);
            setIsFirstLoad(false);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationLoading(false);
          setIsFirstLoad(false);
        },
        {
          timeout: 10000,
          maximumAge: 300000,
          enableHighAccuracy: false,
        },
      );
    } catch (error) {
      console.error("Error requesting location:", error);
      setLocationLoading(false);
      setIsFirstLoad(false);
    }
  };

  // Check cached location and request permission on mount
  useEffect(() => {
    const cachedLocation = localStorage.getItem("userLocation");
    const cacheTimestamp = localStorage.getItem("userLocationTimestamp");
    const wasAutoDetected = localStorage.getItem("isAutoDetected") === "true";
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    if (
      cachedLocation &&
      cacheTimestamp &&
      Date.now() - parseInt(cacheTimestamp) < CACHE_DURATION
    ) {
      setUserLocation(cachedLocation);
      setIsAutoDetected(wasAutoDetected);
      setIsFirstLoad(false);
    } else if (!locationAttempted.current) {
      locationAttempted.current = true;
      requestLocationPermission();
    } else {
      setIsFirstLoad(false);
    }
  }, []);

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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const notifications = [
    {
      id: 1,
      title: "Event Approved",
      text: "Your event has been approved!",
      read: false,
    },
    {
      id: 2,
      title: "New Booking",
      text: "New booking received for Summer Festival",
      read: false,
    },
    {
      id: 3,
      title: "Reminder",
      text: "Event reminder: Tech Conference starts tomorrow",
      read: true,
    },
    {
      id: 4,
      title: "Payment Received",
      text: "Payment received for $150",
      read: true,
    },
  ];

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

  // Initial fetch - only once when ready
  useEffect(() => {
    if (!isFirstLoad && !hasLoadedOnce.current) {
      hasLoadedOnce.current = true;
      dispatch(
        fetchPublicEvents({
          limit: 10,
          location: userLocation || undefined,
        }),
      );
    }
  }, [dispatch, userLocation, isFirstLoad]);

  // Refetch when filter changes
  useEffect(() => {
    if (hasLoadedOnce.current && activeFilter !== "All") {
      dispatch(resetEventsList());
      dispatch(
        fetchPublicEvents({
          limit: 10,
          location: userLocation || undefined,
        }),
      );
    }
  }, [activeFilter, dispatch, userLocation]);

  // Refetch when location changes (only if events already loaded)
  useEffect(() => {
    if (userLocation && hasLoadedOnce.current) {
      dispatch(resetEventsList());
      dispatch(
        fetchPublicEvents({
          limit: 10,
          location: userLocation,
        }),
      );
    }
  }, [userLocation, dispatch]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !loadingMore &&
          !loading
        ) {
          dispatch(
            fetchPublicEvents({
              cursor: nextCursor || undefined,
              limit: 10,
              location: userLocation || undefined,
              append: true,
            }),
          );
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
  }, [hasNextPage, loadingMore, loading, nextCursor, dispatch, userLocation]);

  // Check scroll for filter tags fade
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

  // Handle manual location selection
  const handleLocationSelect = (location: string) => {
    // If selecting the same location, just close dropdown
    if (location === userLocation) {
      setLocationDropdownOpen(false);
      return;
    }

    setUserLocation(location);
    setIsAutoDetected(false);
    setLocationDropdownOpen(false);

    localStorage.setItem("userLocation", location);
    localStorage.setItem("userLocationTimestamp", Date.now().toString());
    localStorage.setItem("isAutoDetected", "false");

    if (hasLoadedOnce.current) {
      dispatch(resetEventsList());
      hasLoadedOnce.current = false;
    }
  };

  // Apply search filter
  const searchFiltered = searchQuery
    ? items.filter(
        (ev) =>
          ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ev.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ev.tags?.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      )
    : items;

  // Apply category filter
  const filteredItems =
    activeFilter === "All"
      ? searchFiltered
      : searchFiltered.filter((ev) =>
          ev.tags?.some(
            (tag) => tag.toLowerCase() === activeFilter.toLowerCase(),
          ),
        );

  const toggleSearch = () => {
    const newSearchOpen = !searchOpen;
    setSearchOpen(newSearchOpen);
    if (!newSearchOpen) {
      setSearchQuery("");
    }
  };

  // Show initial loading only when fetching location for first time
  const showInitialLoading = isFirstLoad && locationLoading;

  return (
    <div className="relative">
      <img
        src="svgs/homeGradient.svg"
        alt=""
        className="absolute top-[70px] md:right-2 md:block hidden z-0"
      />
      <div className="home-page-container z-30 relative">
        {/* Mobile Header */}
        <div className="w-full flex justify-between border-b md:hidden mb-4 pb-4 border-b-[#00000014]">
          <div className="relative" ref={locationRef}>
            <button
              onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
              disabled={locationLoading}
              className="home-location-box flex"
            >
              {locationLoading ? (
                <Loader2 className="w-4 h-4 text-gray-600 animate-spin flex-shrink-0" />
              ) : (
                <MapPin
                  className={`w-4 h-4 flex-shrink-0 ${
                    userLocation ? "text-black" : "text-gray-400"
                  }`}
                />
              )}
              <p className="home-location-text leading-none text-left text-sm max-w-[120px] truncate">
                {locationLoading
                  ? "Locating..."
                  : userLocation
                    ? userLocation
                    : "All Events"}
              </p>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            <AnimatePresence>
              {locationDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-2 max-h-[400px] overflow-y-auto"
                >
                  <button
                    onClick={() => {
                      requestLocationPermission();
                      setLocationDropdownOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-100"
                  >
                    <Navigation className="w-4 h-4" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Use Current Location
                      </p>
                      <p className="text-xs text-gray-500">
                        Auto-detect your location
                      </p>
                    </div>
                  </button>

                  {userLocation && (
                    <button
                      onClick={() => handleLocationSelect("")}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors text-sm"
                    >
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">All Events</span>
                    </button>
                  )}

                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Popular Cities
                  </div>

                  {MAJOR_CITIES.map((city) => (
                    <button
                      key={city}
                      onClick={() => handleLocationSelect(city)}
                      className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm ${
                        userLocation === city && !isAutoDetected
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div
            className="flex gap-4 items-center relative"
            ref={notificationRef}
          >
            <button
              onClick={() => setNotificationOpen((prev) => !prev)}
              className="relative"
            >
              <img
                src="/svgs/notification.svg"
                alt="Notifications"
                className="w-7"
              />
              {/* {notifications.filter((n) => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                {notifications.filter((n) => !n.read).length}
              </span>
            )} */}
            </button>

            <AnimatePresence>
              {notificationOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{
                    duration: 0.35,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="absolute top-12 right-0 max-w-sm w-[80.256vw] p-4 
                 bg-white/70 backdrop-blur-2xl rounded-2xl shadow-lg 
                 z-50 space-y-4 origin-top"
                >
                  <h3 className="font-semibold text-2xl text-gray-900 bricolage-grotesque leading-none">
                    Notifications
                  </h3>
                  <div className="max-h-[60vh] overflow-y-auto space-y-3">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-3 py-2 hover:bg-gray-50 transition-colors 
                         cursor-pointer bg-white rounded-xl ${
                           !notification.read
                             ? "border-l-4 border-blue-500"
                             : ""
                         }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 pr-2">
                              <p className="font-medium">
                                {notification.title}
                              </p>
                              <span className="text-[#8B8B8B] text-sm mt-1 block">
                                {notification.text}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-gray-500">
                        <Bell
                          size={28}
                          className="mx-auto mb-2 text-gray-300"
                        />
                        <p>No notifications yet</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
        <div className="home-filter-bar relative">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSearch}
              className="h-[52px] w-[52px] p-4 bg-white rounded-full md:flex hidden relative z-50 cursor-pointer items-center justify-center hover:bg-gray-50 transition-colors"
            >
              {searchOpen ? (
                <X size={20} className="text-gray-600" />
              ) : (
                <img src="/svgs/searchIcon.svg" alt="Search" />
              )}
            </button>

            <div className="home-filter-tags-wrapper">
              {showLeftFade && <div className="home-filter-gradient-left" />}
              <div className="home-filter-tags" ref={tagsRef}>
                {filters.map((filter, index) => (
                  <h5
                    key={index}
                    className={`home-filter-tag cursor-pointer transition-colors duration-200 ${
                      activeFilter === filter
                        ? "bg-black text-white"
                        : "bg-white hover:bg-gray-50"
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

          <div className="relative md:block hidden" ref={locationRef}>
            <button
              onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
              disabled={locationLoading}
              className="home-location-box flex "
            >
              {locationLoading ? (
                <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
              ) : (
                <MapPin
                  className={`w-5 h-5 ${
                    userLocation ? "text-black" : "text-gray-400"
                  }`}
                />
              )}
              <p className="home-location-text">
                {locationLoading
                  ? "Locating..."
                  : userLocation
                    ? userLocation
                    : "All Events"}
              </p>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            <AnimatePresence>
              {locationDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-2 max-h-[400px] overflow-y-auto"
                >
                  <button
                    onClick={() => {
                      requestLocationPermission();
                      setLocationDropdownOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-100"
                  >
                    <Navigation className="w-5 h-5 " />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Use Current Location
                      </p>
                      <p className="text-xs text-gray-500">
                        Auto-detect your location
                      </p>
                    </div>
                  </button>

                  {userLocation && (
                    <button
                      onClick={() => handleLocationSelect("")}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors text-sm"
                    >
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">All Events</span>
                    </button>
                  )}

                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Popular Cities
                  </div>

                  {MAJOR_CITIES.map((city) => (
                    <button
                      key={city}
                      onClick={() => handleLocationSelect(city)}
                      className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm ${
                        userLocation === city && !isAutoDetected
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {searchOpen && (
              <motion.div
                className="absolute left-0 top-0 h-[52px] bg-white shadow-lg z-40 flex items-center md:block hidden"
                initial={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  scaleY: 0.9,
                  y: 0,
                  opacity: 0,
                }}
                animate={{
                  width: "300px",
                  height: 52,
                  borderRadius: "9999px",
                  scaleY: [0.9, 1.05, 1],
                  y: 70,
                  opacity: 1,
                }}
                exit={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  scaleY: 0.9,
                  opacity: 0,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{ transformOrigin: "top center" }}
              >
                <motion.input
                  type="text"
                  placeholder="Search events, tags, or locations..."
                  className="w-full h-full bg-transparent outline-none px-4 text-base placeholder:text-gray-500 opacity-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") toggleSearch();
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        {showInitialLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-black animate-spin" />
              <MapPin className="w-8 h-8 text-black absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h3 className="text-xl font-semibold mt-6 text-gray-900">
              Finding events near you
            </h3>
            <p className="text-gray-500 mt-2 text-center px-4">
              Detecting your location for personalized events...
            </p>
          </div>
        ) : loading && items.length === 0 ? (
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="flex gap-4 animate-pulse bg-white rounded-xl overflow-hidden shadow-sm"
              >
                <div className="w-[40vw] md:w-[22vw] h-[36vw] md:h-[12vw] bg-zinc-200 rounded-xl" />
                <div className="flex-1 py-4 pr-4 space-y-3">
                  <div className="h-4 bg-zinc-200 rounded w-3/4" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-zinc-200 rounded-full" />
                    <div className="h-5 w-14 bg-zinc-200 rounded-full" />
                    <div className="h-5 w-20 bg-zinc-200 rounded-full" />
                  </div>
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
          <div className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mb-3">
              <X className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-red-500 font-medium mb-2">
              Unable to load events
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Please check your connection and try again
            </p>
            <button
              onClick={() => {
                dispatch(resetEventsList());
                hasLoadedOnce.current = false;
                dispatch(
                  fetchPublicEvents({
                    limit: 10,
                    location: userLocation || undefined,
                  }),
                );
              }}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Bell size={32} className="text-gray-400" />
            </div>
            <p className="text-lg font-medium mb-2">
              {searchQuery || activeFilter !== "All"
                ? "No events found"
                : "No events available"}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {searchQuery || activeFilter !== "All"
                ? "Try adjusting your filters or search query"
                : userLocation
                  ? "No events in your area right now"
                  : "Check back later for new events"}
            </p>
            {(searchQuery || activeFilter !== "All") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("All");
                }}
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
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
              <div ref={observerTarget} className="w-full py-8">
                {loadingMore && (
                  <div className="space-y-6">
                    {Array.from({ length: 2 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="flex gap-4 animate-pulse bg-white rounded-xl overflow-hidden shadow-sm"
                      >
                        <div className="w-[40vw] md:w-[22vw] h-[36vw] md:h-[12vw] bg-zinc-200 rounded-xl" />
                        <div className="flex-1 py-4 pr-4 space-y-3">
                          <div className="h-4 bg-zinc-200 rounded w-3/4" />
                          <div className="flex gap-2">
                            <div className="h-5 w-16 bg-zinc-200 rounded-full" />
                            <div className="h-5 w-14 bg-zinc-200 rounded-full" />
                          </div>
                          <div className="flex gap-4 flex-wrap">
                            <div className="h-4 w-24 bg-zinc-200 rounded" />
                            <div className="h-4 w-28 bg-zinc-200 rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!hasNextPage && items.length > 0 && (
              <div className="py-8 text-center text-gray-400">
                <p className="text-sm">You've reached the end of the list</p>
              </div>
            )}
          </>
        )}

        <Footer />
      </div>
    </div>
  );
}
