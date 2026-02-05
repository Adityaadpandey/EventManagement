"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import NotificationModal from "./NotificationModal";
import { subscribeToPushNotifications } from "@/lib/notifications";

export default function NotificationModalWrapper() {
  const { token, user, hydrated } = useSelector((state: any) => state.auth);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until hydrated and mounted (avoid SSR issues)
  if (!mounted || !hydrated) return null;

  // Only show if user is logged in
  if (!token || !user) return null;

  const handleEnableNotifications = async () => {
    if (!token) {
      const errorMsg = "No auth token available. Please log in again.";
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      setError(null);
      setIsRetrying(false);
      const result = await subscribeToPushNotifications(token);
      return result;
    } catch (error) {
      // Set user-friendly error message
      let errorMessage = "Failed to enable notifications. ";

      if (error instanceof Error) {
        if (
          error.message.includes("permission denied") ||
          error.message.includes("permission was previously denied")
        ) {
          errorMessage =
            "Notification permission denied. Please enable in browser settings.";
        } else if (error.message.includes("not supported")) {
          errorMessage = error.message;
        } else if (error.message.includes("VAPID")) {
          errorMessage = "Server configuration error. Please contact support.";
        } else if (error.message.includes("Service Worker")) {
          errorMessage = "Service worker error. Please refresh and try again.";
        } else {
          errorMessage += error.message;
        }
      }

      setError(errorMessage);
      setIsRetrying(true);
      throw error;
    }
  };

  const handleRetry = () => {
    setError(null);
    setIsRetrying(false);
  };

  return (
    <NotificationModal
      token={token}
      onEnable={handleEnableNotifications}
      error={error}
      onRetry={handleRetry}
      isRetrying={isRetrying}
    />
  );
}
