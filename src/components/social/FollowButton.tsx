"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import { socialApi } from "@/lib/api";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";

interface FollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  size?: "sm" | "md" | "lg";
}

export default function FollowButton({
  userId,
  initialIsFollowing,
  onFollowChange,
  size = "md",
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const { getToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      if (isFollowing) {
        await socialApi.unfollow(userId, token);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await socialApi.follow(userId, token);
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (err) {
      console.error("Follow action failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-1.5 text-sm",
    lg: "px-6 py-2 text-base",
  };

  if (isFollowing) {
    return (
      <button
        onClick={handleToggle}
        disabled={isLoading}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={`inline-flex items-center gap-1.5 font-semibold rounded-xl border transition-all duration-200 cursor-pointer disabled:opacity-50 ${sizeClasses[size]} ${
          isHovering
            ? "border-red-500/50 bg-red-500/10 text-red-500"
            : isDark
              ? "border-white/20 bg-white/5 text-white"
              : "border-black/20 bg-black/5 text-black"
        }`}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isHovering ? (
          <>
            <UserPlus className="h-3.5 w-3.5" />
            Unfollow
          </>
        ) : (
          <>
            <UserCheck className="h-3.5 w-3.5" />
            Following
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`inline-flex items-center gap-1.5 font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 ${sizeClasses[size]} ${
        isDark
          ? "bg-white text-black hover:bg-gray-200"
          : "bg-black text-white hover:bg-gray-800"
      }`}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5" />
          Follow
        </>
      )}
    </button>
  );
}
