"use client";

import {
  isSubscribed as checkIsSubscribed,
  isPushNotificationSupported,
  subscribeToPushNotifications,
} from "@/lib/notifications";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import NotificationModal from "./NotificationModal";

export default function NotificationModalWrapper() {
  const { token, user, hydrated } = useSelector((state: any) => state.auth);
  const [mounted, setMounted] = useState(false);
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
        const alreadySubscribed = await checkIsSubscribed();
        if (alreadySubscribed) {
          console.log(
            "Push subscription already active, skipping auto-subscribe",
          );
          return;
        }

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
      console.warn("No auth token available for notification subscription.");
      return;
    }

    try {
      await subscribeToPushNotifications(token);
    } catch (error) {
      // Silent — modal is already dismissed, just log
      console.warn("Notification subscription failed in background:", error);
    }
  };

  return (
    <NotificationModal token={token} onEnable={handleEnableNotifications} />
  );
}
