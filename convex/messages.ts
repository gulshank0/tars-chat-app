import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Send a message
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.content,
      isDeleted: false,
      reactions: [],
    });

    // Update conversation's last message
    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
      lastMessageTime: Date.now(),
    });

    // Clear typing indicator
    const typingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", args.senderId).eq("conversationId", args.conversationId),
      )
      .first();

    if (typingIndicator) {
      await ctx.db.patch(typingIndicator._id, {
        isTyping: false,
        lastTypingTime: Date.now(),
      });
    }

    return messageId;
  },
});

// Share a reel to a conversation
export const sendReelShare = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    reelId: v.string(),
    reelPreview: v.object({
      thumbnailUrl: v.string(),
      caption: v.string(),
      creatorName: v.string(),
      creatorAvatar: v.optional(v.string()),
      duration: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: "",
      isDeleted: false,
      reactions: [],
      messageType: "reel_share",
      sharedReelId: args.reelId,
      sharedReelPreview: args.reelPreview,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
      lastMessageTime: Date.now(),
    });

    return messageId;
  },
});

// Get messages for a conversation
export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    // Get sender info for each message
    const messagesWithSender = await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        return {
          ...message,
          sender,
        };
      }),
    );

    return messagesWithSender;
  },
});

// Delete a message (soft delete) — only the sender can delete
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== args.userId) {
      throw new Error("You can only delete your own messages");
    }
    await ctx.db.patch(args.messageId, {
      isDeleted: true,
      content: "",
      reactions: [],
    });
  },
});

// Add reaction to a message
export const addReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;

    const reactions = message.reactions || [];

    // Check if user already reacted with this emoji
    const existingReactionIndex = reactions.findIndex(
      (r) => r.userId === args.userId && r.emoji === args.emoji,
    );

    if (existingReactionIndex !== -1) {
      // Remove the reaction
      reactions.splice(existingReactionIndex, 1);
    } else {
      // Add the reaction
      reactions.push({ emoji: args.emoji, userId: args.userId });
    }

    await ctx.db.patch(args.messageId, { reactions });
  },
});

// Update typing indicator
export const updateTypingIndicator = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", args.userId).eq("conversationId", args.conversationId),
      )
      .first();

    if (existingIndicator) {
      await ctx.db.patch(existingIndicator._id, {
        isTyping: args.isTyping,
        lastTypingTime: Date.now(),
      });
    } else {
      await ctx.db.insert("typingIndicators", {
        conversationId: args.conversationId,
        userId: args.userId,
        isTyping: args.isTyping,
        lastTypingTime: Date.now(),
      });
    }
  },
});

// Get typing indicator for a conversation.
// `now` is intentionally NOT in args — the client filters by lastTypingTime
// locally so that changing the clock never causes a new Convex subscription
// (which would briefly return `undefined` and cause UI flickering).
export const getTypingIndicator = query({
  args: {
    conversationId: v.id("conversations"),
    currentUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const typingIndicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .filter((q) => q.neq(q.field("userId"), args.currentUserId))
      .collect();

    const activeTyping = typingIndicators.filter(
      (indicator) => indicator.isTyping,
    );

    if (activeTyping.length === 0) return [];

    // Return user info + lastTypingTime so the client can expire stale indicators
    const typingUsers = await Promise.all(
      activeTyping.map(async (indicator) => {
        const user = await ctx.db.get(indicator.userId);
        return user
          ? { ...user, lastTypingTime: indicator.lastTypingTime }
          : null;
      }),
    );

    return typingUsers.filter((u): u is NonNullable<typeof u> => u !== null);
  },
});

// Mark messages as read
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    lastMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const existingReceipt = await ctx.db
      .query("readReceipts")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", args.userId).eq("conversationId", args.conversationId),
      )
      .first();

    if (existingReceipt) {
      await ctx.db.patch(existingReceipt._id, {
        lastReadMessageId: args.lastMessageId,
        lastReadTime: Date.now(),
      });
    } else {
      await ctx.db.insert("readReceipts", {
        conversationId: args.conversationId,
        userId: args.userId,
        lastReadMessageId: args.lastMessageId,
        lastReadTime: Date.now(),
      });
    }
  },
});
