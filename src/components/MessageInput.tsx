"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send } from "lucide-react";

interface MessageInputProps {
  conversationId: Id<"conversations">;
  currentUser: Doc<"users">;
}

export function MessageInput({ conversationId, currentUser }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendMessage = useMutation(api.messages.sendMessage);
  const updateTypingIndicator = useMutation(api.messages.updateTypingIndicator);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    updateTypingIndicator({
      conversationId,
      userId: currentUser._id,
      isTyping: true,
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to clear typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingIndicator({
        conversationId,
        userId: currentUser._id,
        isTyping: false,
      });
    }, 2000);
  }, [conversationId, currentUser._id, updateTypingIndicator]);

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      await sendMessage({
        conversationId,
        senderId: currentUser._id,
        content: trimmedMessage,
      });
      setMessage("");
      
      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      updateTypingIndicator({
        conversationId,
        userId: currentUser._id,
        isTyping: false,
      });
    } catch (err) {
      setError("Failed to send message. Click to retry.");
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRetry = () => {
    setError(null);
    handleSend();
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {error && (
        <button
          onClick={handleRetry}
          className="mb-2 w-full rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 hover:bg-red-100"
        >
          {error}
        </button>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
