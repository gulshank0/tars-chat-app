"use client";

import { useState } from "react";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { UserResource } from "@clerk/types";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { UserList } from "./UserList";
import { ConversationList } from "./ConversationList";
import { GroupCreateModal } from "./GroupCreateModal";
import { SettingsModal } from "./SettingsModal";
import { Search, MessageCircle, Users, LogOut, Plus, Settings } from "lucide-react";

interface SidebarProps {
  currentUser: Doc<"users">;
  clerkUser: UserResource;
  selectedConversationId: Id<"conversations"> | null;
  onSelectConversation: (conversationId: Id<"conversations">) => void;
}

export function Sidebar({
  currentUser,
  clerkUser,
  selectedConversationId,
  onSelectConversation,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"conversations" | "users">("conversations");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleTabChange = (tab: "conversations" | "users") => {
    setActiveTab(tab);
    setSearchQuery("");
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <UserButton />
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{clerkUser.fullName || clerkUser.firstName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowGroupModal(true)}
            title="New group chat"
            className="rounded-lg p-2 text-gray-500 dark:text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Plus className="h-5 w-5" />
          </button>
          <SignOutButton>
            <button className="rounded-lg p-2 text-gray-500 dark:text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-red-500 dark:hover:text-red-400">
              <LogOut className="h-5 w-5" />
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder={activeTab === "conversations" ? "Search conversations..." : "Search users..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-zinc-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 py-2 pl-10 pr-4 text-sm focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-zinc-800">
        <button
          onClick={() => handleTabChange("conversations")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition ${
            activeTab === "conversations"
              ? "border-b-2 border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          Chats
        </button>
        <button
          onClick={() => handleTabChange("users")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition ${
            activeTab === "users"
              ? "border-b-2 border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <Users className="h-4 w-4" />
          Users
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "conversations" ? (
          <ConversationList
            currentUser={currentUser}
            selectedConversationId={selectedConversationId}
            onSelectConversation={onSelectConversation}
            searchQuery={searchQuery}
          />
        ) : (
          <UserList
            currentUser={currentUser}
            searchQuery={searchQuery}
            onSelectConversation={onSelectConversation}
          />
        )}
      </div>

      {/* Settings button at bottom */}
      <div className="border-t border-gray-200 dark:border-zinc-800 p-3">
        <button
          onClick={() => setShowSettings(true)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-gray-600 dark:text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 group-hover:bg-gray-200 dark:group-hover:bg-gray-800 transition">
            <Settings className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>

      {/* Group create modal */}
      {showGroupModal && (
        <GroupCreateModal
          currentUser={currentUser}
          onClose={() => setShowGroupModal(false)}
          onCreated={(conversationId) => {
            setShowGroupModal(false);
            onSelectConversation(conversationId);
          }}
        />
      )}

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
