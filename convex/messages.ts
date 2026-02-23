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
        q.eq("userId", args.senderId).eq("conversationId", args.conversationId)
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

// Get messages for a conversation
export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Get sender info for each message
    const messagesWithSender = await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        return {
          ...message,
          sender,
        };
      })
    );

    return messagesWithSender;
  },
});

// Delete a message (soft delete)
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      isDeleted: true,
      content: "",
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
      (r) => r.userId === args.userId && r.emoji === args.emoji
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
        q.eq("userId", args.userId).eq("conversationId", args.conversationId)
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

// Get typing indicator for a conversation
export const getTypingIndicator = query({
  args: { 
    conversationId: v.id("conversations"),
    currentUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const typingIndicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.neq(q.field("userId"), args.currentUserId))
      .collect();

    const activeTyping = typingIndicators.filter(
      (indicator) =>
        indicator.isTyping && Date.now() - indicator.lastTypingTime < 3000
    );

    if (activeTyping.length === 0) return null;

    // Get user info for typing indicators
    const typingUsers = await Promise.all(
      activeTyping.map(async (indicator) => {
        const user = await ctx.db.get(indicator.userId);
        return user;
      })
    );

    return typingUsers.filter(Boolean);
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
        q.eq("userId", args.userId).eq("conversationId", args.conversationId)
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
