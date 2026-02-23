"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState, useCallback } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import Link from "next/link";

export default function Home() {
  const { user, isLoaded } = useUser();
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Sync user to Convex
  const upsertUser = useMutation(api.users.upsertUser);
  const currentUser = useQuery(
    api.users.getCurrentUser,
    user?.id ? { clerkId: user.id } : "skip"
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

  const handleSelectConversation = useCallback((conversationId: Id<"conversations">) => {
    setSelectedConversationId(conversationId);
    setShowMobileChat(true);
  }, []);

  const handleBackToList = useCallback(() => {
    setShowMobileChat(false);
  }, []);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">Welcome to ChatApp</h1>
          <p className="mb-6 text-gray-600">
            Connect with friends and colleagues in real-time. Sign in to start messaging.
          </p>
          <div className="flex gap-4">
            <Link
              href="/sign-in"
              className="flex-1 rounded-lg bg-blue-500 px-6 py-3 text-center font-semibold text-white transition hover:bg-blue-600"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="flex-1 rounded-lg border-2 border-blue-500 px-6 py-3 text-center font-semibold text-blue-500 transition hover:bg-blue-50"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for user sync
  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar - hidden on mobile when chat is open */}
      <div className={`${showMobileChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col overflow-hidden border-r border-gray-200 bg-white`}>
        <Sidebar
          currentUser={currentUser}
          clerkUser={user}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Chat Area - full screen on mobile, side by side on desktop */}
      <div className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-h-0 overflow-hidden`}>
        {selectedConversationId ? (
          <ChatArea
            conversationId={selectedConversationId}
            currentUser={currentUser}
            onBack={handleBackToList}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-200">
                <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-700">Select a conversation</h2>
              <p className="mt-2 text-gray-500">Choose a user from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
