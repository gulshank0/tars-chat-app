"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import { profileApi } from "@/lib/api";
import type { ProfileResponse } from "@/lib/api";
import FollowButton from "@/components/social/FollowButton";
import FollowersList from "@/components/social/FollowersList";
import BottomNav from "@/components/navigation/BottomNav";
import {
  ArrowLeft,
  Film,
  Bookmark,
  Grid3X3,
  ExternalLink,
  BadgeCheck,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState<"followers" | "following" | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"reels" | "saved">("reels");
  const { getToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const fetchProfile = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await profileApi.getUserProfile(
        username,
        token || undefined,
      );
      setProfile(data);
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }, [username, getToken]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-black" : "bg-white"} pb-20`}>
        <div className="max-w-lg mx-auto p-6 animate-pulse space-y-6">
          <div className="flex items-center gap-6">
            <div
              className={`h-20 w-20 rounded-full ${
                isDark ? "bg-white/10" : "bg-black/10"
              }`}
            />
            <div className="flex-1 space-y-3">
              <div
                className={`h-4 rounded w-32 ${
                  isDark ? "bg-white/10" : "bg-black/10"
                }`}
              />
              <div
                className={`h-3 rounded w-20 ${
                  isDark ? "bg-white/5" : "bg-black/5"
                }`}
              />
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark ? "bg-black text-white" : "bg-white text-black"
        }`}
      >
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">User not found</p>
          <Link
            href="/explore"
            className="text-sm text-blue-500 hover:text-blue-400"
          >
            ← Back to Explore
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-black" : "bg-white"} pb-20`}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div
          className={`flex items-center gap-3 px-5 py-4 border-b ${
            isDark ? "border-white/[0.08]" : "border-black/[0.08]"
          }`}
        >
          <Link
            href="/explore"
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? "hover:bg-white/10 text-gray-400"
                : "hover:bg-black/10 text-gray-500"
            }`}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1
            className={`text-xl font-bold ${
              isDark ? "text-white" : "text-black"
            }`}
          >
            {profile.username}
          </h1>
        </div>

        {/* Profile info */}
        <div className="px-5 pt-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="h-20 w-20 rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className={`h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold shrink-0 ${
                  isDark ? "bg-white/10 text-white" : "bg-black/10 text-black"
                }`}
              >
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Stats */}
            <div className="flex-1 flex items-center justify-around">
              <div className="text-center">
                <div
                  className={`text-lg font-bold ${
                    isDark ? "text-white" : "text-black"
                  }`}
                >
                  {profile.reelCount}
                </div>
                <div
                  className={`text-xs ${
                    isDark ? "text-gray-500" : "text-gray-500"
                  }`}
                >
                  Reels
                </div>
              </div>
              <button
                onClick={() => setShowList("followers")}
                className="text-center cursor-pointer"
              >
                <div
                  className={`text-lg font-bold ${
                    isDark ? "text-white" : "text-black"
                  }`}
                >
                  {profile.followerCount}
                </div>
                <div
                  className={`text-xs ${
                    isDark ? "text-gray-500" : "text-gray-500"
                  }`}
                >
                  Followers
                </div>
              </button>
              <button
                onClick={() => setShowList("following")}
                className="text-center cursor-pointer"
              >
                <div
                  className={`text-lg font-bold ${
                    isDark ? "text-white" : "text-black"
                  }`}
                >
                  {profile.followingCount}
                </div>
                <div
                  className={`text-xs ${
                    isDark ? "text-gray-500" : "text-gray-500"
                  }`}
                >
                  Following
                </div>
              </button>
            </div>
          </div>

          {/* Name + Bio */}
          <div className="mt-4">
            <div className="flex items-center gap-1.5">
              <h2
                className={`font-bold ${isDark ? "text-white" : "text-black"}`}
              >
                {profile.displayName}
              </h2>
              {profile.isVerified && (
                <BadgeCheck className="h-4 w-4 text-blue-500" />
              )}
            </div>
            {profile.bio && (
              <p
                className={`text-sm mt-1 ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {profile.bio}
              </p>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-400 mt-1"
              >
                <ExternalLink className="h-3 w-3" />
                {profile.website.replace(/https?:\/\//, "")}
              </a>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <FollowButton
              userId={profile.id}
              initialIsFollowing={profile.isFollowing}
              size="lg"
              onFollowChange={(following) =>
                setProfile((p) =>
                  p
                    ? {
                        ...p,
                        followerCount: p.followerCount + (following ? 1 : -1),
                        isFollowing: following,
                      }
                    : p,
                )
              }
            />
            <Link
              href="/chat"
              className={`inline-flex items-center gap-1.5 px-6 py-2 rounded-xl border text-base font-semibold transition-colors ${
                isDark
                  ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
                  : "border-black/15 bg-black/5 text-black hover:bg-black/10"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Message
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div
          className={`flex mt-6 border-b ${
            isDark ? "border-white/[0.08]" : "border-black/[0.08]"
          }`}
        >
          <button
            onClick={() => setActiveTab("reels")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === "reels"
                ? isDark
                  ? "text-white border-b-2 border-white"
                  : "text-black border-b-2 border-black"
                : isDark
                  ? "text-gray-600"
                  : "text-gray-400"
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
            Reels
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === "saved"
                ? isDark
                  ? "text-white border-b-2 border-white"
                  : "text-black border-b-2 border-black"
                : isDark
                  ? "text-gray-600"
                  : "text-gray-400"
            }`}
          >
            <Bookmark className="h-4 w-4" />
            Saved
          </button>
        </div>

        {/* Content */}
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
              No reels yet
            </p>
          </div>
        </div>
      </div>

      {showList && (
        <FollowersList
          userId={profile.id}
          type={showList}
          isOpen={true}
          onClose={() => setShowList(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}
