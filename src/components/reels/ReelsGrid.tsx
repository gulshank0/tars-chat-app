"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { reelsApi, type ReelFeedItem } from "@/lib/api";
import { Film, Play, Eye, Trash2, X } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface ReelsGridProps {
  readonly userId?: string;
  readonly activeTab: "reels" | "saved";
  readonly isDark: boolean;
  readonly currentUserId?: string; // to show delete button for own reels
  readonly onReelDeleted?: () => void;
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
  currentUserId,
  onReelDeleted,
}: ReelsGridProps) {
  const [reels, setReels] = useState<ReelFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
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

  const handleDelete = async (reelId: string) => {
    setDeletingId(reelId);
    try {
      const token = await getToken();
      if (!token) return;
      await reelsApi.delete(reelId, token);
      setReels((prev) => prev.filter((r) => r.id !== reelId));
      onReelDeleted?.();
    } catch {
      console.error("Failed to delete reel");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

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
      {/* Delete confirmation overlay */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg rounded-t-3xl p-6 ${
              isDark ? "bg-[#111]" : "bg-white"
            }`}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <h3
                className={`text-lg font-bold ${isDark ? "text-white" : "text-black"}`}
              >
                Delete Reel?
              </h3>
            </div>
            <p
              className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              This will permanently remove your reel. This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                  isDark
                    ? "border-white/15 text-white hover:bg-white/5"
                    : "border-black/15 text-black hover:bg-black/5"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmId)}
                disabled={deletingId === confirmId}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-60"
              >
                {deletingId === confirmId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-0.5">
        {reels.map((reel) => {
          const thumbUrl = reel.thumbnailUrl
            ? reel.thumbnailUrl.startsWith("http")
              ? reel.thumbnailUrl
              : `${API_BASE}${reel.thumbnailUrl}`
            : null;
          const isOwner = currentUserId && reel.creatorId === currentUserId;

          return (
            <div
              key={reel.id}
              className="relative aspect-[9/16] bg-black rounded-sm overflow-hidden group"
            >
              <Link href="/reels/player" className="absolute inset-0">
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

              {/* Delete button — shows on hover/tap for owner */}
              {isOwner && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmId(reel.id);
                  }}
                  className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/70 cursor-pointer"
                  title="Delete reel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
