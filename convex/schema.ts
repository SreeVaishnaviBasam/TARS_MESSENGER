import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // ─── Users ──────────────────────────────────────────────
    users: defineTable({
        clerkId: v.string(),
        email: v.string(),
        name: v.string(),
        imageUrl: v.optional(v.string()),
        bio: v.optional(v.string()),
        status: v.optional(v.string()), // custom status text
        showOnlineStatus: v.boolean(), // privacy: hide online indicator
        showReadReceipts: v.boolean(), // privacy: hide read receipts
        showTypingIndicator: v.boolean(), // privacy: hide typing indicator
        lastSeenAt: v.optional(v.number()), // timestamp
        isOnline: v.boolean(),
        theme: v.optional(v.string()), // "midnight", "aurora", "sunset", "ocean", "rose"
    })
        .index("by_clerkId", ["clerkId"])
        .index("by_email", ["email"])
        .searchIndex("search_name", { searchField: "name" }),

    // ─── Notes (like Instagram stories/notes) ───────────────
    notes: defineTable({
        userId: v.id("users"),
        content: v.string(), // short text note
        emoji: v.optional(v.string()),
        expiresAt: v.number(), // 24 hours from creation
        createdAt: v.number(),
    })
        .index("by_userId", ["userId"])
        .index("by_expiresAt", ["expiresAt"]),

    // ─── Conversations ─────────────────────────────────────
    conversations: defineTable({
        name: v.optional(v.string()), // group name, null for DMs
        isGroup: v.boolean(),
        groupImage: v.optional(v.string()),
        createdBy: v.id("users"),
        createdAt: v.number(),
        lastMessageAt: v.optional(v.number()),
        lastMessagePreview: v.optional(v.string()),
    }).index("by_lastMessageAt", ["lastMessageAt"]),

    // ─── Conversation Members ──────────────────────────────
    conversationMembers: defineTable({
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        joinedAt: v.number(),
        lastReadAt: v.optional(v.number()), // for unread count
        role: v.optional(v.string()), // "admin" | "member"
    })
        .index("by_conversationId", ["conversationId"])
        .index("by_userId", ["userId"])
        .index("by_conversationId_userId", ["conversationId", "userId"]),

    // ─── Messages ──────────────────────────────────────────
    messages: defineTable({
        conversationId: v.id("conversations"),
        senderId: v.id("users"),
        content: v.string(),
        messageType: v.string(), // "text" | "image" | "video" | "file" | "ai"
        fileUrl: v.optional(v.string()),
        fileName: v.optional(v.string()),
        fileStorageId: v.optional(v.id("_storage")),
        isDeleted: v.boolean(), // soft delete
        deliveredTo: v.optional(v.array(v.id("users"))), // single tick → double tick
        readBy: v.optional(v.array(v.id("users"))), // blue tick
        createdAt: v.number(),
    })
        .index("by_conversationId", ["conversationId"])
        .index("by_conversationId_createdAt", ["conversationId", "createdAt"]),

    // ─── Reactions ─────────────────────────────────────────
    reactions: defineTable({
        messageId: v.id("messages"),
        userId: v.id("users"),
        emoji: v.string(), // 👍 ❤️ 😂 😮 😢
    })
        .index("by_messageId", ["messageId"])
        .index("by_messageId_userId", ["messageId", "userId"]),

    // ─── Typing Indicators ─────────────────────────────────
    typingIndicators: defineTable({
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        isTyping: v.boolean(),
        lastTypedAt: v.number(),
    })
        .index("by_conversationId", ["conversationId"])
        .index("by_conversationId_userId", ["conversationId", "userId"]),
});
