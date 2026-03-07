"use client";

import { useTheme } from "@/context/ThemeContext";
import type { ReelFeedItem } from "@/lib/api";
import { Play, Eye, Heart } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface TrendingReelCardProps {
  readonly reel: ReelFeedItem;
}

function formatCount(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default function TrendingReelCard({ reel }: TrendingReelCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const thumbUrl = reel.thumbnailUrl
    ? reel.thumbnailUrl.startsWith("http")
      ? reel.thumbnailUrl
      : `${API_BASE}${reel.thumbnailUrl}`
    : null;

  const videoUrl = reel.videoUrl.startsWith("http")
    ? reel.videoUrl
    : `${API_BASE}${reel.videoUrl}`;

  return (
    <Link
      href="/reels/player"
      className={`block rounded-2xl overflow-hidden border transition-all hover:scale-[1.02] active:scale-[0.98] ${
        isDark
          ? "border-white/10 bg-white/[0.03]"
          : "border-black/10 bg-black/[0.03]"
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[9/14]">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <video
            src={videoUrl}
            muted
            preload="metadata"
            className="w-full h-full object-cover"
          />
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="h-5 w-5 text-white fill-white ml-0.5" />
          </div>
        </div>

        {/* Stats */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3 text-white drop-shadow" />
            <span className="text-white text-xs font-medium drop-shadow">
              {formatCount(reel.viewCount)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="h-3 w-3 text-white drop-shadow" />
            <span className="text-white text-xs font-medium drop-shadow">
              {formatCount(reel.likeCount)}
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        {reel.caption && (
          <p
            className={`text-xs font-medium line-clamp-2 ${
              isDark ? "text-gray-300" : "text-gray-700"
            }`}
          >
            {reel.caption}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          {reel.creator?.avatarUrl ? (
            <img
              src={reel.creator.avatarUrl}
              alt=""
              className="h-4 w-4 rounded-full object-cover"
            />
          ) : (
            <div
              className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                isDark ? "bg-white/10 text-white" : "bg-black/10 text-black"
              }`}
            >
              {reel.creator?.displayName?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
          <span
            className={`text-xs truncate ${
              isDark ? "text-gray-500" : "text-gray-500"
            }`}
          >
            {reel.creator?.displayName || "Unknown"}
          </span>
        </div>
      </div>
    </Link>
  );
}
