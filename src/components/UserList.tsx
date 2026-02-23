"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { UserAvatar } from "./UserAvatar";

interface UserListProps {
  currentUser: Doc<"users">;
  searchQuery: string;
  onSelectConversation: (conversationId: Id<"conversations">) => void;
}

export function UserList({ currentUser, searchQuery, onSelectConversation }: UserListProps) {
  const allUsers = useQuery(api.users.getAllUsers, { currentClerkId: currentUser.clerkId });
  const searchResults = useQuery(
    api.users.searchUsers,
    searchQuery.trim()
      ? { searchQuery: searchQuery.trim(), currentClerkId: currentUser.clerkId }
      : "skip"
  );

  const users = searchQuery.trim() ? searchResults : allUsers;

  const getOrCreateConversation = useMutation(api.conversations.getOrCreateConversation);

  const handleSelectUser = async (userId: Id<"users">) => {
    const conversationId = await getOrCreateConversation({
      currentUserId: currentUser._id,
      otherUserId: userId,
    });
    onSelectConversation(conversationId);
  };

  // Loading state
  if (users === undefined) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex animate-pulse items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-900" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-900" />
              <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-900" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
          <svg className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {searchQuery ? "No users found" : "No other users yet"}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {searchQuery
            ? "Try a different search term"
            : "Invite your friends to join the conversation!"}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {users.map((user) => (
        <button
          key={user._id}
          onClick={() => handleSelectUser(user._id)}
          className="flex w-full items-center gap-3 p-4 transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
        >
          <UserAvatar user={user} size="md" />
          <div className="flex-1 text-left">
            <h3 className="font-medium text-gray-900 dark:text-white">{user.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
          <div className={`h-3 w-3 rounded-full ${user.isOnline ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700"}`} />
        </button>
      ))}
    </div>
  );
}
