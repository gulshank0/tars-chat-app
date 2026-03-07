"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { reelsApi, type ReelFeedItem } from "@/lib/api";
import { Film, Play, Eye } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface ReelsGridProps {
  readonly userId?: string;
  readonly activeTab: "reels" | "saved";
  readonly isDark: boolean;
}

function formatCount(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default function ReelsGrid({
  userId,
  activeTab,
  isDark,
}: ReelsGridProps) {
  const [reels, setReels] = useState<ReelFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  const fetchReels = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const data = await reelsApi.getUserReels(userId, token);
      setReels(data || []);
    } catch {
      console.error("Failed to fetch reels");
    } finally {
      setLoading(false);
    }
  }, [userId, getToken]);

  useEffect(() => {
    if (activeTab === "reels") {
      fetchReels();
    }
  }, [activeTab, fetchReels]);

  if (loading && activeTab === "reels") {
    return (
      <div className="p-2">
        <div className="grid grid-cols-3 gap-0.5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`aspect-[9/16] rounded-sm animate-pulse ${
                isDark ? "bg-white/5" : "bg-black/5"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === "saved") {
    return (
      <div className="p-2">
        <div className="flex flex-col items-center justify-center py-16">
          <Film
            className={`h-16 w-16 mb-4 ${
              isDark ? "text-gray-800" : "text-gray-200"
            }`}
          />
          <p
            className={`text-sm font-medium ${
              isDark ? "text-gray-600" : "text-gray-400"
            }`}
          >
            No saved reels yet
          </p>
        </div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="p-2">
        <div className="flex flex-col items-center justify-center py-16">
          <Film
            className={`h-16 w-16 mb-4 ${
              isDark ? "text-gray-800" : "text-gray-200"
            }`}
          />
          <p
            className={`text-sm font-medium ${
              isDark ? "text-gray-600" : "text-gray-400"
            }`}
          >
            No reels yet — create your first!
          </p>
          <Link
            href="/reels/create"
            className={`mt-4 px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 ${
              isDark ? "bg-white text-black" : "bg-black text-white"
            }`}
          >
            Create Reel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0.5">
      <div className="grid grid-cols-3 gap-0.5">
        {reels.map((reel) => {
          const thumbUrl = reel.thumbnailUrl
            ? reel.thumbnailUrl.startsWith("http")
              ? reel.thumbnailUrl
              : `${API_BASE}${reel.thumbnailUrl}`
            : null;

          return (
            <Link
              key={reel.id}
              href="/reels/player"
              className="relative aspect-[9/16] bg-black rounded-sm overflow-hidden group"
            >
              {/* Thumbnail or video fallback */}
              {thumbUrl ? (
                <img
                  src={thumbUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={
                    reel.videoUrl.startsWith("http")
                      ? reel.videoUrl
                      : `${API_BASE}${reel.videoUrl}`
                  }
                  muted
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity fill-white" />
              </div>

              {/* View count bottom-left */}
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                <Eye className="h-3 w-3 text-white drop-shadow" />
                <span className="text-white text-xs font-medium drop-shadow">
                  {formatCount(reel.viewCount)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
