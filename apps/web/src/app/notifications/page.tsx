"use client";

import { ArrowLeft, Bell, Check, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Notification {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/auth");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notification`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data.data.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notification/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        setNotifications(
          notifications.map((n) =>
            n.notificationId === notificationId ? { ...n, read: true } : n,
          ),
        );
      }
    } catch (err) {
      // Silent fail
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notification/${notificationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        setNotifications(
          notifications.filter((n) => n.notificationId !== notificationId),
        );
      }
    } catch (err) {
      // Silent fail
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notification/read-all`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        setNotifications(notifications.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      // Silent fail
    }
  };

  const clearAll = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notification/clear-all`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        setNotifications([]);
      }
    } catch (err) {
      // Silent fail
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TICKET_PURCHASED":
        return "🎫";
      case "PAYMENT_SUCCESS":
        return "💰";
      case "EVENT_UPDATE":
        return "📢";
      case "EVENT_REMINDER":
        return "⏰";
      case "SYSTEM":
        return "ℹ️";
      default:
        return "🔔";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eff0fb] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#f6d100] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#eff0fb] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchNotifications}
            className="px-6 py-2 bg-[#f6d100] text-black font-medium rounded-xl hover:bg-[#e5c200] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eff0fb]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1
              className="text-2xl font-bold text-black"
              style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}
            >
              Notifications
            </h1>
          </div>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={markAllAsRead}
                className="p-2 hover:bg-white rounded-xl transition-colors"
                title="Mark all as read"
              >
                <Check className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={clearAll}
                className="p-2 hover:bg-white rounded-xl transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-[#f6d100] rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-black" />
            </div>
            <h2
              className="text-lg font-semibold text-black mb-2"
              style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}
            >
              No notifications
            </h2>
            <p className="text-gray-500 text-sm">
              You're all caught up! New notifications will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.notificationId}
                className={`bg-white rounded-2xl p-4 transition-all ${
                  !notification.read ? "border-l-4 border-[#f6d100]" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-black text-sm">
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-600 text-sm">
                      {notification.message}
                    </p>
                    <div className="mt-3 flex gap-2">
                      {!notification.read && (
                        <button
                          onClick={() =>
                            markAsRead(notification.notificationId)
                          }
                          className="text-xs px-3 py-1.5 bg-[#eff0fb] text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() =>
                          deleteNotification(notification.notificationId)
                        }
                        className="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
