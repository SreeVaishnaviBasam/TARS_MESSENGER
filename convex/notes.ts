import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── Create a note ──────────────────────────────────────
export const create = mutation({
    args: {
        content: v.string(),
        emoji: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");

        // Delete existing notes from this user
        const existingNotes = await ctx.db
            .query("notes")
            .withIndex("by_userId", (q) => q.eq("userId", currentUser._id))
            .collect();

        for (const note of existingNotes) {
            await ctx.db.delete(note._id);
        }

        const noteId = await ctx.db.insert("notes", {
            userId: currentUser._id,
            content: args.content,
            emoji: args.emoji,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            createdAt: Date.now(),
        });

        return noteId;
    },
});

// ─── Get all active notes ────────────────────────────────
export const listActive = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const now = Date.now();
        const notes = await ctx.db.query("notes").collect();
        const activeNotes = notes.filter((n) => n.expiresAt > now);

        const enriched = await Promise.all(
            activeNotes.map(async (note) => {
                const user = await ctx.db.get(note.userId);
                return { ...note, user };
            })
        );

        return enriched.filter((n) => n.user);
    },
});

// ─── Delete my note ─────────────────────────────────────
export const deleteMyNote = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return;

        const notes = await ctx.db
            .query("notes")
            .withIndex("by_userId", (q) => q.eq("userId", currentUser._id))
            .collect();

        for (const note of notes) {
            await ctx.db.delete(note._id);
        }
    },
});
