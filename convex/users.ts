import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create or update user from Clerk webhook/auth
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        isOnline: true,
        lastSeen: Date.now(),
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      isOnline: true,
      lastSeen: Date.now(),
    });
  },
});

// Get current user by Clerk ID
export const getCurrentUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// Get all users except current user
export const getAllUsers = query({
  args: { currentClerkId: v.string() },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();
    return allUsers.filter((user) => user.clerkId !== args.currentClerkId);
  },
});

// Search users by name
export const searchUsers = query({
  args: { 
    searchQuery: v.string(),
    currentClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();
    const searchLower = args.searchQuery.toLowerCase();
    
    return allUsers.filter(
      (user) => 
        user.clerkId !== args.currentClerkId &&
        user.name.toLowerCase().includes(searchLower)
    );
  },
});

// Update user online status
export const updateOnlineStatus = mutation({
  args: { 
    clerkId: v.string(),
    isOnline: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        isOnline: args.isOnline,
        lastSeen: Date.now(),
      });
    }
  },
});

// Get user by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
