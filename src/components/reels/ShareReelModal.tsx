"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useTheme } from "@/context/ThemeContext";
import type { ReelFeedItem } from "@/lib/api";
import { X, Search, Send, Check, Loader2, Users, User } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface ShareReelModalProps {
  readonly reel: ReelFeedItem;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly convexUserId: Id<"users"> | null;
}

export default function ShareReelModal({
  reel,
  isOpen,
  onClose,
  convexUserId,
}: ShareReelModalProps) {
  const [search, setSearch] = useState("");
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const conversations = useQuery(
    api.conversations.getUserConversations,
    convexUserId ? { userId: convexUserId } : "skip",
  );
  const sendReelShare = useMutation(api.messages.sendReelShare);

  if (!isOpen || !convexUserId) return null;

  const filtered = (conversations || []).filter((conv) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    if (conv.isGroup && conv.groupName) {
      return conv.groupName.toLowerCase().includes(q);
    }
    return conv.otherUser?.name?.toLowerCase().includes(q);
  });

  const handleSend = async (conversationId: Id<"conversations">) => {
    if (sentTo.has(conversationId) || sending) return;
    setSending(conversationId);
    try {
      const thumbUrl = reel.thumbnailUrl
        ? reel.thumbnailUrl.startsWith("http")
          ? reel.thumbnailUrl
          : `${API_BASE}${reel.thumbnailUrl}`
        : "";

      await sendReelShare({
        conversationId,
        senderId: convexUserId,
        reelId: reel.id,
        reelPreview: {
          thumbnailUrl: thumbUrl,
          caption: reel.caption || "",
          creatorName: reel.creator?.displayName || "Unknown",
          creatorAvatar: reel.creator?.avatarUrl || undefined,
          duration: Math.round((reel.durationMs || 0) / 1000),
        },
      });

      setSentTo((prev) => new Set(prev).add(conversationId));
    } catch {
      console.error("Failed to share reel");
    } finally {
      setSending(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close share modal"
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl animate-slide-up max-h-[60vh] flex flex-col ${
          isDark ? "bg-zinc-900" : "bg-white"
        }`}
      >
        {/* Handle + Header */}
        <div className="pt-3 pb-2 px-5">
          <div
            className={`w-10 h-1 rounded-full mx-auto mb-3 ${
              isDark ? "bg-white/20" : "bg-black/20"
            }`}
          />
          <div className="flex items-center justify-between mb-3">
            <h3
              className={`text-base font-bold ${
                isDark ? "text-white" : "text-black"
              }`}
            >
              Share to
            </h3>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isDark ? "hover:bg-white/10" : "hover:bg-black/10"
              }`}
            >
              <X
                className={`h-5 w-5 ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${
                isDark ? "text-gray-600" : "text-gray-400"
              }`}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none transition-colors ${
                isDark
                  ? "bg-white/10 text-white placeholder-gray-600 focus:bg-white/15"
                  : "bg-black/5 text-black placeholder-gray-400 focus:bg-black/10"
              }`}
            />
          </div>
        </div>

        {/* Divider */}
        <div
          className={`border-b ${isDark ? "border-white/8" : "border-black/8"}`}
        />

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {!conversations ? (
            <div className="flex justify-center py-8">
              <Loader2
                className={`h-6 w-6 animate-spin ${
                  isDark ? "text-gray-600" : "text-gray-300"
                }`}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <p
                className={`text-sm ${
                  isDark ? "text-gray-600" : "text-gray-400"
                }`}
              >
                No conversations found
              </p>
            </div>
          ) : (
            filtered.map((conv) => {
              const isSent = sentTo.has(conv._id);
              const isSending = sending === conv._id;
              const name = conv.isGroup
                ? conv.groupName || "Group"
                : conv.otherUser?.name || "Unknown";
              const avatarUrl = conv.isGroup ? null : conv.otherUser?.imageUrl;

              return (
                <button
                  key={conv._id}
                  onClick={() => handleSend(conv._id)}
                  disabled={isSent || !!sending}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors cursor-pointer ${
                    isDark ? "hover:bg-white/5" : "hover:bg-black/5"
                  } disabled:opacity-60`}
                >
                  {/* Avatar */}
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                        isDark
                          ? "bg-white/10 text-white"
                          : "bg-black/10 text-black"
                      }`}
                    >
                      {conv.isGroup ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                  )}

                  {/* Name */}
                  <div className="flex-1 text-left min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        isDark ? "text-white" : "text-black"
                      }`}
                    >
                      {name}
                    </p>
                    {conv.isGroup && (
                      <p
                        className={`text-xs truncate ${
                          isDark ? "text-gray-600" : "text-gray-400"
                        }`}
                      >
                        {conv.participantIds.length} members
                      </p>
                    )}
                  </div>

                  {/* Send / Sent status */}
                  <div className="shrink-0">
                    {isSent ? (
                      <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    ) : isSending ? (
                      <div className="h-8 w-8 flex items-center justify-center">
                        <Loader2
                          className={`h-5 w-5 animate-spin ${
                            isDark ? "text-gray-500" : "text-gray-400"
                          }`}
                        />
                      </div>
                    ) : (
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          isDark ? "bg-white text-black" : "bg-black text-white"
                        }`}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
