import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── Create or get existing DM conversation ─────────────
export const createOrGetDM = mutation({
    args: { otherUserId: v.id("users") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");

        // Check if DM already exists between these two users
        const myMemberships = await ctx.db
            .query("conversationMembers")
            .withIndex("by_userId", (q) => q.eq("userId", currentUser._id))
            .collect();

        for (const membership of myMemberships) {
            const conversation = await ctx.db.get(membership.conversationId);
            if (!conversation || conversation.isGroup) continue;

            const otherMembership = await ctx.db
                .query("conversationMembers")
                .withIndex("by_conversationId_userId", (q) =>
                    q.eq("conversationId", membership.conversationId).eq("userId", args.otherUserId)
                )
                .unique();

            if (otherMembership) {
                return membership.conversationId;
            }
        }

        // Create new DM conversation
        const conversationId = await ctx.db.insert("conversations", {
            isGroup: false,
            createdBy: currentUser._id,
            createdAt: Date.now(),
        });

        // Add both members
        await ctx.db.insert("conversationMembers", {
            conversationId,
            userId: currentUser._id,
            joinedAt: Date.now(),
            lastReadAt: Date.now(),
            role: "member",
        });

        await ctx.db.insert("conversationMembers", {
            conversationId,
            userId: args.otherUserId,
            joinedAt: Date.now(),
            role: "member",
        });

        return conversationId;
    },
});

// ─── Create group conversation ───────────────────────────
export const createGroup = mutation({
    args: {
        name: v.string(),
        memberIds: v.array(v.id("users")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");

        const conversationId = await ctx.db.insert("conversations", {
            name: args.name,
            isGroup: true,
            createdBy: currentUser._id,
            createdAt: Date.now(),
        });

        // Add creator as admin
        await ctx.db.insert("conversationMembers", {
            conversationId,
            userId: currentUser._id,
            joinedAt: Date.now(),
            lastReadAt: Date.now(),
            role: "admin",
        });

        // Add other members
        for (const memberId of args.memberIds) {
            await ctx.db.insert("conversationMembers", {
                conversationId,
                userId: memberId,
                joinedAt: Date.now(),
                role: "member",
            });
        }

        return conversationId;
    },
});

// ─── List all conversations for current user ─────────────
export const list = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return [];

        const memberships = await ctx.db
            .query("conversationMembers")
            .withIndex("by_userId", (q) => q.eq("userId", currentUser._id))
            .collect();

        const conversations = await Promise.all(
            memberships.map(async (membership) => {
                const conversation = await ctx.db.get(membership.conversationId);
                if (!conversation) return null;

                // Get all members with user data
                const members = await ctx.db
                    .query("conversationMembers")
                    .withIndex("by_conversationId", (q) =>
                        q.eq("conversationId", conversation._id)
                    )
                    .collect();

                const memberUsers = await Promise.all(
                    members.map(async (m) => {
                        const user = await ctx.db.get(m.userId);
                        return user;
                    })
                );

                // Calculate unread count
                let unreadCount = 0;
                if (membership.lastReadAt) {
                    const unreadMessages = await ctx.db
                        .query("messages")
                        .withIndex("by_conversationId_createdAt", (q) =>
                            q
                                .eq("conversationId", conversation._id)
                                .gt("createdAt", membership.lastReadAt!)
                        )
                        .collect();
                    unreadCount = unreadMessages.filter(
                        (m) => m.senderId !== currentUser._id
                    ).length;
                } else {
                    const allMessages = await ctx.db
                        .query("messages")
                        .withIndex("by_conversationId", (q) =>
                            q.eq("conversationId", conversation._id)
                        )
                        .collect();
                    unreadCount = allMessages.filter(
                        (m) => m.senderId !== currentUser._id
                    ).length;
                }

                // For DMs, get the other user
                const otherUser = conversation.isGroup
                    ? null
                    : memberUsers.find((u) => u && u._id !== currentUser._id);

                return {
                    ...conversation,
                    members: memberUsers.filter(Boolean),
                    otherUser,
                    unreadCount,
                    myMembership: membership,
                };
            })
        );

        return conversations
            .filter(Boolean)
            .sort((a, b) => {
                const aTime = a!.lastMessageAt || a!.createdAt;
                const bTime = b!.lastMessageAt || b!.createdAt;
                return bTime - aTime;
            });
    },
});

// ─── Get a single conversation with details ──────────────
export const get = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return null;

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) return null;

        const members = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .collect();

        const memberUsers = await Promise.all(
            members.map(async (m) => {
                const user = await ctx.db.get(m.userId);
                return user;
            })
        );

        const otherUser = conversation.isGroup
            ? null
            : memberUsers.find((u) => u && u._id !== currentUser._id);

        return {
            ...conversation,
            members: memberUsers.filter(Boolean),
            otherUser,
        };
    },
});

