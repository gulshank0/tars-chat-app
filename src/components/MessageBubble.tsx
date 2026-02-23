"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { formatMessageTime } from "@/lib/formatTime";
import { useState } from "react";
import { Trash2, Smile } from "lucide-react";

interface MessageWithSender {
  _id: Id<"messages">;
  _creationTime: number;
  conversationId: Id<"conversations">;
  senderId: Id<"users">;
  content: string;
  isDeleted: boolean;
  reactions?: { emoji: string; userId: Id<"users"> }[];
  sender: Doc<"users"> | null;
}

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwnMessage: boolean;
  currentUserId: Id<"users">;
  /** Show the sender name above the bubble (used in group chats) */
  showSenderName?: boolean;
}

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢"];

// Helper function to get message bubble styling
function getMessageBubbleStyle(isDeleted: boolean, isOwnMessage: boolean): string {
  if (isDeleted) {
    return "bg-gray-200 dark:bg-gray-900 text-gray-500 dark:text-gray-400 italic";
  }
  if (isOwnMessage) {
    return "bg-blue-500 text-white";
  }
  return "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm";
}

export function MessageBubble({ message, isOwnMessage, currentUserId, showSenderName }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const deleteMessage = useMutation(api.messages.deleteMessage);
  const addReaction = useMutation(api.messages.addReaction);

  const handleDelete = async () => {
    await deleteMessage({ messageId: message._id, userId: currentUserId });
    setShowActions(false);
  };

  const handleReaction = async (emoji: string) => {
    await addReaction({
      messageId: message._id,
      userId: currentUserId,
      emoji,
    });
    setShowEmojiPicker(false);
  };

  // Group reactions by emoji
  const groupedReactions = message.reactions?.reduce(
    (acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push(reaction.userId);
      return acc;
    },
    {} as Record<string, Id<"users">[]>
  ) || {};

  return (
    <div
      className={`group flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      <div className={`relative max-w-[75%] ${isOwnMessage ? "order-2" : "order-1"}`}>
        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-2 ${getMessageBubbleStyle(message.isDeleted, isOwnMessage)}`}
        >
          {/* Sender name in group chats (for other users' messages) */}
          {showSenderName && !isOwnMessage && message.sender && (
            <p className="mb-0.5 text-xs font-semibold text-blue-600">{message.sender.name}</p>
          )}
          {message.isDeleted ? (
            <p className="text-sm">This message was deleted</p>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>

        {/* Timestamp */}
        <p
          className={`mt-1 text-xs text-gray-500 dark:text-gray-400 ${
            isOwnMessage ? "text-right" : "text-left"
          }`}
        >
          {formatMessageTime(message._creationTime)}
        </p>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div
            className={`mt-1 flex flex-wrap gap-1 ${
              isOwnMessage ? "justify-end" : "justify-start"
            }`}
          >
            {Object.entries(groupedReactions).map(([emoji, userIds]) => {
              const hasReacted = userIds.includes(currentUserId);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition ${
                    hasReacted
                      ? "bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700"
                      : "bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-gray-600 dark:text-gray-300">{userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Action buttons */}
        {showActions && !message.isDeleted && (
          <div
            className={`absolute top-0 flex items-center gap-1 ${
              isOwnMessage ? "-left-20" : "-right-20"
            }`}
          >
            {/* Emoji picker button */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="rounded-full bg-white dark:bg-gray-900 p-1.5 text-gray-500 dark:text-gray-400 shadow hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <Smile className="h-4 w-4" />
              </button>

              {/* Emoji picker dropdown */}
              {showEmojiPicker && (
                <div
                  className={`absolute top-8 z-10 flex gap-1 rounded-lg bg-white p-2 shadow-lg ${
                    isOwnMessage ? "right-0" : "left-0"
                  }`}
                >
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className="rounded p-1 text-lg transition hover:bg-gray-100"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Delete button (only for own messages) */}
            {isOwnMessage && (
              <button
                onClick={handleDelete}
                className="rounded-full bg-white dark:bg-gray-900 p-1.5 text-gray-500 dark:text-gray-400 shadow hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
