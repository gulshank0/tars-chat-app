"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useTheme } from "@/context/ThemeContext";
import { reelsApi, type ReelFeedItem } from "@/lib/api";
import ReelComments from "@/components/reels/ReelComments";
import ShareReelModal from "@/components/reels/ShareReelModal";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Music2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  BadgeCheck,
  Film,
} from "lucide-react";
import Link from "next/link";

interface ReelCardProps {
  reel: ReelFeedItem;
  isActive: boolean;
  onOpenComments: () => void;
  onOpenShare: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function ReelCard({
  reel,
  isActive,
  onOpenComments,
  onOpenShare,
}: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(reel.isLiked);
  const [isSaved, setIsSaved] = useState(reel.isSaved);
  const [likeCount, setLikeCount] = useState(reel.likeCount);
  const [showPlayPause, setShowPlayPause] = useState(false);
  const [progress, setProgress] = useState(0);
  const { getToken } = useAuth();

  const viewStartRef = useRef<number>(0);
  const viewRecordedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);

    if (isActive) {
      video.play().catch(() => {});
      viewStartRef.current = Date.now();
      viewRecordedRef.current = false;
    } else {
      video.pause();
      video.currentTime = 0;
      setProgress(0);

      if (viewStartRef.current && !viewRecordedRef.current) {
        const watchDuration = Date.now() - viewStartRef.current;
        const completed =
          video.duration > 0 && video.currentTime / video.duration >= 0.9;
        recordView(watchDuration, completed);
      }
    }

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const recordView = async (watchDuration: number, completed: boolean) => {
    if (viewRecordedRef.current) return;
    viewRecordedRef.current = true;
    try {
      const token = await getToken();
      if (!token) return;
      await reelsApi.recordView(reel.id, watchDuration, completed, token);
    } catch {
      // Silently fail
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }

    setShowPlayPause(true);
    setTimeout(() => setShowPlayPause(false), 600);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(!isMuted);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = await getToken();
      if (!token) return;
      if (isLiked) {
        await reelsApi.unlike(reel.id, token);
        setLikeCount((c) => c - 1);
      } else {
        await reelsApi.like(reel.id, token);
        setLikeCount((c) => c + 1);
      }
      setIsLiked(!isLiked);
    } catch {
      console.error("Like failed");
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = await getToken();
      if (!token) return;
      if (isSaved) {
        await reelsApi.unsave(reel.id, token);
      } else {
        await reelsApi.save(reel.id, token);
      }
      setIsSaved(!isSaved);
    } catch {
      console.error("Save failed");
    }
  };

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const videoUrl = reel.videoUrl.startsWith("http")
    ? reel.videoUrl
    : `${API_BASE}${reel.videoUrl}`;

  return (
    <div className="reel-card">
      {/* Video */}
      <video
        ref={videoRef}
        src={videoUrl}
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
        onClick={togglePlay}
        className="reel-video"
      />

      {/* Progress bar */}
      <div className="reel-progress">
        <div className="reel-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Play/Pause overlay */}
      {showPlayPause && (
        <div className="reel-play-overlay">
          <div className="reel-play-icon">
            {isPlaying ? (
              <Play className="reel-play-svg" />
            ) : (
              <Pause className="reel-play-svg" />
            )}
          </div>
        </div>
      )}

      {/* Bottom gradient */}
      <div className="reel-gradient" />

      {/* Bottom info */}
      <div className="reel-info">
        {/* Creator */}
        <Link
          href={`/profile/${reel.creator?.username || ""}`}
          className="reel-creator"
        >
          {reel.creator?.avatarUrl ? (
            <img src={reel.creator.avatarUrl} alt="" className="reel-avatar" />
          ) : (
            <div className="reel-avatar-fallback">
              {reel.creator?.displayName?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
          <div>
            <div className="reel-creator-name">
              <span>{reel.creator?.displayName || "Unknown"}</span>
              {reel.creator?.isVerified && (
                <BadgeCheck className="reel-verified" />
              )}
            </div>
            <span className="reel-username">
              @{reel.creator?.username || "unknown"}
            </span>
          </div>
        </Link>

        {/* Caption */}
        {reel.caption && <p className="reel-caption">{reel.caption}</p>}

        {/* Hashtags */}
        {reel.hashtags && reel.hashtags.length > 0 && (
          <div className="reel-hashtags">
            {reel.hashtags.map((tag) => (
              <span key={tag} className="reel-tag">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Audio */}
        <div className="reel-audio">
          <Music2 className="reel-audio-icon" />
          <span className="reel-audio-text">Original Audio</span>
        </div>
      </div>

      {/* Right side action buttons */}
      <div className="reel-actions">
        {/* Like */}
        <button onClick={handleLike} className="reel-action-btn">
          <Heart
            className={`reel-action-icon ${
              isLiked ? "text-red-500 fill-red-500" : "text-white"
            }`}
          />
          <span className="reel-action-label">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenComments();
          }}
          className="reel-action-btn"
        >
          <MessageCircle className="reel-action-icon text-white" />
          <span className="reel-action-label">
            {formatCount(reel.commentCount)}
          </span>
        </button>

        {/* Save */}
        <button onClick={handleSave} className="reel-action-btn">
          <Bookmark
            className={`reel-action-icon ${
              isSaved ? "text-yellow-400 fill-yellow-400" : "text-white"
            }`}
          />
          <span className="reel-action-label">
            {formatCount(reel.saveCount)}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenShare();
          }}
          className="reel-action-btn"
        >
          <Share2 className="reel-action-icon text-white" />
          <span className="reel-action-label">Share</span>
        </button>

        {/* Mute toggle */}
        <button onClick={toggleMute} className="reel-mute-btn">
          {isMuted ? (
            <VolumeX className="reel-mute-icon" />
          ) : (
            <Volume2 className="reel-mute-icon" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function ReelsPlayerPage() {
  const [reels, setReels] = useState<ReelFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {},
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const { getToken } = useAuth();
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getCurrentUser,
    user?.id ? { clerkId: user.id } : "skip",
  );
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const fetchReels = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await reelsApi.getFeed(token);
      setReels(data.reels || []);
      const counts: Record<string, number> = {};
      (data.reels || []).forEach((r: ReelFeedItem) => {
        counts[r.id] = r.commentCount;
      });
      setCommentCounts(counts);
    } catch {
      console.error("Failed to fetch reels");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.7 },
    );

    const items = container.querySelectorAll("[data-index]");
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [reels]);

  const activeReel = reels[activeIndex];

  if (loading) {
    return (
      <div
        className={`h-dvh flex items-center justify-center ${
          isDark ? "bg-black" : "bg-white"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading reels...</p>
        </div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div
        className={`h-dvh flex items-center justify-center ${
          isDark ? "bg-black" : "bg-white"
        }`}
      >
        <div className="text-center p-8">
          <Film
            className={`h-16 w-16 mx-auto mb-4 ${
              isDark ? "text-gray-700" : "text-gray-300"
            }`}
          />
          <h2
            className={`text-lg font-bold mb-2 ${
              isDark ? "text-white" : "text-black"
            }`}
          >
            No reels yet
          </h2>
          <p
            className={`text-sm mb-6 ${
              isDark ? "text-gray-500" : "text-gray-500"
            }`}
          >
            Be the first to share a video!
          </p>
          <Link
            href="/reels/create"
            className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95 ${
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
    <>
      <div ref={containerRef} className="reels-container">
        {reels.map((reel, index) => (
          <div key={reel.id} data-index={index} className="reels-slide">
            <ReelCard
              reel={reel}
              isActive={index === activeIndex}
              onOpenComments={() => setCommentsOpen(true)}
              onOpenShare={() => setShareOpen(true)}
            />
          </div>
        ))}
      </div>

      {/* Comments Bottom Sheet */}
      {activeReel && (
        <ReelComments
          reelId={activeReel.id}
          commentCount={commentCounts[activeReel.id] ?? activeReel.commentCount}
          isOpen={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          onCommentAdded={() => {
            setCommentCounts((prev) => ({
              ...prev,
              [activeReel.id]:
                (prev[activeReel.id] ?? activeReel.commentCount) + 1,
            }));
          }}
        />
      )}

      {/* Share Modal */}
      {activeReel && (
        <ShareReelModal
          reel={activeReel}
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          convexUserId={convexUser?._id ?? null}
        />
      )}
    </>
  );
}
