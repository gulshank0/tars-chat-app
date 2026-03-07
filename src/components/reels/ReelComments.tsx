"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import { reelsApi, type CommentItem } from "@/lib/api";
import { X, Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ReelCommentsProps {
  reelId: string;
  commentCount: number;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded: () => void;
}

export default function ReelComments({
  reelId,
  commentCount,
  isOpen,
  onClose,
  onCommentAdded,
}: ReelCommentsProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { getToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const fetchComments = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await reelsApi.getComments(reelId, token);
      setComments(data || []);
    } catch {
      console.error("Failed to fetch comments");
    } finally {
      setLoading(false);
    }
  }, [reelId, getToken]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchComments();
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [isOpen, fetchComments]);

  const handlePost = async () => {
    if (!newComment.trim() || posting) return;
    setPosting(true);
    try {
      const token = await getToken();
      if (!token) return;
      await reelsApi.addComment(reelId, newComment.trim(), token);

      // Optimistically prepend a fake comment
      const fakeComment: CommentItem = {
        id: `temp-${Date.now()}`,
        reelId,
        userId: "",
        content: newComment.trim(),
        likeCount: 0,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        user: {
          id: "",
          clerkId: "",
          username: "you",
          displayName: "You",
          bio: "",
          isVerified: false,
          isPrivate: false,
          followerCount: 0,
          followingCount: 0,
          reelCount: 0,
          createdAt: "",
        },
      };
      setComments((prev) => [fakeComment, ...prev]);
      setNewComment("");
      onCommentAdded();
    } catch {
      console.error("Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl animate-slide-up max-h-[70vh] flex flex-col ${
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
          <div className="flex items-center justify-between">
            <h3
              className={`text-base font-bold ${
                isDark ? "text-white" : "text-black"
              }`}
            >
              Comments{" "}
              <span
                className={`font-normal text-sm ${
                  isDark ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {commentCount}
              </span>
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
        </div>

        {/* Divider */}
        <div
          className={`border-b ${
            isDark ? "border-white/[0.08]" : "border-black/[0.08]"
          }`}
        />

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div
                className={`h-6 w-6 border-2 rounded-full animate-spin ${
                  isDark
                    ? "border-white/30 border-t-white"
                    : "border-black/30 border-t-black"
                }`}
              />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p
                className={`text-sm ${
                  isDark ? "text-gray-600" : "text-gray-400"
                }`}
              >
                No comments yet — be the first!
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                {/* Avatar */}
                {comment.user?.avatarUrl ? (
                  <img
                    src={comment.user.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isDark
                        ? "bg-white/10 text-white"
                        : "bg-black/10 text-black"
                    }`}
                  >
                    {comment.user?.displayName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        isDark ? "text-white" : "text-black"
                      }`}
                    >
                      {comment.user?.username || "unknown"}
                    </span>
                    <span
                      className={`text-xs ${
                        isDark ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: false,
                      })}
                    </span>
                  </div>
                  <p
                    className={`text-sm mt-0.5 leading-relaxed ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input bar */}
        <div
          className={`px-4 py-3 border-t flex items-center gap-3 ${
            isDark ? "border-white/[0.08]" : "border-black/[0.08]"
          }`}
        >
          <input
            ref={inputRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handlePost();
              }
            }}
            placeholder="Add a comment..."
            className={`flex-1 px-4 py-2.5 rounded-full text-sm outline-none transition-colors ${
              isDark
                ? "bg-white/10 text-white placeholder-gray-600 focus:bg-white/15"
                : "bg-black/5 text-black placeholder-gray-400 focus:bg-black/10"
            }`}
          />
          <button
            onClick={handlePost}
            disabled={!newComment.trim() || posting}
            className={`p-2.5 rounded-full transition-all cursor-pointer disabled:opacity-30 ${
              isDark
                ? "bg-white text-black hover:bg-gray-200"
                : "bg-black text-white hover:bg-gray-800"
            }`}
          >
            {posting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
