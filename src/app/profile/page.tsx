"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import { profileApi } from "@/lib/api";
import type { UserProfile } from "@/lib/api";
import FollowersList from "@/components/social/FollowersList";
import ReelsGrid from "@/components/reels/ReelsGrid";
import EditProfileModal from "@/components/EditProfileModal";
import BottomNav from "@/components/navigation/BottomNav";
import Link from "next/link";
import {
  Settings,
  Edit3,
  Bookmark,
  Grid3X3,
  ExternalLink,
  BadgeCheck,
  Sun,
  Moon,
} from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState<"followers" | "following" | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"reels" | "saved">("reels");
  const [editOpen, setEditOpen] = useState(false);
  const { getToken } = useAuth();
  const { user } = useUser();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const fetchProfile = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      try {
        const data = await profileApi.getMyProfile(token);
        setProfile(data);
      } catch {
        // Profile doesn't exist yet — sync from Clerk
        if (user) {
          const synced = await profileApi.syncProfile({
            clerkId: user.id,
            displayName:
              user.fullName || user.firstName || user.username || "User",
            email: user.primaryEmailAddress?.emailAddress || "",
            avatarUrl: user.imageUrl,
          });
          setProfile(synced);
        }
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken, user]);

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
          <div
            className={`h-3 rounded w-full ${
              isDark ? "bg-white/5" : "bg-black/5"
            }`}
          />
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
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDark ? "border-white/[0.08]" : "border-black/[0.08]"
          }`}
        >
          <h1
            className={`text-xl font-bold ${
              isDark ? "text-white" : "text-black"
            }`}
          >
            {profile?.username || "Profile"}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark
                  ? "hover:bg-white/10 text-gray-400"
                  : "hover:bg-black/10 text-gray-500"
              }`}
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            <Link
              href="/settings/instagram"
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark
                  ? "hover:bg-white/10 text-gray-400"
                  : "hover:bg-black/10 text-gray-500"
              }`}
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Profile info */}
        <div className="px-5 pt-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="shrink-0">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-offset-2 ring-offset-black ring-white/20"
                />
              ) : (
                <div
                  className={`h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold ${
                    isDark ? "bg-white/10 text-white" : "bg-black/10 text-black"
                  }`}
                >
                  {profile?.displayName.charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex-1 flex items-center justify-around">
              <div className="text-center">
                <div
                  className={`text-lg font-bold ${
                    isDark ? "text-white" : "text-black"
                  }`}
                >
                  {profile?.reelCount || 0}
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
                  {profile?.followerCount || 0}
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
                  {profile?.followingCount || 0}
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
                {profile?.displayName}
              </h2>
              {profile?.isVerified && (
                <BadgeCheck className="h-4 w-4 text-blue-500" />
              )}
            </div>
            {profile?.bio ? (
              <p
                className={`text-sm mt-1 leading-relaxed whitespace-pre-line ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {profile.bio}
              </p>
            ) : (
              <p
                className={`text-sm mt-1 italic ${
                  isDark ? "text-gray-700" : "text-gray-300"
                }`}
              >
                No bio yet — tap Edit Profile to add one
              </p>
            )}
            {profile?.website && (
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

          {/* Edit button */}
          <button
            onClick={() => setEditOpen(true)}
            className={`w-full mt-4 py-2 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
              isDark
                ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
                : "border-black/15 bg-black/5 text-black hover:bg-black/10"
            }`}
          >
            <Edit3 className="h-3.5 w-3.5 inline mr-1.5" />
            Edit Profile
          </button>
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

        {/* Content grid */}
        <ReelsGrid
          userId={profile?.id}
          activeTab={activeTab}
          isDark={isDark}
          currentUserId={profile?.id}
          onReelDeleted={fetchProfile}
        />
      </div>

      {/* Followers/Following modal */}
      {showList && profile && (
        <FollowersList
          userId={profile.id}
          type={showList}
          isOpen={true}
          onClose={() => setShowList(null)}
        />
      )}

      {/* Edit Profile modal */}
      {profile && (
        <EditProfileModal
          profile={profile}
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          onUpdated={(updated) => setProfile(updated)}
        />
      )}

      <BottomNav />
    </div>
  );
}
