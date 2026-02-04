"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import NotificationModal from "./NotificationModal";
import { subscribeToPushNotifications } from "@/lib/notifications";

export default function NotificationModalWrapper() {
  const { token, user, hydrated } = useSelector((state: any) => state.auth);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until hydrated and mounted (avoid SSR issues)
  if (!mounted || !hydrated) return null;

  // Only show if user is logged in
  if (!token || !user) return null;

  const handleEnableNotifications = async () => {
    console.log("🔔 Starting notification subscription...");
    console.log("Token available:", !!token);
    console.log("Hostname:", window.location.hostname);

    if (!token) {
      throw new Error("No auth token available");
    }

    try {
      const result = await subscribeToPushNotifications(token);
      console.log("✅ Subscription successful:", result);
    } catch (error) {
      console.error("❌ Subscription failed:", error);
      throw error;
    }
  };

  return (
    <NotificationModal token={token} onEnable={handleEnableNotifications} />
  );
}
