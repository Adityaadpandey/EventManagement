"use client";

import { isPushNotificationSupported, isSubscribed } from "@/lib/notifications";
import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";

interface NotificationModalProps {
  token?: string;
  onEnable: () => Promise<void>;
  error?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export default function NotificationModal({
  token,
  onEnable,
  error,
  onRetry,
  isRetrying,
}: NotificationModalProps) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkNotificationStatus = async () => {
      if (!token) return;

      // Check if permanently dismissed
      const permanentlyDismissed = localStorage.getItem(
        "notification-modal-permanently-dismissed",
      );
      if (permanentlyDismissed) return;

      // Check if dismissed this session
      const sessionDismissed = sessionStorage.getItem(
        "notification-modal-session-dismissed",
      );
      if (sessionDismissed) return;

      // Check if push notifications are supported
      if (!isPushNotificationSupported()) return;

      // Check notification permission and subscription status
      if ("Notification" in window) {
        const permission = Notification.permission;

        if (permission === "denied") return;

        if (permission === "default") {
          setShow(true);
          return;
        }

        if (permission === "granted") {
          const subscribed = await isSubscribed();
          if (!subscribed) {
            setShow(true);
          }
        }
      }
    };

    checkNotificationStatus();
  }, [token]);

  const handleEnable = async () => {
    setLoading(true);
    try {
      await onEnable();
      setShow(false);
      localStorage.removeItem("notification-modal-permanently-dismissed");
      sessionStorage.removeItem("notification-modal-session-dismissed");
    } catch (error: any) {
      console.error("Failed to enable notifications:", error);
      if (error.message?.includes("permission denied")) {
        alert(
          "Notification permission was denied. Please enable notifications in your browser settings.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMaybeLater = () => {
    setShow(false);
    sessionStorage.setItem("notification-modal-session-dismissed", "true");
  };

  const handleDismissPermanently = () => {
    setShow(false);
    localStorage.setItem("notification-modal-permanently-dismissed", "true");
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleMaybeLater}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-scale-in">
        {/* Close button */}
        <button
          onClick={handleMaybeLater}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 bg-[#f6d100] rounded-full flex items-center justify-center shadow-md">
            <Bell className="w-8 h-8 text-black" />
          </div>
        </div>

        {/* Content */}
        <h2
          className="text-xl font-bold text-center mb-2 text-black"
          style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}
        >
          {error ? "Setup Failed" : "Stay Updated!"}
        </h2>

        {error ? (
          <p className="text-red-500 text-center text-sm mb-5">{error}</p>
        ) : (
          <p className="text-gray-500 text-center text-sm mb-5">
            Get instant updates for tickets, events & reminders
          </p>
        )}

        {/* Buttons */}
        <div className="space-y-2">
          {isRetrying ? (
            <button
              onClick={() => {
                onRetry?.();
                handleEnable();
              }}
              disabled={loading}
              className="w-full py-3 bg-[#f6d100] text-black font-semibold rounded-xl hover:bg-[#e5c200] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}
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
                  Retrying...
                </span>
              ) : (
                "Try Again"
              )}
            </button>
          ) : (
            <button
              onClick={handleEnable}
              disabled={loading}
              className="w-full py-3 bg-[#f6d100] text-black font-semibold rounded-xl hover:bg-[#e5c200] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}
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
                "Enable Notifications"
              )}
            </button>
          )}

          <button
            onClick={handleMaybeLater}
            className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
          >
            Maybe Later
          </button>
        </div>

        {/* Don't ask again */}
        <button
          onClick={handleDismissPermanently}
          className="w-full mt-3 text-xs text-gray-400 hover:text-gray-500 transition-colors"
        >
          Don't show again
        </button>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
