"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState, useCallback } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function ChatPage() {
  const { user, isLoaded } = useUser();
  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Sync user to Convex
  const upsertUser = useMutation(api.users.upsertUser);
  const currentUser = useQuery(
    api.users.getCurrentUser,
    user?.id ? { clerkId: user.id } : "skip",
  );

  // Track online status
  useOnlineStatus(user?.id);

  // Sync user on login
  useEffect(() => {
    if (user) {
      upsertUser({
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        name: user.fullName || user.firstName || "User",
        imageUrl: user.imageUrl,
      });
    }
  }, [user, upsertUser]);

  const handleSelectConversation = useCallback(
    (conversationId: Id<"conversations">) => {
      setSelectedConversationId(conversationId);
      setShowMobileChat(true);
    },
    [],
  );

  const handleBackToList = useCallback(() => {
    setShowMobileChat(false);
  }, []);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in — redirect handled by middleware, but just in case
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Waiting for user sync
  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Setting up your account...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-black">
      {/* Sidebar - hidden on mobile when chat is open */}
      <div
        className={`${showMobileChat ? "hidden md:flex" : "flex"} w-full md:w-80 lg:w-96 flex-col overflow-hidden border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950`}
      >
        <Sidebar
          currentUser={currentUser}
          clerkUser={user}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Chat Area - full screen on mobile, side by side on desktop */}
      <div
        className={`${showMobileChat ? "flex" : "hidden md:flex"} flex-1 flex-col min-h-0 overflow-hidden`}
      >
        {selectedConversationId ? (
          <ChatArea
            conversationId={selectedConversationId}
            currentUser={currentUser}
            onBack={handleBackToList}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-gray-50 dark:bg-black">
            <div className="text-center px-6">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <svg
                  className="h-12 w-12 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                Select a conversation
              </h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Choose a user from the sidebar to start chatting
              </p>
              <a
                href="/reels/player"
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black dark:bg-white dark:text-black text-sm font-semibold hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                🎬 Watch Reels
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
