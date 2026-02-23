"use client";

import Image from "next/image";
import { Doc } from "../../convex/_generated/dataModel";

interface UserAvatarProps {
  user: Doc<"users"> | null | undefined;
  size?: "sm" | "md" | "lg";
  showOnlineStatus?: boolean;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

const textSizes = {
  sm: "text-xs",
  md: "text-base",
  lg: "text-xl",
};

export function UserAvatar({ user, size = "md", showOnlineStatus = false }: UserAvatarProps) {
  const sizeClass = sizeClasses[size];
  const textSize = textSizes[size];

  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Generate color from name
  const getColorFromName = (name: string) => {
    const colors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-amber-500",
      "bg-yellow-500",
      "bg-lime-500",
      "bg-green-500",
      "bg-emerald-500",
      "bg-teal-500",
      "bg-cyan-500",
      "bg-sky-500",
      "bg-blue-500",
      "bg-indigo-500",
      "bg-violet-500",
      "bg-purple-500",
      "bg-fuchsia-500",
      "bg-pink-500",
      "bg-rose-500",
    ];
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (!user) {
    return (
      <div className={`${sizeClass} flex items-center justify-center rounded-full bg-gray-300`}>
        <span className={`${textSize} font-medium text-white`}>?</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {user.imageUrl ? (
        <Image
          src={user.imageUrl}
          alt={user.name}
          width={48}
          height={48}
          className={`${sizeClass} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizeClass} ${getColorFromName(user.name)} flex items-center justify-center rounded-full`}
        >
          <span className={`${textSize} font-medium text-white`}>{getInitials(user.name)}</span>
        </div>
      )}
      {showOnlineStatus && user.isOnline && (
        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
      )}
    </div>
  );
}
