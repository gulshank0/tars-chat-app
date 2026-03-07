"use client";

import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import FollowButton from "./FollowButton";
import type { UserProfile } from "@/lib/api";
import { BadgeCheck } from "lucide-react";

interface UserCardProps {
  user: UserProfile;
  isFollowing?: boolean;
  showFollowButton?: boolean;
  currentUserId?: string;
}

export default function UserCard({
  user,
  isFollowing = false,
  showFollowButton = true,
  currentUserId,
}: UserCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isSelf = currentUserId === user.id;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-2xl transition-colors duration-200 ${
        isDark ? "hover:bg-white/5" : "hover:bg-black/5"
      }`}
    >
      {/* Avatar */}
      <Link href={`/profile/${user.username}`} className="shrink-0">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold ${
              isDark ? "bg-white/10 text-white" : "bg-black/10 text-black"
            }`}
          >
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </Link>

      {/* Info */}
      <Link href={`/profile/${user.username}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span
            className={`font-semibold text-sm truncate ${
              isDark ? "text-white" : "text-black"
            }`}
          >
            {user.displayName}
          </span>
          {user.isVerified && (
            <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          )}
        </div>
        <span
          className={`text-xs truncate block ${
            isDark ? "text-gray-500" : "text-gray-500"
          }`}
        >
          @{user.username}
        </span>
      </Link>

      {/* Follow button */}
      {showFollowButton && !isSelf && (
        <FollowButton
          userId={user.id}
          initialIsFollowing={isFollowing}
          size="sm"
        />
      )}
    </div>
  );
}