// ─── Mark conversation as read ───────────────────────────
export const markAsRead = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return;

        const membership = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId_userId", (q) =>
                q
                    .eq("conversationId", args.conversationId)
                    .eq("userId", currentUser._id)
            )
            .unique();

        if (membership) {
            await ctx.db.patch(membership._id, {
                lastReadAt: Date.now(),
            });
        }
    },
});

// ─── Update Group Settings ────────────────────────────────
export const updateGroupSettings = mutation({
    args: {
        conversationId: v.id("conversations"),
        name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation || !conversation.isGroup) throw new Error("Group not found");

        // Check if user is admin (creator)
        const membership = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", currentUser._id)
            )
            .unique();

        if (!membership || membership.role !== "admin") {
            throw new Error("Only admins can change group settings");
        }

        const updates: { name?: string } = {};
        if (args.name) updates.name = args.name;

        await ctx.db.patch(args.conversationId, updates);
    },
});

// ─── Update Group Image ───────────────────────────────────
export const updateGroupImage = mutation({
    args: {
        conversationId: v.id("conversations"),
        storageId: v.id("_storage"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation || !conversation.isGroup) throw new Error("Group not found");

        // Check if user is admin
        const membership = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", currentUser._id)
            )
            .unique();

        if (!membership || membership.role !== "admin") {
            throw new Error("Only admins can change group image");
        }

        const imageUrl = await ctx.storage.getUrl(args.storageId);
        if (imageUrl) {
            await ctx.db.patch(args.conversationId, {
                groupImage: imageUrl,
            });
        }
    },
});

// ─── Leave Group ──────────────────────────────────────────
export const leaveGroup = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");

        const membership = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", currentUser._id)
            )
            .unique();

        if (!membership) throw new Error("Not a member of this group");

        // Remove the member
        await ctx.db.delete(membership._id);

        // Check if there are any members left
        const remainingMembers = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .collect();

        if (remainingMembers.length === 0) {
            // No members left, delete the conversation and messages (cleanup)
            // Note: In a production app, you might want to keep the history or just soft-delete
            await ctx.db.delete(args.conversationId);

            const messages = await ctx.db
                .query("messages")
                .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
                .collect();

            for (const msg of messages) {
                await ctx.db.delete(msg._id);
            }
        } else if (membership.role === "admin") {
            // Admin left, assign new admin to the first remaining member
            await ctx.db.patch(remainingMembers[0]._id, { role: "admin" });
        }
    },
});

// ─── Delete Group (Admin only) ───────────────────────────
export const deleteGroup = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");

        const membership = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", currentUser._id)
            )
            .unique();

        if (!membership || membership.role !== "admin") {
            throw new Error("Only admins can delete the group");
        }

        // Delete all members
        const members = await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .collect();

        for (const m of members) {
            await ctx.db.delete(m._id);
        }

        // Delete all messages
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .collect();

        for (const msg of messages) {
            await ctx.db.delete(msg._id);
        }

        // Delete conversation
        await ctx.db.delete(args.conversationId);
    },
});
// ─── Get or create AI conversation ───────────────────────
export const getAIConversation = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");

        const aiUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", "tars-ai-bot"))
            .unique();

        if (!aiUser) throw new Error("AI user not initialized");

        // Check if DM already exists
        const myMemberships = await ctx.db
            .query("conversationMembers")
            .withIndex("by_userId", (q) => q.eq("userId", currentUser._id))
            .collect();

        for (const membership of myMemberships) {
            const conversation = await ctx.db.get(membership.conversationId);
            if (!conversation || conversation.isGroup) continue;

            const aiMembership = await ctx.db
                .query("conversationMembers")
                .withIndex("by_conversationId_userId", (q) =>
                    q.eq("conversationId", membership.conversationId).eq("userId", aiUser._id)
                )
                .unique();

            if (aiMembership) {
                return membership.conversationId;
            }
        }

        // Create new AI DM conversation
        const conversationId = await ctx.db.insert("conversations", {
            isGroup: false,
            createdBy: currentUser._id,
            createdAt: Date.now(),
        });

        await ctx.db.insert("conversationMembers", {
            conversationId,
            userId: currentUser._id,
            joinedAt: Date.now(),
            lastReadAt: Date.now(),
            role: "member",
        });

        await ctx.db.insert("conversationMembers", {
            conversationId,
            userId: aiUser._id,
            joinedAt: Date.now(),
            role: "member",
        });

        return conversationId;
    },
});
