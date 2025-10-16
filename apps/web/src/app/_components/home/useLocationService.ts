"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationCache {
  location: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  autoDetected: boolean;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000;
const GEOLOCATION_TIMEOUT = 10000;
const GEOLOCATION_MAX_AGE = 300000;

export const useLocationService = () => {
  const [userLocation, setUserLocation] = useState<string>("");
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(
    null,
  );
  const [locationLoading, setLocationLoading] = useState(false);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  const locationAttempted = useRef(false);
  const isProcessing = useRef(false);

  const geocodeCityToCoordinates = useCallback(
    async (cityName: string): Promise<Coordinates | null> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)},India&format=json&limit=1`,
          {
            signal: abortControllerRef.current.signal,
            headers: { "User-Agent": "EventsApp/1.0" },
          },
        );
        const data = await response.json();

        if (data && data.length > 0) {
          return {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
          };
        }
        return null;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return null;
        }
        console.error("Geocoding failed:", error);
        return null;
      }
    },
    [],
  );

  const reverseGeocode = useCallback(
    async (coords: Coordinates): Promise<string> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
          {
            signal: abortControllerRef.current.signal,
            headers: { "User-Agent": "EventsApp/1.0" },
          },
        );
        const data = await response.json();

        return (
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.state ||
          "Your Location"
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return "Your Location";
        }
        console.error("Reverse geocoding failed:", error);
        return "Your Location";
      }
    },
    [],
  );

  const saveLocationToCache = useCallback(
    (location: string, coords: Coordinates, autoDetected: boolean) => {
      try {
        const cache: LocationCache = {
          location,
          latitude: coords.latitude,
          longitude: coords.longitude,
          timestamp: Date.now(),
          autoDetected,
        };
        localStorage.setItem("locationCache", JSON.stringify(cache));
      } catch (e) {
        console.error("Cache save failed:", e);
      }
    },
    [],
  );

  const clearLocationCache = useCallback(() => {
    try {
      localStorage.removeItem("locationCache");
    } catch (e) {
      console.error("Cache clear failed:", e);
    }
  }, []);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    if (isProcessing.current || locationLoading || !navigator.geolocation) {
      return false;
    }

    isProcessing.current = true;
    setLocationLoading(true);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          const location = await reverseGeocode(coords);

          setUserLocation(location);
          setUserCoordinates(coords);
          setIsAutoDetected(true);
          saveLocationToCache(location, coords, true);
          setLocationLoading(false);
          setIsFirstLoad(false);
          isProcessing.current = false;
          resolve(true);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationLoading(false);
          setIsFirstLoad(false);
          isProcessing.current = false;
          resolve(false);
        },
        {
          timeout: GEOLOCATION_TIMEOUT,
          maximumAge: GEOLOCATION_MAX_AGE,
          enableHighAccuracy: false,
        },
      );
    });
  }, [locationLoading, reverseGeocode, saveLocationToCache]);

  const selectLocation = useCallback(
    async (location: string): Promise<boolean> => {
      if (isProcessing.current) {
        return false;
      }

      if (location === userLocation) return false;

      if (!location) {
        setUserLocation("");
        setUserCoordinates(null);
        setIsAutoDetected(false);
        clearLocationCache();
        return true;
      }

      isProcessing.current = true;
      setLocationLoading(true);

      const coords = await geocodeCityToCoordinates(location);

      if (coords) {
        setUserLocation(location);
        setUserCoordinates(coords);
        setIsAutoDetected(false);
        saveLocationToCache(location, coords, false);
        setLocationLoading(false);
        isProcessing.current = false;
        return true;
      }

      setLocationLoading(false);
      isProcessing.current = false;
      return false;
    },
    [
      userLocation,
      geocodeCityToCoordinates,
      saveLocationToCache,
      clearLocationCache,
    ],
  );

  useEffect(() => {
    try {
      const cached = localStorage.getItem("locationCache");
      if (cached) {
        const data: LocationCache = JSON.parse(cached);
        if (Date.now() - data.timestamp < CACHE_DURATION) {
          setUserLocation(data.location);
          setUserCoordinates({
            latitude: data.latitude,
            longitude: data.longitude,
          });
          setIsAutoDetected(data.autoDetected);
          setIsFirstLoad(false);
          return;
        }
      }
    } catch (e) {
      console.error("Cache load failed:", e);
    }

    if (!locationAttempted.current) {
      locationAttempted.current = true;
      requestLocationPermission();
    } else {
      setIsFirstLoad(false);
    }
  }, [requestLocationPermission]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    userLocation,
    userCoordinates,
    locationLoading,
    isAutoDetected,
    isFirstLoad,
    requestLocationPermission,
    selectLocation,
  };
};
