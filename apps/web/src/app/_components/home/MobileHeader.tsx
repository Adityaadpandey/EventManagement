"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";
import { LocationSelector } from "./LocationSelector";
import { NotificationDropdown } from "./NotificationDropdown";

interface MobileHeaderProps {
  locationRef: React.RefObject<HTMLDivElement>;
  notificationRef: React.RefObject<HTMLDivElement>;
  userLocation: string;
  locationLoading: boolean;
  locationDropdownOpen: boolean;
  isAutoDetected: boolean;
  notificationOpen: boolean;
  notifications: any[];
  cities: string[];
  onToggleLocationDropdown: () => void;
  onRequestLocation: () => void;
  onSelectLocation: (location: string) => void;
  onToggleNotifications: () => void;
}

export const MobileHeader = memo(
  ({
    locationRef,
    notificationRef,
    userLocation,
    locationLoading,
    locationDropdownOpen,
    isAutoDetected,
    notificationOpen,
    notifications,
    cities,
    onToggleLocationDropdown,
    onRequestLocation,
    onSelectLocation,
    onToggleNotifications,
  }: MobileHeaderProps) => {
    return (
      <div className="w-full flex justify-between border-b md:hidden mb-4 pb-4 border-b-[#00000014]">
        <div className="relative" ref={locationRef}>
          <LocationSelector
            userLocation={userLocation}
            locationLoading={locationLoading}
            locationDropdownOpen={locationDropdownOpen}
            isAutoDetected={isAutoDetected}
            cities={cities}
            onToggleDropdown={onToggleLocationDropdown}
            onRequestLocation={onRequestLocation}
            onSelectLocation={onSelectLocation}
            isMobile={true}
          />
        </div>

        <div className="flex gap-4 items-center relative" ref={notificationRef}>
          <button
            onClick={onToggleNotifications}
            className="relative"
            aria-label="Notifications"
          >
            <Image
              src="/svgs/notification.svg"
              alt="Notifications"
              width={28}
              height={28}
              className="w-7 h-7"
            />
          </button>

          <AnimatePresence>
            {notificationOpen && (
              <NotificationDropdown notifications={notifications} />
            )}
          </AnimatePresence>

          <Link
            href="/profile"
            className="w-9 h-9 shrink-0 rounded-full overflow-hidden"
          >
            <Image
              src="https://thumbs.dreamstime.com/b/simple-vector-illustration-showcases-user-profile-placeholder-icon-consists-black-circle-representing-head-351326903.jpg"
              alt="User Profile"
              width={28}
              height={28}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </Link>
        </div>
      </div>
    );
  },
);

MobileHeader.displayName = "MobileHeader";
