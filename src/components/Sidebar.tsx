"use client";

import { useState } from "react";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { UserResource } from "@clerk/types";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { UserList } from "./UserList";
import { ConversationList } from "./ConversationList";
import { GroupCreateModal } from "./GroupCreateModal";
import { Search, MessageCircle, Users, LogOut, Plus } from "lucide-react";

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

  const handleTabChange = (tab: "conversations" | "users") => {
    setActiveTab(tab);
    setSearchQuery("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <UserButton />
          <div>
            <h2 className="font-semibold text-gray-900">{clerkUser.fullName || clerkUser.firstName}</h2>
            <p className="text-sm text-gray-500">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowGroupModal(true)}
            title="New group chat"
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-blue-600"
          >
            <Plus className="h-5 w-5" />
          </button>
          <SignOutButton>
            <button className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100">
              <LogOut className="h-5 w-5" />
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === "conversations" ? "Search conversations..." : "Search users..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => handleTabChange("conversations")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition ${
            activeTab === "conversations"
              ? "border-b-2 border-blue-500 text-blue-500"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          Chats
        </button>
        <button
          onClick={() => handleTabChange("users")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition ${
            activeTab === "users"
              ? "border-b-2 border-blue-500 text-blue-500"
              : "text-gray-500 hover:text-gray-700"
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
    </div>
  );
}
