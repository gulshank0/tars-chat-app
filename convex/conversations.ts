import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get or create a 1:1 conversation between two users
export const getOrCreateConversation = mutation({
  args: {
    currentUserId: v.id("users"),
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Find existing 1:1 conversation between these two users
    const conversations = await ctx.db.query("conversations").collect();

    const existingConversation = conversations.find((conv) => {
      const participants = conv.participantIds;
      return (
        !conv.isGroup &&
        participants.length === 2 &&
        participants.includes(args.currentUserId) &&
        participants.includes(args.otherUserId)
      );
    });

    if (existingConversation) {
      return existingConversation._id;
    }

    // Create new 1:1 conversation
    const conversationId = await ctx.db.insert("conversations", {
      participantIds: [args.currentUserId, args.otherUserId],
      isGroup: false,
      lastMessageTime: Date.now(),
    });

    // Create read receipts for both users
    await ctx.db.insert("readReceipts", {
      conversationId,
      userId: args.currentUserId,
      lastReadTime: Date.now(),
    });
    await ctx.db.insert("readReceipts", {
      conversationId,
      userId: args.otherUserId,
      lastReadTime: Date.now(),
    });

    return conversationId;
  },
});

// Create a group conversation
export const createGroupConversation = mutation({
  args: {
    creatorId: v.id("users"),
    memberIds: v.array(v.id("users")),
    groupName: v.string(),
  },
  handler: async (ctx, args) => {
    // Ensure creator is included in members
    const allMembers = args.memberIds.includes(args.creatorId)
      ? args.memberIds
      : [args.creatorId, ...args.memberIds];

    const conversationId = await ctx.db.insert("conversations", {
      participantIds: allMembers,
      isGroup: true,
      groupName: args.groupName,
      groupCreatorId: args.creatorId,
      lastMessageTime: Date.now(),
    });

    // Create read receipts for all members
    for (const memberId of allMembers) {
      await ctx.db.insert("readReceipts", {
        conversationId,
        userId: memberId,
        lastReadTime: Date.now(),
      });
    }

    return conversationId;
  },
});

// Get all conversations for a user (both 1:1 and group)
export const getUserConversations = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversations = await ctx.db.query("conversations").collect();

    const userConversations = conversations.filter((conv) =>
      conv.participantIds.includes(args.userId)
    );

    // Sort by last message time (most recent first)
    userConversations.sort((a, b) => {
      const aTime = a.lastMessageTime ?? 0;
      const bTime = b.lastMessageTime ?? 0;
      return bTime - aTime;
    });

    // Get additional info for each conversation
    const conversationsWithDetails = await Promise.all(
      userConversations.map(async (conv) => {
        // For 1:1 conversations, get the other user
        let otherUser = null;
        if (!conv.isGroup) {
          const otherUserId = conv.participantIds.find(
            (id) => id !== args.userId
          );
          otherUser = otherUserId ? await ctx.db.get(otherUserId) : null;
        }

        // For group conversations, get all participant info
        let participants = null;
        if (conv.isGroup) {
          participants = await Promise.all(
            conv.participantIds.map(async (id) => {
              return await ctx.db.get(id);
            })
          );
        }

        // Get the last message
        const lastMessage = conv.lastMessageId
          ? await ctx.db.get(conv.lastMessageId)
          : null;

        // Get last message sender name for group chats
        let lastMessageSenderName = null;
        if (lastMessage && conv.isGroup) {
          const sender = await ctx.db.get(lastMessage.senderId);
          lastMessageSenderName = sender?.name ?? null;
        }

        // Get unread count
        const readReceipt = await ctx.db
          .query("readReceipts")
          .withIndex("by_user_conversation", (q) =>
            q.eq("userId", args.userId).eq("conversationId", conv._id)
          )
          .first();

        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conv._id)
          )
          .collect();

        let unreadCount = 0;
        if (readReceipt?.lastReadMessageId) {
          const lastReadMessage = await ctx.db.get(
            readReceipt.lastReadMessageId
          );
          if (lastReadMessage) {
            unreadCount = messages.filter(
              (msg) =>
                msg._creationTime > lastReadMessage._creationTime &&
                msg.senderId !== args.userId
            ).length;
          }
        } else if (readReceipt) {
          unreadCount = messages.filter(
            (msg) =>
              msg._creationTime > readReceipt.lastReadTime &&
              msg.senderId !== args.userId
          ).length;
        }

        // Get typing indicators (for all other users in this conversation)
        const rawTypingIndicators = await ctx.db
          .query("typingIndicators")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conv._id)
          )
          .filter((q) => q.neq(q.field("userId"), args.userId))
          .collect();

        // Return raw data so the client can do time-based filtering without
        // changing query args (which would cause re-subscription flickering).
        const typingIndicators: { name: string; lastTypingTime: number }[] = [];
        for (const indicator of rawTypingIndicators) {
          if (indicator.isTyping) {
            const typingUser = await ctx.db.get(indicator.userId);
            if (typingUser) {
              typingIndicators.push({
                name: typingUser.name,
                lastTypingTime: indicator.lastTypingTime,
              });
            }
          }
        }

        return {
          ...conv,
          otherUser,
          participants,
          lastMessage,
          lastMessageSenderName,
          unreadCount,
          typingIndicators,
        };
      })
    );

    return conversationsWithDetails;
  },
});

// Get a single conversation with participant details
export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return null;

    // Get all participants
    const participants = await Promise.all(
      conv.participantIds.map(async (id) => {
        return await ctx.db.get(id);
      })
    );

    return {
      ...conv,
      participants: participants.filter(Boolean),
    };
  },
});
