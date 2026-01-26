"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

interface NotificationModalProps {
  token?: string;
  onEnable: () => Promise<void>;
}

export default function NotificationModal({
  token,
  onEnable,
}: NotificationModalProps) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem("notification-modal-dismissed");
    if (dismissed || !token) return;

    // Check notification permission
    if ("Notification" in window && Notification.permission === "default") {
      // Show immediately
      setShow(true);
    }
  }, [token]);

  const handleEnable = async () => {
    setLoading(true);
    try {
      await onEnable();
      setShow(false);
      // Mark as dismissed so it doesn't show again
      localStorage.setItem("notification-modal-dismissed", "true");
    } catch (error: any) {
      console.error("Failed to enable notifications:", error);

      // Check if it's a localhost issue
      if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        alert(
          "⚠️ Push notifications don't work on localhost.\n\nThey require HTTPS. Please test on your production domain or use ngrok/tunneling.",
        );
      } else if (error.message?.includes("permission denied")) {
        alert(
          "❌ Notification permission was denied.\n\nPlease enable notifications in your browser settings and try again.",
        );
      } else if (error.message?.includes("Service Worker")) {
        alert(
          "❌ Service Worker failed to register.\n\nPlease refresh the page and try again.",
        );
      } else {
        alert(
          "❌ Failed to enable notifications.\n\nError: " +
            (error.message || "Unknown error"),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("notification-modal-dismissed", "true");
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={() => setShow(false)}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-scale-in border border-gray-100">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center animate-bounce shadow-lg">
            <Bell className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-center mb-3 text-black">
          Enable Notifications?
        </h2>
        <p className="text-gray-600 text-center mb-6 text-sm">
          Get instant updates about your tickets, events, and exclusive offers.
          Never miss important information!
        </p>

        {/* Benefits */}
        <div className="space-y-3 mb-8 bg-gray-50 rounded-2xl p-4">
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span className="text-2xl">🎫</span>
            <span>Instant ticket confirmations</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span className="text-2xl">⏰</span>
            <span>Event reminders before they start</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span className="text-2xl">💰</span>
            <span>Payment and refund updates</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span className="text-2xl">🎉</span>
            <span>Exclusive offers and promotions</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="w-full py-4 bg-black text-white font-semibold rounded-xl hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Enabling...
              </span>
            ) : (
              "🔔 Enable Notifications"
            )}
          </button>

          <button
            onClick={() => setShow(false)}
            className="w-full py-3 text-gray-600 hover:text-black font-medium transition-colors rounded-xl hover:bg-gray-50"
          >
            Maybe Later
          </button>
        </div>

        {/* Dismiss link */}
        <button
          onClick={handleDismiss}
          className="w-full mt-4 text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
        >
          Don't ask again
        </button>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
