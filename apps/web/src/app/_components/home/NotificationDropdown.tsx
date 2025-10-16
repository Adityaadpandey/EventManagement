"use client";

import { memo } from "react";
import { Bell } from "lucide-react";
import { motion } from "framer-motion";

interface Notification {
  id: number;
  title: string;
  text: string;
  read: boolean;
}

interface NotificationDropdownProps {
  notifications: Notification[];
}

export const NotificationDropdown = memo(
  ({ notifications }: NotificationDropdownProps) => {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -20 }}
        transition={{
          duration: 0.35,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="absolute top-12 right-0 max-w-sm w-[80.256vw] p-4 bg-white/70 backdrop-blur-2xl rounded-2xl shadow-lg z-50 space-y-4 origin-top"
      >
        <h3 className="font-semibold text-2xl text-gray-900 bricolage-grotesque leading-none">
          Notifications
        </h3>
        <div className="max-h-[60vh] overflow-y-auto space-y-3">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer bg-white rounded-xl ${
                  !notification.read ? "border-l-4 border-blue-500" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <p className="font-medium">{notification.title}</p>
                    <span className="text-[#8B8B8B] text-sm mt-1 block">
                      {notification.text}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              <Bell size={28} className="mx-auto mb-2 text-gray-300" />
              <p>No notifications yet</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  },
);

NotificationDropdown.displayName = "NotificationDropdown";
