"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import { profileApi, type UserProfile } from "@/lib/api";
import UserCard from "@/components/social/UserCard";
import BottomNav from "@/components/navigation/BottomNav";
import { Search, TrendingUp, Users, X } from "lucide-react";

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const { getToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    const debounce = setTimeout(async () => {
      setSearching(true);
      try {
        const token = await getToken();
        if (!token) return;
        const users = await profileApi.searchUsers(searchQuery, token);
        setResults(users || []);
      } catch {
        console.error("Search failed");
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, getToken]);

  return (
    <div className={`min-h-screen ${isDark ? "bg-black" : "bg-white"} pb-20`}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h1
            className={`text-2xl font-bold mb-4 ${
              isDark ? "text-white" : "text-black"
            }`}
          >
            Explore
          </h1>

          {/* Search bar */}
          <div className="relative">
            <Search
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                isDark
                  ? "bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-white/25"
                  : "bg-black/5 border-black/10 text-black placeholder-gray-400 focus:border-black/25"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded cursor-pointer ${
                  isDark
                    ? "text-gray-500 hover:text-gray-300"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {searching && (
          <div className="px-5 py-8 text-center">
            <div className="inline-block h-6 w-6 border-2 border-current border-t-transparent rounded-full animate-spin opacity-30" />
          </div>
        )}

        {!searching && results.length > 0 && (
          <div className="px-3">
            <p
              className={`px-2 py-2 text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-gray-600" : "text-gray-400"
              }`}
            >
              Results
            </p>
            {results.map((user) => (
              <UserCard key={user.id} user={user} showFollowButton />
            ))}
          </div>
        )}

        {!searching && searchQuery.length >= 2 && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Users
              className={`h-12 w-12 mb-3 ${
                isDark ? "text-gray-800" : "text-gray-200"
              }`}
            />
            <p
              className={`text-sm ${
                isDark ? "text-gray-600" : "text-gray-400"
              }`}
            >
              No users found
            </p>
          </div>
        )}

        {/* Default state: suggestions */}
        {searchQuery.length < 2 && (
          <div className="px-3 mt-2">
            {/* Suggested section */}
            <div className="px-2 pb-3">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp
                  className={`h-4 w-4 ${
                    isDark ? "text-gray-500" : "text-gray-400"
                  }`}
                />
                <span
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    isDark ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  Discover
                </span>
              </div>

              <div
                className={`rounded-2xl border p-6 text-center ${
                  isDark
                    ? "border-white/[0.06] bg-white/[0.02]"
                    : "border-black/[0.06] bg-black/[0.02]"
                }`}
              >
                <Search
                  className={`h-10 w-10 mx-auto mb-3 ${
                    isDark ? "text-gray-700" : "text-gray-300"
                  }`}
                />
                <p
                  className={`text-sm font-medium mb-1 ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Find people to follow
                </p>
                <p
                  className={`text-xs ${
                    isDark ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  Search by name or username to connect with friends
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
