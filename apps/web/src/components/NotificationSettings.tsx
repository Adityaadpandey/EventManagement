"use client";

import { useState, useEffect } from "react";
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isSubscribed,
  sendTestNotification,
} from "@/lib/notifications";

interface NotificationSettingsProps {
  token: string; // User auth token
}

export default function NotificationSettings({
  token,
}: NotificationSettingsProps) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    const isSupported = isPushNotificationSupported();
    setSupported(isSupported);

    if (isSupported) {
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);

      const isCurrentlySubscribed = await isSubscribed();
      setSubscribed(isCurrentlySubscribed);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    setMessage("");

    try {
      await subscribeToPushNotifications(token);
      setSubscribed(true);
      setPermission("granted");
      setMessage("✅ Successfully subscribed to notifications!");
    } catch (error: any) {
      console.error("Subscription error:", error);
      setMessage(`❌ Failed to subscribe: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setMessage("");

    try {
      const success = await unsubscribeFromPushNotifications(token);
      if (success) {
        setSubscribed(false);
        setMessage("✅ Successfully unsubscribed from notifications");
      } else {
        setMessage("❌ Failed to unsubscribe");
      }
    } catch (error: any) {
      console.error("Unsubscribe error:", error);
      setMessage(`❌ Failed to unsubscribe: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    setMessage("");

    try {
      const success = await sendTestNotification(token);
      if (success) {
        setMessage("✅ Test notification sent! Check your notifications.");
      } else {
        setMessage("❌ Failed to send test notification");
      }
    } catch (error: any) {
      console.error("Test notification error:", error);
      setMessage(`❌ Failed to send test: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          ⚠️ Push notifications are not supported in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-2">Push Notifications</h3>

        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <span
              className={`text-sm font-medium ${
                subscribed ? "text-green-600" : "text-gray-500"
              }`}
            >
              {subscribed ? "🔔 Enabled" : "🔕 Disabled"}
            </span>
          </div>

          {/* Permission */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Permission:</span>
            <span
              className={`text-sm font-medium ${
                permission === "granted"
                  ? "text-green-600"
                  : permission === "denied"
                    ? "text-red-600"
                    : "text-gray-500"
              }`}
            >
              {permission === "granted"
                ? "✅ Granted"
                : permission === "denied"
                  ? "❌ Denied"
                  : "⏳ Not requested"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 mt-4">
            {!subscribed ? (
              <button
                onClick={handleSubscribe}
                disabled={loading || permission === "denied"}
                className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Subscribing..." : "Enable Notifications"}
              </button>
            ) : (
              <>
                <button
                  onClick={handleTestNotification}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Sending..." : "Send Test Notification"}
                </button>
                <button
                  onClick={handleUnsubscribe}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Unsubscribing..." : "Disable Notifications"}
                </button>
              </>
            )}
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.includes("✅")
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {message}
            </div>
          )}

          {/* Help text */}
          {permission === "denied" && (
            <p className="text-xs text-gray-500 mt-2">
              You have blocked notifications. Please enable them in your browser
              settings.
            </p>
          )}
        </div>
      </div>

      {/* Info section */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          What you'll receive:
        </h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Ticket purchase confirmations</li>
          <li>• Event reminders before your events</li>
          <li>• Payment status updates</li>
          <li>• Important event updates</li>
        </ul>
      </div>
    </div>
  );
}
