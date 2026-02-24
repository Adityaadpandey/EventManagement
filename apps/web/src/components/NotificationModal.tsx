"use client";

import { isPushNotificationSupported, isSubscribed } from "@/lib/notifications";
import { Bell, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface NotificationModalProps {
  token?: string;
  onEnable: () => Promise<void>;
}

export default function NotificationModal({
  token,
  onEnable,
}: NotificationModalProps) {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
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
    if (show) {
      autoDismissTimer.current = setTimeout(() => {
        dismiss(false);
      }, 8000);
    }
    return () => {
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    };
  }, [show]);

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

  const handleEnable = () => {
    if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);

    // Dismiss modal immediately — fire and forget
    setLeaving(true);
    setTimeout(() => {
      setShow(false);
      setLeaving(false);
      localStorage.removeItem("notification-modal-permanently-dismissed");
      sessionStorage.removeItem("notification-modal-session-dismissed");
    }, 300);

    // Run subscription in background — no UI blocking
    onEnable().catch((err) => {
      console.warn("Background notification subscription failed:", err);
    });
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
        <div className="w-10 h-10 bg-[var(--color-primary)] rounded-full flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-black" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold text-black leading-tight"
            style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}
          >
            Enable notifications
          </p>
          <p className="text-xs text-gray-500 leading-tight mt-0.5">
            Get updates for tickets & events
          </p>
        </div>

        {/* Action */}
        <button
          onClick={handleEnable}
          className="px-4 py-2 bg-[var(--color-primary)] text-black text-sm font-semibold rounded-xl hover:brightness-95 transition-all shrink-0"
          style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}
        >
          Enable
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
