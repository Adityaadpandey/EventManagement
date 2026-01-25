"use client";

import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { X, Bell } from "lucide-react";

interface NotificationPromptProps {
  token?: string;
}

/**
 * Banner component that prompts users to enable notifications
 * Shows only when notifications are supported but not enabled
 */
export default function NotificationPrompt({ token }: NotificationPromptProps) {
  const { supported, permission, subscribed, subscribe, loading } =
    useNotifications(token);
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the prompt
    const wasDismissed = localStorage.getItem("notification-prompt-dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Show prompt if notifications are supported but not enabled
    if (supported && permission === "default" && !subscribed && token) {
      // Delay showing the prompt to avoid overwhelming the user
      const timer = setTimeout(() => {
        setShow(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [supported, permission, subscribed, token]);

  const handleEnable = async () => {
    try {
      await subscribe();
      setShow(false);
    } catch (error) {
      console.error("Failed to enable notifications:", error);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("notification-prompt-dismissed", "true");
  };

  // Don't show if dismissed, not supported, already subscribed, or permission denied
  if (
    dismissed ||
    !show ||
    !supported ||
    subscribed ||
    permission === "denied"
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Stay Updated!
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              Enable notifications to get instant updates about your tickets,
              events, and payments.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Enabling..." : "Enable"}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
