"use client";

import { useState, useEffect } from "react";
import {
  isPushNotificationSupported,
  getNotificationPermission,
  registerServiceWorker,
  subscribeToPushNotifications,
  isSubscribed,
  sendTestNotification,
  showLocalNotification,
} from "@/lib/notifications";

export default function TestNotificationsPage() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const isSupported = isPushNotificationSupported();
    setSupported(isSupported);

    if (isSupported) {
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);

      const isCurrentlySubscribed = await isSubscribed();
      setSubscribed(isCurrentlySubscribed);

      // Check if SW is registered
      const reg = await navigator.serviceWorker.getRegistration();
      setSwRegistered(!!reg);
    }
  };

  const handleRegisterSW = async () => {
    setLoading(true);
    setMessage("");
    try {
      const reg = await registerServiceWorker();
      if (reg) {
        setSwRegistered(true);
        setMessage("✅ Service Worker registered successfully!");
      } else {
        setMessage("❌ Failed to register Service Worker");
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    setMessage("");
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setMessage(`✅ Permission: ${result}`);
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!token) {
      setMessage("❌ Please enter your auth token first");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await subscribeToPushNotifications(token);
      setSubscribed(true);
      setMessage("✅ Successfully subscribed to push notifications!");
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!token) {
      setMessage("❌ Please enter your auth token first");
      return;
    }

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
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLocalNotification = async () => {
    setLoading(true);
    setMessage("");
    try {
      await showLocalNotification("🧪 Local Test Notification", {
        body: "This is a local test notification from the browser",
        icon: "/logos/pwa-icon-192.png",
        badge: "/logos/pwa-icon-192.png",
        tag: "local-test",
        data: { url: "/test-notifications" },
      });
      setMessage("✅ Local notification shown!");
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">
            🔔 Push Notifications Test
          </h1>
          <p className="text-gray-600 mb-4">
            Test push notifications in development mode
          </p>
        </div>

        {/* Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Supported:</span>
              <span className={supported ? "text-green-600" : "text-red-600"}>
                {supported ? "✅ Yes" : "❌ No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Permission:</span>
              <span
                className={
                  permission === "granted"
                    ? "text-green-600"
                    : permission === "denied"
                      ? "text-red-600"
                      : "text-yellow-600"
                }
              >
                {permission === "granted"
                  ? "✅ Granted"
                  : permission === "denied"
                    ? "❌ Denied"
                    : "⏳ Not requested"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Service Worker:</span>
              <span
                className={swRegistered ? "text-green-600" : "text-gray-500"}
              >
                {swRegistered ? "✅ Registered" : "⏳ Not registered"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Subscribed:</span>
              <span className={subscribed ? "text-green-600" : "text-gray-500"}>
                {subscribed ? "✅ Yes" : "⏳ No"}
              </span>
            </div>
          </div>
        </div>

        {/* Auth Token */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Auth Token</h2>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your auth token here"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="text-xs text-gray-500 mt-2">
            Get your token from localStorage or login response
          </p>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Actions</h2>
          <div className="space-y-3">
            <button
              onClick={handleRegisterSW}
              disabled={loading || swRegistered}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Registering..." : "1. Register Service Worker"}
            </button>

            <button
              onClick={handleRequestPermission}
              disabled={loading || permission === "granted"}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Requesting..." : "2. Request Permission"}
            </button>

            <button
              onClick={handleSubscribe}
              disabled={
                loading || !token || subscribed || permission !== "granted"
              }
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Subscribing..." : "3. Subscribe to Push"}
            </button>

            <button
              onClick={handleLocalNotification}
              disabled={loading || permission !== "granted"}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Sending..." : "4. Test Local Notification"}
            </button>

            <button
              onClick={handleTestNotification}
              disabled={loading || !token || !subscribed}
              className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Sending..." : "5. Test Push Notification"}
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`rounded-lg p-4 ${
              message.includes("✅")
                ? "bg-green-50 text-green-800"
                : message.includes("⏳")
                  ? "bg-yellow-50 text-yellow-800"
                  : "bg-red-50 text-red-800"
            }`}
          >
            {message}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            📝 Instructions:
          </h3>
          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
            <li>Click "Register Service Worker" to register sw-dev.js</li>
            <li>
              Click "Request Permission" to ask for notification permission
            </li>
            <li>Paste your auth token in the input above</li>
            <li>
              Click "Subscribe to Push" to subscribe to push notifications
            </li>
            <li>
              Click "Test Local Notification" to test browser notifications
            </li>
            <li>Click "Test Push Notification" to test server push</li>
          </ol>
        </div>

        {/* Debug Info */}
        <div className="bg-gray-100 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">Debug Info:</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(
              {
                supported,
                permission,
                swRegistered,
                subscribed,
                hasToken: !!token,
                env: process.env.NODE_ENV,
              },
              null,
              2,
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
