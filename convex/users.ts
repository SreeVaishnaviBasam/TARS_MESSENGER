import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// ─── Store or update user from Clerk webhook / client ────
export const store = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const existing = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (existing) {
            // Update name/image if changed
            await ctx.db.patch(existing._id, {
                name: identity.name || existing.name,
                imageUrl: identity.pictureUrl || existing.imageUrl,
                email: identity.email || existing.email,
                isOnline: true,
                lastSeenAt: Date.now(),
            });
            return existing._id;
        }

        // Create new user
        const userId = await ctx.db.insert("users", {
            clerkId: identity.subject,
            email: identity.email || "",
            name: identity.name || "Anonymous",
            imageUrl: identity.pictureUrl || "",
            bio: "",
            status: "",
            showOnlineStatus: true,
            showReadReceipts: true,
            showTypingIndicator: true,
            isOnline: true,
            lastSeenAt: Date.now(),
            theme: "midnight",
        });

        return userId;
    },
});

// ─── Get current user ────────────────────────────────────
export const currentUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        return await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
    },
});

// ─── Get all users (excluding current) ──────────────────
export const listAll = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const allUsers = await ctx.db.query("users").collect();
        return allUsers.filter((u) => u.clerkId !== identity.subject);
    },
});

// ─── Search users by name ────────────────────────────────
export const search = query({
    args: { query: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        if (!args.query.trim()) {
            const allUsers = await ctx.db.query("users").collect();
            return allUsers.filter((u) => u.clerkId !== identity.subject);
        }

        const results = await ctx.db
            .query("users")
            .withSearchIndex("search_name", (q) => q.search("name", args.query))
            .collect();

        return results.filter((u) => u.clerkId !== identity.subject);
    },
});

// ─── Update user profile ────────────────────────────────
export const updateProfile = mutation({
    args: {
        name: v.optional(v.string()),
        bio: v.optional(v.string()),
        status: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        profileImageId: v.optional(v.id("_storage")),
        theme: v.optional(v.string()),
        showOnlineStatus: v.optional(v.boolean()),
        showReadReceipts: v.optional(v.boolean()),
        showTypingIndicator: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        const updates: Record<string, unknown> = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.bio !== undefined) updates.bio = args.bio;
        if (args.status !== undefined) updates.status = args.status;
        if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
        if (args.theme !== undefined) updates.theme = args.theme;
        if (args.showOnlineStatus !== undefined) updates.showOnlineStatus = args.showOnlineStatus;
        if (args.showReadReceipts !== undefined) updates.showReadReceipts = args.showReadReceipts;
        if (args.showTypingIndicator !== undefined) updates.showTypingIndicator = args.showTypingIndicator;

        // Handle profile image upload via storage
        if (args.profileImageId) {
            const imageUrl = await ctx.storage.getUrl(args.profileImageId);
            if (imageUrl) updates.imageUrl = imageUrl;
        }

        await ctx.db.patch(user._id, updates);
        return user._id;
    },
});

// ─── Set online/offline status ──────────────────────────
export const setOnlineStatus = mutation({
    args: { isOnline: v.boolean() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (user) {
            await ctx.db.patch(user._id, {
                isOnline: args.isOnline,
                lastSeenAt: Date.now(),
            });
        }
    },
});

// ─── Get or create TARS AI system user ───────────────────
export const getOrCreateAIUser = mutation({
    args: {},
    handler: async (ctx) => {
        const aiUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", "tars-ai-bot"))
            .unique();

        if (aiUser) return aiUser._id;

        return await ctx.db.insert("users", {
            clerkId: "tars-ai-bot",
            email: "ai@tars.app",
            name: "TARS AI",
            imageUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=TARS",
            bio: "I am TARS, your personal AI assistant. Let's chat!",
            status: "Always Online",
            showOnlineStatus: true,
            showReadReceipts: true,
            showTypingIndicator: true,
            isOnline: true,
            lastSeenAt: Date.now(),
            theme: "midnight",
        });
    },
});

// ─── Get user by ID ─────────────────────────────────────
export const getById = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

