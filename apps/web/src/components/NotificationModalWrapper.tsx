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
    if (!token) {
      throw new Error("No auth token available");
    }
    await subscribeToPushNotifications(token);
  };

  return (
    <NotificationModal token={token} onEnable={handleEnableNotifications} />
  );
}
