"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
}

const MapPicker = ({
  latitude,
  longitude,
  onLocationChange,
}: MapPickerProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Default location (center of India if no coordinates provided)
  const defaultLat = 20.5937;
  const defaultLng = 78.9629;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(containerRef.current).setView(
      [latitude || defaultLat, longitude || defaultLng],
      latitude && longitude ? 13 : 5,
    );

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Add initial marker if coordinates exist
    if (latitude && longitude) {
      const marker = L.marker([latitude, longitude], { draggable: true }).addTo(
        map,
      );
      markerRef.current = marker;

      // Update coordinates when marker is dragged
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onLocationChange(pos.lat, pos.lng);
      });
    }

    // Add click handler to place/move marker
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;

      if (markerRef.current) {
        // Move existing marker
        markerRef.current.setLatLng([lat, lng]);
      } else {
        // Create new marker
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = marker;

        // Update coordinates when marker is dragged
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onLocationChange(pos.lat, pos.lng);
        });
      }

      onLocationChange(lat, lng);
    });

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update marker position when coordinates change externally
  useEffect(() => {
    if (!mapRef.current) return;

    if (latitude && longitude) {
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        const marker = L.marker([latitude, longitude], {
          draggable: true,
        }).addTo(mapRef.current);
        markerRef.current = marker;

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onLocationChange(pos.lat, pos.lng);
        });
      }
      mapRef.current.setView([latitude, longitude], 13);
    }
  }, [latitude, longitude]);

  // Get user's current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        onLocationChange(lat, lng);

        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 13);
        }

        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert(
          "Unable to get your location. Please select manually on the map.",
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true },
    );
  };

  const handleClearLocation = () => {
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    onLocationChange(null as any, null as any);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          className="px-4 py-2 bg-[var(--color-primary)] text-black rounded-lg hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
        >
          {isLocating ? (
            <>
              <svg
                className="animate-spin w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Locating...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Use My Location
            </>
          )}
        </button>

        {latitude && longitude && (
          <button
            type="button"
            onClick={handleClearLocation}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
          >
            Clear Location
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className="w-full h-[400px] rounded-xl overflow-hidden border border-gray-300 shadow-sm"
      />

      {latitude && longitude && (
        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
          <p className="font-medium mb-1">Selected Location:</p>
          <p>Latitude: {latitude.toFixed(6)}</p>
          <p>Longitude: {longitude.toFixed(6)}</p>
        </div>
      )}
    </div>
  );
};

export default MapPicker;
