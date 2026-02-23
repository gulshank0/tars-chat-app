import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - stores user profiles synced from Clerk
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    isOnline: v.boolean(),
    lastSeen: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["clerkId"],
    }),

  // Conversations table - supports both 1:1 and group conversations
  conversations: defineTable({
    participantIds: v.array(v.id("users")),
    isGroup: v.optional(v.boolean()),
    groupName: v.optional(v.string()),
    groupCreatorId: v.optional(v.id("users")),
    lastMessageId: v.optional(v.id("messages")),
    lastMessageTime: v.optional(v.number()),
  })
    .index("by_participant", ["participantIds"])
    .index("by_last_message_time", ["lastMessageTime"]),

  // Messages table - stores individual messages
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    isDeleted: v.boolean(),
    reactions: v.optional(
      v.array(
        v.object({
          emoji: v.string(),
          userId: v.id("users"),
        })
      )
    ),
  }).index("by_conversation", ["conversationId"]),

  // Typing indicators table
  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    isTyping: v.boolean(),
    lastTypingTime: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user_conversation", ["userId", "conversationId"]),

  // Read receipts table - tracks which messages users have read
  readReceipts: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    lastReadMessageId: v.optional(v.id("messages")),
    lastReadTime: v.number(),
  }).index("by_user_conversation", ["userId", "conversationId"]),
});
