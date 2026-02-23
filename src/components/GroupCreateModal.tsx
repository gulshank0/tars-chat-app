"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { X, Users, Search, Check } from "lucide-react";
import { UserAvatar } from "./UserAvatar";

interface GroupCreateModalProps {
  currentUser: Doc<"users">;
  onClose: () => void;
  onCreated: (conversationId: Id<"conversations">) => void;
}

export function GroupCreateModal({ currentUser, onClose, onCreated }: GroupCreateModalProps) {
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Id<"users">[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const allUsers = useQuery(api.users.getAllUsers, { currentClerkId: currentUser.clerkId });
  const createGroup = useMutation(api.conversations.createGroupConversation);

  // Filter out current user and apply search
  const filteredUsers = (allUsers ?? []).filter((u) => {
    if (u._id === currentUser._id) return false;
    if (!search) return true;
    return (
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const toggleUser = (userId: Id<"users">) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError("Please enter a group name");
      return;
    }
    if (selectedIds.length < 1) {
      setError("Select at least one other member");
      return;
    }

    setError("");
    setIsCreating(true);
    try {
      const conversationId = await createGroup({
        creatorId: currentUser._id,
        memberIds: selectedIds,
        groupName: groupName.trim(),
      });
      onCreated(conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-950 shadow-2xl border border-gray-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Group</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Group name input */}
          <div>
            <label htmlFor="groupName" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Group Name
            </label>
            <input
              id="groupName"
              type="text"
              placeholder="Enter group name…"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Selected members chips */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedIds.map((id) => {
                const user = allUsers?.find((u) => u._id === id);
                if (!user) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300"
                  >
                    {user.name?.split(" ")[0]}
                    <button
                      onClick={() => toggleUser(id)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* User list */}
          <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 dark:border-zinc-800">
            {filteredUsers.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No users found</p>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedIds.includes(user._id);
                return (
                  <button
                    key={user._id}
                    onClick={() => toggleUser(user._id)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-900 ${
                      isSelected ? "bg-blue-50 dark:bg-blue-900/30" : ""
                    }`}
                  >
                    <UserAvatar user={user} size="sm" />
                    <span className="flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                      {user.name}
                    </span>
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
                        isSelected
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-zinc-800 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 dark:border-zinc-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isCreating ? "Creating…" : `Create Group (${selectedIds.length + 1})`}
          </button>
        </div>
      </div>
    </div>
  );
}
