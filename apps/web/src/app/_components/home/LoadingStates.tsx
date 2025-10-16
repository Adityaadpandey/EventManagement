"use client";

import { memo } from "react";
import { Loader2, MapPin, X, Bell } from "lucide-react";

export const LoadingSkeleton = memo(() => (
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
));

LoadingSkeleton.displayName = "LoadingSkeleton";

export const LocationLoading = memo(() => (
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
));

LocationLoading.displayName = "LocationLoading";

export const InfiniteScrollLoader = memo(() => (
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
));

InfiniteScrollLoader.displayName = "InfiniteScrollLoader";

export const EmptyState = memo(
  ({
    hasActiveFilters,
    userLocation,
    onClear,
  }: {
    hasActiveFilters: boolean;
    userLocation: string;
    onClear: () => void;
  }) => (
    <div className="p-12 text-center text-zinc-500">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        <Bell size={32} className="text-gray-400" />
      </div>
      <p className="text-lg font-medium mb-2">
        {hasActiveFilters ? "No events found" : "No events available"}
      </p>
      <p className="text-sm text-gray-400 mb-4">
        {hasActiveFilters
          ? "Try adjusting your filters or search query"
          : userLocation
            ? "No events in your area right now"
            : "Check back later for new events"}
      </p>
      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  ),
);

EmptyState.displayName = "EmptyState";

export const ErrorState = memo(({ onRetry }: { onRetry: () => void }) => (
  <div className="p-6 text-center">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mb-3">
      <X className="w-6 h-6 text-red-500" />
    </div>
    <p className="text-red-500 font-medium mb-2">Unable to load events</p>
    <p className="text-gray-500 text-sm mb-4">
      Please check your connection and try again
    </p>
    <button
      onClick={onRetry}
      className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
    >
      Retry
    </button>
  </div>
));

ErrorState.displayName = "ErrorState";
