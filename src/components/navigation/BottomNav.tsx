"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import { notificationsApi } from "@/lib/api";
import { MessageSquare, Film, Compass, Bell, User } from "lucide-react";

const navItems = [
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/reels", icon: Film, label: "Reels" },
  { href: "/explore", icon: Compass, label: "Explore" },
  { href: "/notifications", icon: Bell, label: "Activity" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { getToken } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await notificationsApi.getUnreadCount(token);
      setUnreadCount(data?.count ?? 0);
    } catch {
      // Silently fail — badge is non-critical
    }
  }, [getToken]);

  // Fetch on mount + poll every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Clear badge when navigating to notifications
  useEffect(() => {
    if (pathname === "/notifications") {
      setUnreadCount(0);
    }
  }, [pathname]);

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl transition-colors ${
        isDark
          ? "border-white/[0.08] bg-black/80"
          : "border-black/[0.08] bg-white/80"
      }`}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const showBadge = item.href === "/notifications" && unreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-200 ${
                isActive
                  ? isDark
                    ? "text-white"
                    : "text-black"
                  : isDark
                    ? "text-gray-500 hover:text-gray-300"
                    : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <div className="relative">
                <item.icon
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isActive ? "scale-110" : ""
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "font-semibold" : ""
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
