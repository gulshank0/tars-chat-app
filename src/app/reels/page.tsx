"use client";

import BottomNav from "@/components/navigation/BottomNav";
import { useTheme } from "@/context/ThemeContext";
import { Film, Plus } from "lucide-react";
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
            isDark ? "border-white/[0.08]" : "border-black/[0.08]"
          }`}
        >
          <h1
            className={`text-2xl font-bold ${
              isDark ? "text-white" : "text-black"
            }`}
          >
            Reels
          </h1>
          <button
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark
                ? "hover:bg-white/10 text-gray-400"
                : "hover:bg-black/10 text-gray-500"
            }`}
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Placeholder */}
        <div className="flex flex-col items-center justify-center py-24">
          <div
            className={`h-24 w-24 rounded-3xl flex items-center justify-center mb-6 ${
              isDark ? "bg-white/5" : "bg-black/5"
            }`}
          >
            <Film
              className={`h-12 w-12 ${
                isDark ? "text-gray-700" : "text-gray-300"
              }`}
            />
          </div>
          <h2
            className={`text-lg font-bold mb-2 ${
              isDark ? "text-white" : "text-black"
            }`}
          >
            Reels coming soon
          </h2>
          <p
            className={`text-sm text-center max-w-xs ${
              isDark ? "text-gray-600" : "text-gray-400"
            }`}
          >
            Short-form video will be here once the video pipeline is set up in
            Phase 3.
          </p>
          <Link
            href="/explore"
            className={`mt-6 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95 ${
              isDark
                ? "bg-white text-black hover:bg-gray-200"
                : "bg-black text-white hover:bg-gray-800"
            }`}
          >
            Explore People Instead
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
