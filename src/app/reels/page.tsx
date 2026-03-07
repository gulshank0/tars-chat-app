"use client";

import BottomNav from "@/components/navigation/BottomNav";
import { useTheme } from "@/context/ThemeContext";
import { Film, Plus, Play, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function ReelsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className={`min-h-screen ${isDark ? "bg-black" : "bg-white"} pb-20`}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDark ? "border-white/10" : "border-black/10"
          }`}
        >
          <h1
            className={`text-2xl font-bold ${
              isDark ? "text-white" : "text-black"
            }`}
          >
            Reels
          </h1>
          <Link
            href="/reels/create"
            className={`p-2 rounded-xl transition-colors ${
              isDark
                ? "hover:bg-white/10 text-gray-400"
                : "hover:bg-black/10 text-gray-500"
            }`}
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>

        {/* Actions */}
        <div className="p-5 space-y-4">
          {/* Watch feed */}
          <Link
            href="/reels/player"
            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isDark
                ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                : "border-black/10 bg-black/[0.03] hover:bg-black/[0.06]"
            }`}
          >
            <div
              className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                isDark ? "bg-white/10" : "bg-black/10"
              }`}
            >
              <Play
                className={`h-7 w-7 ml-0.5 ${
                  isDark ? "text-white" : "text-black"
                }`}
              />
            </div>
            <div className="flex-1">
              <p
                className={`font-semibold ${
                  isDark ? "text-white" : "text-black"
                }`}
              >
                Watch Reels
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  isDark ? "text-gray-500" : "text-gray-500"
                }`}
              >
                Swipe through your personalized feed
              </p>
            </div>
          </Link>

          {/* Create */}
          <Link
            href="/reels/create"
            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isDark
                ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                : "border-black/10 bg-black/[0.03] hover:bg-black/[0.06]"
            }`}
          >
            <div
              className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                isDark ? "bg-white/10" : "bg-black/10"
              }`}
            >
              <Film
                className={`h-7 w-7 ${isDark ? "text-white" : "text-black"}`}
              />
            </div>
            <div className="flex-1">
              <p
                className={`font-semibold ${
                  isDark ? "text-white" : "text-black"
                }`}
              >
                Create Reel
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  isDark ? "text-gray-500" : "text-gray-500"
                }`}
              >
                Upload a video and share with your followers
              </p>
            </div>
          </Link>

          {/* Trending */}
          <Link
            href="/reels/player"
            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isDark
                ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                : "border-black/10 bg-black/[0.03] hover:bg-black/[0.06]"
            }`}
          >
            <div
              className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                isDark ? "bg-white/10" : "bg-black/10"
              }`}
            >
              <TrendingUp
                className={`h-7 w-7 ${isDark ? "text-white" : "text-black"}`}
              />
            </div>
            <div className="flex-1">
              <p
                className={`font-semibold ${
                  isDark ? "text-white" : "text-black"
                }`}
              >
                Trending
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  isDark ? "text-gray-500" : "text-gray-500"
                }`}
              >
                See what&apos;s popular right now
              </p>
            </div>
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
