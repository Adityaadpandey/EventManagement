"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isSubscribed as checkIsSubscribed,
  sendTestNotification,
} from "@/lib/notifications";

interface UseNotificationsReturn {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  loading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  sendTest: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(token?: string): UseNotificationsReturn {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const isSupported = isPushNotificationSupported();
    setSupported(isSupported);

    if (isSupported) {
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);

      const isCurrentlySubscribed = await checkIsSubscribed();
      setSubscribed(isCurrentlySubscribed);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!token) {
      setError("Authentication token required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await subscribeToPushNotifications(token);
      await refresh();
    } catch (err: any) {
      setError(err.message || "Failed to subscribe");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, refresh]);

  const unsubscribe = useCallback(async () => {
    if (!token) {
      setError("Authentication token required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await unsubscribeFromPushNotifications(token);
      await refresh();
    } catch (err: any) {
      setError(err.message || "Failed to unsubscribe");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, refresh]);

  const sendTest = useCallback(async () => {
    if (!token) {
      setError("Authentication token required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await sendTestNotification(token);
      if (!success) {
        throw new Error("Failed to send test notification");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send test notification");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    supported,
    permission,
    subscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTest,
    refresh,
  };
}
