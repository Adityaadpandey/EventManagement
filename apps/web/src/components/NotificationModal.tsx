"use client";

import { isPushNotificationSupported, isSubscribed } from "@/lib/notifications";
import { Bell, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";

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
  const [leaving, setLeaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkNotificationStatus = async () => {
      if (!token) return;

      const permanentlyDismissed = localStorage.getItem(
        "notification-modal-permanently-dismissed",
      );
      if (permanentlyDismissed) return;

      const sessionDismissed = sessionStorage.getItem(
        "notification-modal-session-dismissed",
      );
      if (sessionDismissed) return;

      if (!isPushNotificationSupported()) return;

      if ("Notification" in window) {
        const permission = Notification.permission;
        if (permission === "denied") return;

        if (permission === "default") {
          // Small delay so it doesn't pop instantly on page load
          setTimeout(() => setShow(true), 2000);
          return;
        }

        if (permission === "granted") {
          const subscribed = await isSubscribed();
          if (!subscribed) {
            setTimeout(() => setShow(true), 2000);
          }
        }
      }
    };

    checkNotificationStatus();
  }, [token]);

  // Auto-dismiss after 8 seconds if user doesn't interact
  useEffect(() => {
    if (show && !loading) {
      autoDismissTimer.current = setTimeout(() => {
        dismiss(false);
      }, 8000);
    }
    return () => {
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    };
  }, [show, loading]);

  const dismiss = (permanent: boolean) => {
    if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    setLeaving(true);
    setTimeout(() => {
      setShow(false);
      setLeaving(false);
      if (permanent) {
        localStorage.setItem(
          "notification-modal-permanently-dismissed",
          "true",
        );
      } else {
        sessionStorage.setItem("notification-modal-session-dismissed", "true");
      }
    }, 300);
  };

  const handleEnable = async () => {
    if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    setLoading(true);
    try {
      await onEnable();
      setLeaving(true);
      setTimeout(() => {
        setShow(false);
        setLeaving(false);
        localStorage.removeItem("notification-modal-permanently-dismissed");
        sessionStorage.removeItem("notification-modal-session-dismissed");
      }, 300);
    } catch (error: any) {
      console.error("Failed to enable notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-[9999] flex justify-center pointer-events-none`}
    >
      <div
        className={`pointer-events-auto bg-white rounded-2xl shadow-2xl max-w-sm w-full p-4 flex items-center gap-3 border border-gray-100 transition-all duration-300 ${
          leaving
            ? "opacity-0 translate-y-4"
            : "opacity-100 translate-y-0 animate-slide-up"
        }`}
      >
        {/* Icon */}
        <div className="w-10 h-10 bg-[#f6d100] rounded-full flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-black" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold text-black leading-tight"
            style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}
          >
            {error ? "Setup failed" : "Enable notifications"}
          </p>
          <p className="text-xs text-gray-500 leading-tight mt-0.5">
            {error ? "Tap to retry" : "Get updates for tickets & events"}
          </p>
        </div>

        {/* Action */}
        <button
          onClick={
            isRetrying
              ? () => {
                  onRetry?.();
                  handleEnable();
                }
              : handleEnable
          }
          disabled={loading}
          className="px-4 py-2 bg-[#f6d100] text-black text-sm font-semibold rounded-xl hover:bg-[#e5c200] disabled:opacity-50 transition-all shrink-0"
          style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
          ) : isRetrying ? (
            "Retry"
          ) : (
            "Enable"
          )}
        </button>

        {/* Close */}
        <button
          onClick={() => dismiss(false)}
          className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
