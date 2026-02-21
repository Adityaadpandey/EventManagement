"use client";

import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import NotificationModal from "./NotificationModal";
import {
  subscribeToPushNotifications,
  isPushNotificationSupported,
  isSubscribed as checkIsSubscribed,
} from "@/lib/notifications";

export default function NotificationModalWrapper() {
  const { token, user, hydrated } = useSelector((state: any) => state.auth);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const autoSubscribeAttempted = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-subscribe silently when user logs in and permission is already granted
  useEffect(() => {
    if (!mounted || !hydrated || !token || !user) return;
    if (autoSubscribeAttempted.current) return;
    if (!isPushNotificationSupported()) return;
    if (!("Notification" in window)) return;

    const autoSubscribe = async () => {
      autoSubscribeAttempted.current = true;

      // Only auto-subscribe if permission was already granted (returning user)
      if (Notification.permission !== "granted") return;

      try {
        // Only re-subscribe if the browser has no existing push subscription.
        // If a subscription already exists, the server was already notified
        // when it was created. Re-subscribing every page load creates a new
        // endpoint each time, leaving stale "active" records in the DB.
        const alreadySubscribed = await checkIsSubscribed();
        if (alreadySubscribed) {
          console.log(
            "Push subscription already active, skipping auto-subscribe",
          );
          return;
        }

        // No browser subscription found — subscribe now (first visit after
        // clearing data, or subscription was lost/expired in the browser)
        console.log("Auto-subscribing to push notifications...");
        await subscribeToPushNotifications(token);
        console.log("Auto-subscribe successful");
      } catch (err) {
        // Silent failure for auto-subscribe - don't block the user
        console.warn("Auto-subscribe failed:", err);
      }
    };

    autoSubscribe();
  }, [mounted, hydrated, token, user]);

  // Reset auto-subscribe flag when user logs out
  useEffect(() => {
    if (!token) {
      autoSubscribeAttempted.current = false;
    }
  }, [token]);

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
