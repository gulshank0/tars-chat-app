"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { UserAvatar } from "./UserAvatar";
import { formatConversationTime } from "@/lib/formatTime";
import { Users } from "lucide-react";

interface ConversationListProps {
  currentUser: Doc<"users">;
  selectedConversationId: Id<"conversations"> | null;
  onSelectConversation: (conversationId: Id<"conversations">) => void;
  searchQuery: string;
}

export function ConversationList({
  currentUser,
  selectedConversationId,
  onSelectConversation,
  searchQuery,
}: ConversationListProps) {
  const conversations = useQuery(api.conversations.getUserConversations, {
    userId: currentUser._id,
  });

  // Loading state with skeleton loaders
  if (conversations === undefined) {
    return (
      <div className="space-y-1 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`skeleton-conv-${i}`} className="flex animate-pulse items-center gap-3 rounded-lg p-3">
            <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-1/2 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Filter by search query (matches user name or group name)
  const filtered = searchQuery.trim()
    ? conversations.filter((conv) => {
        const query = searchQuery.toLowerCase();
        if (conv.isGroup) {
          return conv.groupName?.toLowerCase().includes(query);
        }
        return conv.otherUser?.name.toLowerCase().includes(query);
      })
    : conversations;

  // Empty state
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <svg className="h-8 w-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">
          {searchQuery ? "No conversations found" : "No conversations yet"}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {searchQuery
            ? "Try a different search term"
            : "Go to the Users tab to start chatting!"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 p-2">
      {filtered.map((conversation) => {
        const isSelected = selectedConversationId === conversation._id;

        // Build last message preview
        let lastMessagePreview = "No messages yet";
        if (conversation.lastMessage) {
          if (conversation.lastMessage.isDeleted) {
            lastMessagePreview = "This message was deleted";
          } else {
            const prefix =
              conversation.isGroup && conversation.lastMessageSenderName
                ? `${conversation.lastMessageSenderName.split(" ")[0]}: `
                : "";
            lastMessagePreview =
              prefix + conversation.lastMessage.content;
          }
        }

        // Build typing text
        let typingText: string | null = null;
        if (conversation.typingUserNames.length > 0) {
          const names = conversation.typingUserNames.map(
            (n) => n.split(" ")[0]
          );
          typingText =
            names.length === 1
              ? `${names[0]} is typing...`
              : `${names.join(", ")} are typing...`;
        }

        // Conversation display name
        const displayName = conversation.isGroup
          ? conversation.groupName ?? "Group"
          : conversation.otherUser?.name ?? "Unknown User";

        // Member count for groups
        const memberCount = conversation.isGroup
          ? conversation.participantIds.length
          : null;

        return (
          <button
            key={conversation._id}
            onClick={() => onSelectConversation(conversation._id)}
            className={`flex w-full items-center gap-3 rounded-lg p-3 transition ${
              isSelected
                ? "bg-blue-50 ring-1 ring-blue-200"
                : "hover:bg-gray-50"
            }`}
          >
            {/* Avatar */}
            {conversation.isGroup ? (
              <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500">
                <Users className="h-6 w-6 text-white" />
              </div>
            ) : (
              <div className="relative flex-shrink-0">
                <UserAvatar user={conversation.otherUser} size="md" />
                {conversation.otherUser?.isOnline && (
                  <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 truncate text-sm">
                  {displayName}
                </h3>
                {conversation.lastMessageTime && (
                  <span className="text-[11px] text-gray-400 ml-2 flex-shrink-0">
                    {formatConversationTime(conversation.lastMessageTime)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[13px] text-gray-500 truncate pr-2">
                  {typingText ? (
                    <span className="text-blue-500 italic">{typingText}</span>
                  ) : (
                    lastMessagePreview
                  )}
                </p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {memberCount && (
                    <span className="text-[11px] text-gray-400">
                      {memberCount}
                    </span>
                  )}
                  {conversation.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[11px] font-bold text-white">
                      {conversation.unreadCount > 99
                        ? "99+"
                        : conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
