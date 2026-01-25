"use client";

import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { X, Bell, BellRing } from "lucide-react";

interface NotificationBannerProps {
  token?: string;
  showImmediately?: boolean;
}

export default function NotificationBanner({
  token,
  showImmediately = true,
}: NotificationBannerProps) {
  const { supported, permission, subscribed, subscribe, loading } =
    useNotifications(token);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user dismissed permanently
    const dismissed = localStorage.getItem("notification-banner-dismissed");
    if (dismissed) return;

    // Show if notifications are not enabled
    if (supported && permission === "default" && !subscribed && token) {
      if (showImmediately) {
        setShow(true);
      } else {
        setTimeout(() => setShow(true), 2000);
      }
    }
  }, [supported, permission, subscribed, token, showImmediately]);

  const handleEnable = async () => {
    try {
      await subscribe();
      setShow(false);
    } catch (error) {
      console.error("Failed to enable notifications:", error);
      alert("Failed to enable notifications. Please try again.");
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("notification-banner-dismissed", "true");
  };

  const handleLater = () => {
    setShow(false);
    // Don't save to localStorage - will show again next time
  };

  if (!show || !supported || subscribed || permission === "denied") {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] animate-fade-in"
        onClick={handleLater}
      />

      {/* Banner */}
      <div className="fixed top-0 left-0 right-0 z-[9999] animate-slide-down">
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white shadow-2xl">
          <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
            <div className="flex items-start gap-4">
              {/* Animated Icon */}
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
                  <BellRing className="w-7 h-7 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold mb-2">
                  🔔 Stay in the Loop!
                </h2>
                <p className="text-white/90 text-sm md:text-base mb-4">
                  Enable notifications to never miss ticket confirmations, event
                  reminders, and exclusive offers!
                </p>

                {/* Benefits Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6 text-xs md:text-sm">
                  <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-2">
                    <span className="text-green-300">✓</span>
                    <span>Instant Updates</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-2">
                    <span className="text-green-300">✓</span>
                    <span>Event Alerts</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-2">
                    <span className="text-green-300">✓</span>
                    <span>Special Offers</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-2">
                    <span className="text-green-300">✓</span>
                    <span>Never Miss Out</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleEnable}
                    disabled={loading}
                    className="flex-1 sm:flex-none px-8 py-3 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5"
                          viewBox="0 0 24 24"
                        >
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
                      "🔔 Enable Notifications Now"
                    )}
                  </button>

                  <button
                    onClick={handleLater}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 font-semibold rounded-lg transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>

                {/* Dismiss Link */}
                <button
                  onClick={handleDismiss}
                  className="mt-3 text-xs text-white/70 hover:text-white underline transition-colors"
                >
                  Don't show this again
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={handleLater}
                className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-slide-down {
          animation: slide-down 0.4s ease-out;
        }
      `}</style>
    </>
  );
}
