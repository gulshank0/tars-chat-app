"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import { notificationsApi, type NotificationItem } from "@/lib/api";
import BottomNav from "@/components/navigation/BottomNav";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  UserPlus,
  Film,
  Bell,
  CheckCheck,
} from "lucide-react";

const notifIcons: Record<string, typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  reel_share: Film,
  mention: MessageCircle,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await notificationsApi.getNotifications(token);
      setNotifications(data || []);
    } catch {
      console.error("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      await notificationsApi.markAsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      console.error("Failed to mark as read");
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-black" : "bg-white"} pb-20`}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDark ? "border-white/[0.08]" : "border-black/[0.08]"
          }`}
        >
          <h1
            className={`text-2xl font-bold ${
              isDark ? "text-white" : "text-black"
            }`}
          >
            Activity
          </h1>
          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={markAllRead}
              className={`flex items-center gap-1 text-xs font-medium cursor-pointer ${
                isDark ? "text-blue-400" : "text-blue-600"
              }`}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        {loading ? (
          <div className="p-5 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div
                  className={`h-10 w-10 rounded-full ${
                    isDark ? "bg-white/10" : "bg-black/10"
                  }`}
                />
                <div className="flex-1 space-y-2">
                  <div
                    className={`h-3 rounded w-3/4 ${
                      isDark ? "bg-white/10" : "bg-black/10"
                    }`}
                  />
                  <div
                    className={`h-2.5 rounded w-1/3 ${
                      isDark ? "bg-white/5" : "bg-black/5"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell
              className={`h-16 w-16 mb-4 ${
                isDark ? "text-gray-800" : "text-gray-200"
              }`}
            />
            <p
              className={`text-sm font-medium ${
                isDark ? "text-gray-600" : "text-gray-400"
              }`}
            >
              No notifications yet
            </p>
            <p
              className={`text-xs mt-1 ${
                isDark ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Activity from your followers will show up here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((notif) => {
              const Icon = notifIcons[notif.type] || Bell;
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 px-5 py-3.5 transition-colors ${
                    !notif.isRead
                      ? isDark
                        ? "bg-white/[0.03]"
                        : "bg-blue-50/50"
                      : ""
                  }`}
                >
                  {/* Actor avatar */}
                  <Link
                    href={
                      notif.actor ? `/profile/${notif.actor.username}` : "#"
                    }
                    className="shrink-0"
                  >
                    {notif.actor?.avatarUrl ? (
                      <img
                        src={notif.actor.avatarUrl}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          isDark
                            ? "bg-white/10 text-white"
                            : "bg-black/10 text-black"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                    )}
                  </Link>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      <span className="font-semibold">
                        {notif.actor?.displayName || "Someone"}
                      </span>{" "}
                      {notif.type === "like" && "liked your reel"}
                      {notif.type === "comment" && "commented on your reel"}
                      {notif.type === "follow" && "started following you"}
                      {notif.type === "reel_share" && "shared a reel with you"}
                      {notif.type === "mention" && "mentioned you"}
                    </p>
                    <span
                      className={`text-xs ${
                        isDark ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <div className="mt-2 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
