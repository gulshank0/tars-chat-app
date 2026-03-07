"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import {
  instagramApi,
  type InstagramMedia,
  type UserProfile,
  profileApi,
} from "@/lib/api";
import BottomNav from "@/components/navigation/BottomNav";
import {
  Instagram,
  Link2,
  Unlink,
  Download,
  Check,
  Loader2,
  ArrowLeft,
  Film,
} from "lucide-react";
import Link from "next/link";

export default function InstagramSettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [igReels, setIgReels] = useState<InstagramMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<Set<string>>(new Set());
  const { getToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const isConnected = !!profile?.instagramId;

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await profileApi.getMyProfile(token);
      setProfile(data);

      if (data?.instagramId) {
        try {
          const reels = await instagramApi.getReels(token);
          setIgReels(reels || []);
        } catch {
          console.error("Failed to fetch IG reels");
        }
      }
    } catch {
      console.error("Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConnect = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await instagramApi.getAuthUrl(token);
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch {
      console.error("Failed to get auth URL");
    }
  };

  const handleDisconnect = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      await instagramApi.disconnect(token);
      setProfile((prev) => (prev ? { ...prev, instagramId: undefined } : prev));
      setIgReels([]);
    } catch {
      console.error("Failed to disconnect");
    }
  };

  const handleImport = async (media: InstagramMedia) => {
    try {
      setImporting(media.id);
      const token = await getToken();
      if (!token) return;

      // Extract hashtags from caption
      const hashtags =
        media.caption?.match(/#[\w]+/g)?.map((h: string) => h.slice(1)) || [];

      await instagramApi.importReel(
        {
          mediaId: media.id,
          mediaUrl: media.media_url,
          thumbnailUrl: media.thumbnail_url || "",
          caption: media.caption || "",
          hashtags,
        },
        token,
      );

      setImported((prev) => new Set([...prev, media.id]));
    } catch {
      console.error("Failed to import reel");
    } finally {
      setImporting(null);
    }
  };

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
            href="/profile"
            className={`p-1 rounded-lg transition-colors ${
              isDark ? "hover:bg-white/10" : "hover:bg-black/10"
            }`}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1
            className={`text-xl font-bold ${
              isDark ? "text-white" : "text-black"
            }`}
          >
            Instagram
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2
              className={`h-8 w-8 animate-spin ${
                isDark ? "text-gray-600" : "text-gray-300"
              }`}
            />
          </div>
        ) : (
          <div className="px-5 py-6 space-y-6">
            {/* Connection Status */}
            <div
              className={`rounded-2xl p-5 ${
                isDark ? "bg-white/[0.03]" : "bg-black/[0.02]"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`p-2.5 rounded-xl ${
                    isConnected
                      ? "bg-gradient-to-br from-purple-500 to-pink-500"
                      : isDark
                        ? "bg-white/10"
                        : "bg-black/10"
                  }`}
                >
                  <Instagram className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2
                    className={`font-semibold ${
                      isDark ? "text-white" : "text-black"
                    }`}
                  >
                    {isConnected ? "Connected" : "Not Connected"}
                  </h2>
                  <p
                    className={`text-xs ${
                      isDark ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    {isConnected
                      ? `@${profile?.instagramId}`
                      : "Connect to import your reels"}
                  </p>
                </div>
              </div>

              {isConnected ? (
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Unlink className="h-4 w-4" />
                  Disconnect Instagram
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Link2 className="h-4 w-4" />
                  Connect Instagram
                </button>
              )}
            </div>

            {/* Instagram Reels */}
            {isConnected && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Film
                    className={`h-4 w-4 ${
                      isDark ? "text-purple-400" : "text-purple-500"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Your Instagram Reels
                  </span>
                </div>

                {igReels.length === 0 ? (
                  <p
                    className={`text-sm text-center py-8 ${
                      isDark ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    No reels found on your Instagram account
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {igReels.map((reel) => {
                      const isImported = imported.has(reel.id);
                      const isImporting2 = importing === reel.id;
                      return (
                        <div
                          key={reel.id}
                          className={`relative rounded-xl overflow-hidden aspect-[9/16] ${
                            isDark ? "bg-white/5" : "bg-black/5"
                          }`}
                        >
                          {reel.thumbnail_url && (
                            <img
                              src={reel.thumbnail_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />

                          {/* Caption */}
                          {reel.caption && (
                            <div className="absolute bottom-10 left-2 right-2">
                              <p className="text-white text-[10px] line-clamp-2">
                                {reel.caption}
                              </p>
                            </div>
                          )}

                          {/* Import button */}
                          <div className="absolute bottom-2 left-2 right-2">
                            <button
                              onClick={() => handleImport(reel)}
                              disabled={isImported || isImporting2}
                              className={`w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                isImported
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-white/20 backdrop-blur text-white hover:bg-white/30"
                              }`}
                            >
                              {isImporting2 ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : isImported ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  Imported
                                </>
                              ) : (
                                <>
                                  <Download className="h-3 w-3" />
                                  Import
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
