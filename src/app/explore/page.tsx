"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import {
  profileApi,
  reelsApi,
  type UserProfile,
  type ReelFeedItem,
  type HashtagItem,
} from "@/lib/api";
import UserCard from "@/components/social/UserCard";
import TrendingReelCard from "@/components/reels/TrendingReelCard";
import BottomNav from "@/components/navigation/BottomNav";
import {
  Search,
  TrendingUp,
  Users,
  X,
  Hash,
  Flame,
  Loader2,
} from "lucide-react";

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [hashtagResults, setHashtagResults] = useState<ReelFeedItem[]>([]);
  const [trendingReels, setTrendingReels] = useState<ReelFeedItem[]>([]);
  const [popularHashtags, setPopularHashtags] = useState<HashtagItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const { getToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const isHashtagSearch = searchQuery.startsWith("#") && searchQuery.length > 1;

  // Fetch trending reels on mount
  const fetchTrending = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await reelsApi.getTrending(token);
      setTrendingReels(data || []);
    } catch {
      console.error("Failed to fetch trending");
    } finally {
      setLoadingTrending(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  // Fetch popular hashtags on mount
  useEffect(() => {
    const fetchHashtags = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const data = await reelsApi.getPopularHashtags(token);
        setPopularHashtags(data || []);
      } catch {
        console.error("Failed to fetch hashtags");
      }
    };
    fetchHashtags();
  }, [getToken]);

  // Search users or hashtags
  useEffect(() => {
    if (searchQuery.length < 2) {
      setUserResults([]);
      setHashtagResults([]);
      return;
    }

    const debounce = setTimeout(async () => {
      setSearching(true);
      try {
        const token = await getToken();
        if (!token) return;

        if (isHashtagSearch) {
          const tag = searchQuery.slice(1);
          const reels = await reelsApi.searchByHashtag(tag, token);
          setHashtagResults(reels || []);
          setUserResults([]);
        } else {
          const users = await profileApi.searchUsers(searchQuery, token);
          setUserResults(users || []);
          setHashtagResults([]);
        }
      } catch {
        console.error("Search failed");
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, getToken, isHashtagSearch]);

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
              placeholder="Search people or #hashtags..."
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

        {/* Search Results */}
        {searching && (
          <div className="px-5 py-8 text-center">
            <Loader2
              className={`inline-block h-6 w-6 animate-spin ${
                isDark ? "text-gray-600" : "text-gray-300"
              }`}
            />
          </div>
        )}

        {/* User results */}
        {!searching && userResults.length > 0 && (
          <div className="px-3">
            <p
              className={`px-2 py-2 text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-gray-600" : "text-gray-400"
              }`}
            >
              <Users className="inline h-3.5 w-3.5 mr-1" />
              People
            </p>
            {userResults.map((user) => (
              <UserCard key={user.id} user={user} showFollowButton />
            ))}
          </div>
        )}

        {/* Hashtag results */}
        {!searching && hashtagResults.length > 0 && (
          <div className="px-4">
            <p
              className={`py-2 text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-gray-600" : "text-gray-400"
              }`}
            >
              <Hash className="inline h-3.5 w-3.5 mr-1" />
              Reels for {searchQuery}
            </p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {hashtagResults.map((reel) => (
                <TrendingReelCard key={reel.id} reel={reel} />
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {!searching &&
          searchQuery.length >= 2 &&
          userResults.length === 0 &&
          hashtagResults.length === 0 && (
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
                No results found
              </p>
            </div>
          )}

        {/* Default state: Popular Hashtags + Trending Reels */}
        {searchQuery.length < 2 && (
          <div className="px-4 mt-2">
            {/* Popular Hashtags */}
            {popularHashtags.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Hash
                    className={`h-4 w-4 ${
                      isDark ? "text-purple-400" : "text-purple-500"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Popular Hashtags
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularHashtags.map((ht) => (
                    <button
                      key={ht.id}
                      onClick={() => setSearchQuery(`#${ht.tag}`)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        isDark
                          ? "bg-white/[0.06] text-gray-300 hover:bg-white/[0.12] border border-white/[0.08]"
                          : "bg-black/[0.04] text-gray-700 hover:bg-black/[0.08] border border-black/[0.06]"
                      }`}
                    >
                      #{ht.tag}
                      <span
                        className={`ml-1.5 ${
                          isDark ? "text-gray-600" : "text-gray-400"
                        }`}
                      >
                        {ht.reelCount}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Reels */}
            <div className="flex items-center gap-2 mb-4">
              <Flame
                className={`h-4 w-4 ${
                  isDark ? "text-orange-400" : "text-orange-500"
                }`}
              />
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Trending Reels
              </span>
            </div>

            {loadingTrending ? (
              <div className="flex justify-center py-8">
                <Loader2
                  className={`h-6 w-6 animate-spin ${
                    isDark ? "text-gray-600" : "text-gray-300"
                  }`}
                />
              </div>
            ) : trendingReels.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {trendingReels.map((reel) => (
                  <TrendingReelCard key={reel.id} reel={reel} />
                ))}
              </div>
            ) : (
              <div
                className={`rounded-2xl border p-6 text-center ${
                  isDark
                    ? "border-white/[0.06] bg-white/[0.02]"
                    : "border-black/[0.06] bg-black/[0.02]"
                }`}
              >
                <TrendingUp
                  className={`h-10 w-10 mx-auto mb-3 ${
                    isDark ? "text-gray-700" : "text-gray-300"
                  }`}
                />
                <p
                  className={`text-sm font-medium mb-1 ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  No trending reels yet
                </p>
                <p
                  className={`text-xs ${
                    isDark ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  Upload reels to see them here
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
