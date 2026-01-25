"use client";

import { useEffect, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationInitializerProps {
  token?: string;
  autoSubscribe?: boolean;
}

/**
 * Component to initialize and manage push notifications
 * Place this in your app layout to automatically handle notifications
 */
export default function NotificationInitializer({
  token,
  autoSubscribe = false,
}: NotificationInitializerProps) {
  const { supported, permission, subscribed, subscribe } =
    useNotifications(token);
  const [hasPrompted, setHasPrompted] = useState(false);

  useEffect(() => {
    // Only proceed if notifications are supported and user is logged in
    if (!supported || !token || hasPrompted) {
      return;
    }

    // Auto-subscribe if enabled and permission is already granted
    if (autoSubscribe && permission === "granted" && !subscribed) {
      subscribe().catch(console.error);
      setHasPrompted(true);
    }

    // Prompt user if permission is default (not yet asked)
    if (permission === "default" && !subscribed) {
      // Wait a bit before prompting to avoid overwhelming the user
      const timer = setTimeout(() => {
        promptForNotifications();
      }, 5000); // Wait 5 seconds after page load

      return () => clearTimeout(timer);
    }
  }, [supported, token, permission, subscribed, autoSubscribe, hasPrompted]);

  const promptForNotifications = async () => {
    if (hasPrompted) return;

    setHasPrompted(true);

    // You can show a custom UI here before requesting permission
    // For now, we'll just request permission directly
    try {
      await subscribe();
    } catch (error) {
      console.error("Failed to subscribe to notifications:", error);
    }
  };

  // This component doesn't render anything
  return null;
}
