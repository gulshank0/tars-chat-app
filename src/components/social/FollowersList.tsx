"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import { socialApi, type UserProfile } from "@/lib/api";
import UserCard from "./UserCard";
import { X, Users } from "lucide-react";

interface FollowersListProps {
  userId: string;
  type: "followers" | "following";
  isOpen: boolean;
  onClose: () => void;
}

export default function FollowersList({
  userId,
  type,
  isOpen,
  onClose,
}: FollowersListProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        const data =
          type === "followers"
            ? await socialApi.getFollowers(userId, token)
            : await socialApi.getFollowing(userId, token);
        setUsers(data || []);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [isOpen, userId, type, getToken]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md mx-4 rounded-2xl border shadow-2xl max-h-[70vh] flex flex-col ${
          isDark ? "bg-gray-950 border-white/10" : "bg-white border-black/10"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDark ? "border-white/10" : "border-black/10"
          }`}
        >
          <h2
            className={`text-lg font-bold ${
              isDark ? "text-white" : "text-black"
            }`}
          >
            {type === "followers" ? "Followers" : "Following"}
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? "hover:bg-white/10 text-gray-400"
                : "hover:bg-black/10 text-gray-500"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-3 p-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div
                    className={`h-12 w-12 rounded-full ${
                      isDark ? "bg-white/10" : "bg-black/10"
                    }`}
                  />
                  <div className="flex-1 space-y-2">
                    <div
                      className={`h-3 rounded w-24 ${
                        isDark ? "bg-white/10" : "bg-black/10"
                      }`}
                    />
                    <div
                      className={`h-2.5 rounded w-16 ${
                        isDark ? "bg-white/5" : "bg-black/5"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users
                className={`h-12 w-12 mb-3 ${
                  isDark ? "text-gray-700" : "text-gray-300"
                }`}
              />
              <p
                className={`text-sm ${
                  isDark ? "text-gray-500" : "text-gray-500"
                }`}
              >
                {type === "followers"
                  ? "No followers yet"
                  : "Not following anyone yet"}
              </p>
            </div>
          ) : (
            users.map((user) => (
              <UserCard key={user.id} user={user} showFollowButton={true} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
