import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

// ─── Send a message ──────────────────────────────────────
export const send = mutation({
    args: {
        conversationId: v.id("conversations"),
        content: v.string(),
        messageType: v.optional(v.string()),
        fileUrl: v.optional(v.string()),
        fileName: v.optional(v.string()),
        fileStorageId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");

        const now = Date.now();

        const messageId = await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            senderId: currentUser._id,
            content: args.content,
            messageType: args.messageType || "text",
            fileUrl: args.fileUrl,
            fileName: args.fileName,
            fileStorageId: args.fileStorageId,
            isDeleted: false,
            deliveredTo: [],
            readBy: [],
            createdAt: now,
        });

        // Update conversation's last message info
        const preview = args.messageType === "image"
            ? "📷 Image"
            : args.messageType === "video"
                ? "🎥 Video"
                : args.messageType === "file"
                    ? `📎 ${args.fileName || "File"}`
                    : args.content.substring(0, 50);

        await ctx.db.patch(args.conversationId, {
            lastMessageAt: now,
            lastMessagePreview: preview,
        });

        // Clear typing indicator
        const typingIndicator = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversationId_userId", (q) =>
                q
                    .eq("conversationId", args.conversationId)
                    .eq("userId", currentUser._id)
            )
            .unique();

        if (typingIndicator) {
            await ctx.db.patch(typingIndicator._id, {
                isTyping: false,
                lastTypedAt: now,
            });
        }

        return messageId;
    },
});

// ─── List messages for a conversation ────────────────────
export const list = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId_createdAt", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .collect();

        // Enrich with sender info and reactions
        const enrichedMessages = await Promise.all(
            messages.map(async (message) => {
                const sender = await ctx.db.get(message.senderId);
                const reactions = await ctx.db
                    .query("reactions")
                    .withIndex("by_messageId", (q) => q.eq("messageId", message._id))
                    .collect();

                // Group reactions by emoji
                const reactionGroups: Record<string, { emoji: string; users: string[]; count: number }> = {};
                for (const reaction of reactions) {
                    if (!reactionGroups[reaction.emoji]) {
                        reactionGroups[reaction.emoji] = { emoji: reaction.emoji, users: [], count: 0 };
                    }
                    reactionGroups[reaction.emoji].users.push(reaction.userId);
                    reactionGroups[reaction.emoji].count++;
                }

                return {
                    ...message,
                    sender,
                    reactions: Object.values(reactionGroups),
                };
            })
        );

        return enrichedMessages;
    },
});

// ─── Delete a message (soft delete) ─────────────────────
export const deleteMessage = mutation({
    args: { messageId: v.id("messages") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");

        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");
        if (message.senderId !== currentUser._id) throw new Error("Can only delete own messages");

        await ctx.db.patch(args.messageId, {
            isDeleted: true,
            content: "",
            fileUrl: undefined,
        });
    },
});

// ─── Mark messages as delivered ──────────────────────────
export const markDelivered = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return;

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .collect();

        for (const message of messages) {
            if (
                message.senderId !== currentUser._id &&
                !(message.deliveredTo || []).includes(currentUser._id)
            ) {
                await ctx.db.patch(message._id, {
                    deliveredTo: [...(message.deliveredTo || []), currentUser._id],
                });
            }
        }
    },
});

// ─── Mark messages as read ───────────────────────────────
export const markRead = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return;

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .collect();

        for (const message of messages) {
            if (
                message.senderId !== currentUser._id &&
                !(message.readBy || []).includes(currentUser._id)
            ) {
                await ctx.db.patch(message._id, {
                    readBy: [...(message.readBy || []), currentUser._id],
                });
            }
        }
    },
});

// ─── Toggle reaction ────────────────────────────────────
export const toggleReaction = mutation({
    args: {
        messageId: v.id("messages"),
        emoji: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");

        // Check if reaction already exists
        const existingReactions = await ctx.db
            .query("reactions")
            .withIndex("by_messageId_userId", (q) =>
                q.eq("messageId", args.messageId).eq("userId", currentUser._id)
            )
            .collect();

        const existingReaction = existingReactions.find(
            (r) => r.emoji === args.emoji
        );

        if (existingReaction) {
            // Remove reaction
            await ctx.db.delete(existingReaction._id);
        } else {
            // Add reaction
            await ctx.db.insert("reactions", {
                messageId: args.messageId,
                userId: currentUser._id,
                emoji: args.emoji,
            });
        }
    },
});

// ─── Generate upload URL for files ──────────────────────
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        return await ctx.storage.generateUploadUrl();
    },
});

// ─── Get file URL from storage ID ───────────────────────
export const getFileUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});

// ─── Set typing indicator ───────────────────────────────
export const setTyping = mutation({
    args: {
        conversationId: v.id("conversations"),
        isTyping: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return;

        // Check privacy setting
        if (!currentUser.showTypingIndicator) return;

        const existing = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversationId_userId", (q) =>
                q
                    .eq("conversationId", args.conversationId)
                    .eq("userId", currentUser._id)
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                isTyping: args.isTyping,
                lastTypedAt: Date.now(),
            });
        } else {
            await ctx.db.insert("typingIndicators", {
                conversationId: args.conversationId,
                userId: currentUser._id,
                isTyping: args.isTyping,
                lastTypedAt: Date.now(),
            });
        }
    },
});

// ─── Get typing indicators for a conversation ───────────
export const getTyping = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return [];

        const indicators = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversationId", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .collect();

        const activeTypers = indicators.filter(
            (i) =>
                i.isTyping &&
                i.userId !== currentUser._id &&
                Date.now() - i.lastTypedAt < 3000 // 3 seconds timeout
        );

        const typersWithNames = await Promise.all(
            activeTypers.map(async (t) => {
                const user = await ctx.db.get(t.userId);
                return user ? { userId: t.userId, name: user.name, imageUrl: user.imageUrl } : null;
            })
        );

        return typersWithNames.filter(Boolean);
    },
});
// ─── Send AI response (internal, no auth needed) ─────────
export const sendAIResponseInternal = internalMutation({
    args: {
        conversationId: v.id("conversations"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const aiUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", "tars-ai-bot"))
            .unique();

        if (!aiUser) throw new Error("AI user not found");

        const now = Date.now();
        const messageId = await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            senderId: aiUser._id,
            content: args.content,
            messageType: "ai",
            isDeleted: false,
            deliveredTo: [],
            readBy: [],
            createdAt: now,
        });

        await ctx.db.patch(args.conversationId, {
            lastMessageAt: now,
            lastMessagePreview: `🤖 ${args.content.substring(0, 47)}`,
        });

        return messageId;
    },
});
