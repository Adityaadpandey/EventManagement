"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Loader2, MapPin, Navigation } from "lucide-react";
import { memo } from "react";

interface LocationSelectorProps {
  userLocation: string;
  locationLoading: boolean;
  locationDropdownOpen: boolean;
  isAutoDetected: boolean;
  cities: string[];
  onToggleDropdown: () => void;
  onRequestLocation: () => void;
  onSelectLocation: (location: string) => void;
  isMobile?: boolean;
}

export const LocationSelector = memo(
  ({
    userLocation,
    locationLoading,
    locationDropdownOpen,
    isAutoDetected,
    cities,
    onToggleDropdown,
    onRequestLocation,
    onSelectLocation,
    isMobile = false,
  }: LocationSelectorProps) => {
    return (
      <>
        <button
          onClick={onToggleDropdown}
          disabled={locationLoading}
          className="home-location-box flex"
          aria-label="Select location"
        >
          {locationLoading ? (
            <Loader2
              className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} text-gray-600 animate-spin ${isMobile ? "flex-shrink-0" : ""}`}
            />
          ) : (
            <MapPin
              className={`${isMobile ? "w-4 h-4 flex-shrink-0" : "w-5 h-5"} ${
                userLocation ? "text-black" : "text-gray-400"
              }`}
            />
          )}
          <p
            className={`home-location-text ${isMobile ? "leading-none text-left text-sm max-w-[120px] truncate" : ""}`}
          >
            {locationLoading ? "Locating..." : userLocation || "All Events"}
          </p>
          <ChevronDown
            className={`${isMobile ? "w-4 h-4 flex-shrink-0" : "w-4 h-4"} text-gray-500`}
          />
        </button>

        <AnimatePresence>
          {locationDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`absolute top-full ${isMobile ? "left-0" : "right-0"} mt-2 ${isMobile ? "w-64" : "w-72"} bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-2 max-h-[400px] overflow-y-auto`}
            >
              <button
                onClick={onRequestLocation}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-100"
              >
                <Navigation className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
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
                  onClick={() => onSelectLocation("")}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors text-sm"
                >
                  <MapPin
                    className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} text-gray-400`}
                  />
                  <span className="text-gray-700">All Events</span>
                </button>
              )}

              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Popular Cities
              </div>

              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => onSelectLocation(city)}
                  className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm ${
                    userLocation === city && !isAutoDetected
                      ? "bg-yellow-50 text-[var(--color-neutral-dark2)] font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {city}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  },
);

LocationSelector.displayName = "LocationSelector";
