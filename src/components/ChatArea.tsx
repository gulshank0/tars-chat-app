"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { useEffect, useRef, useState, useCallback } from "react";
import { UserAvatar } from "./UserAvatar";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { ArrowLeft, ChevronDown, Users } from "lucide-react";

interface ChatAreaProps {
  conversationId: Id<"conversations">;
  currentUser: Doc<"users">;
  onBack: () => void;
}

export function ChatArea({ conversationId, currentUser, onBack }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const prevMessagesLength = useRef(0);

  // Refresh `now` every 2 s so the typing-indicator query re-evaluates and
  // expired indicators disappear automatically on the client.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);

  // Queries
  const conversation = useQuery(api.conversations.getConversation, {
    conversationId,
  });
  const messages = useQuery(api.messages.getMessages, { conversationId });
  const typingUsers = useQuery(api.messages.getTypingIndicator, {
    conversationId,
    currentUserId: currentUser._id,
    now,
  });
  const markAsRead = useMutation(api.messages.markAsRead);

  // For 1:1 conversations, find the other user from the participants list
  const isGroup = conversation?.isGroup ?? false;
  const otherParticipant = !isGroup
    ? conversation?.participants?.find((p) => p?._id !== currentUser._id)
    : null;

  // Scroll handling
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isAtBottom);
    if (isAtBottom) setHasNewMessages(false);
  }, []);

  // Mark messages as read when viewing
  useEffect(() => {
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      markAsRead({
        conversationId,
        userId: currentUser._id,
        lastMessageId: lastMessage._id,
      });
    }
  }, [messages, conversationId, currentUser._id, markAsRead]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!messages) return;
    if (messages.length > prevMessagesLength.current) {
      if (shouldAutoScroll) {
        setTimeout(() => {
          scrollToBottom();
          setHasNewMessages(false);
        }, 0);
      } else {
        setHasNewMessages(true);
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, shouldAutoScroll, scrollToBottom]);

  // Initial scroll to bottom on conversation change
  useEffect(() => {
    prevMessagesLength.current = 0;
    setHasNewMessages(false);
    setShouldAutoScroll(true);
    const timer = setTimeout(() => scrollToBottom("auto"), 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // --- Loading state ---
  if (!conversation || !messages) {
    return (
      <div className="flex flex-1 flex-col bg-gray-50">
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white p-4">
          <button onClick={onBack} className="md:hidden rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  // --- Header info ---
  const headerName = isGroup
    ? conversation.groupName ?? "Group Chat"
    : otherParticipant?.name ?? "Chat";

  const headerSubtext = isGroup
    ? `${conversation.participantIds.length} members`
    : otherParticipant?.isOnline
      ? "Online"
      : "Offline";

  return (
    <div className="relative flex flex-1 flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <button
          onClick={onBack}
          className="md:hidden rounded-lg p-2 hover:bg-gray-100 -ml-1"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>

        {/* Avatar */}
        {isGroup ? (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500">
            <Users className="h-5 w-5 text-white" />
          </div>
        ) : (
          <div className="relative flex-shrink-0">
            <UserAvatar user={otherParticipant ?? null} size="sm" />
            {otherParticipant?.isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate text-sm">
            {headerName}
          </h2>
          <p className="text-xs text-gray-500">{headerSubtext}</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-10 w-10 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-700">No messages yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Send the first message to get started!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              isOwnMessage={message.senderId === currentUser._id}
              currentUserId={currentUser._id}
              showSenderName={isGroup}
            />
          ))
        )}

        {/* Typing indicator */}
        {typingUsers && typingUsers.length > 0 && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex space-x-1 rounded-full bg-gray-200 px-3 py-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: "0ms" }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: "150ms" }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs italic text-gray-500">
              {typingUsers
                .map((u) => u?.name?.split(" ")[0])
                .filter(Boolean)
                .join(", ")}{" "}
              is typing…
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ↓ New messages floating button */}
      {hasNewMessages && (
        <div className="absolute bottom-20 inset-x-0 flex justify-center z-10 pointer-events-none">
          <button
            onClick={() => {
              scrollToBottom();
              setHasNewMessages(false);
            }}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-blue-700"
          >
            <ChevronDown className="h-4 w-4" />
            New messages
          </button>
        </div>
      )}

      {/* Message input */}
      <MessageInput conversationId={conversationId} currentUser={currentUser} />
    </div>
  );
}
