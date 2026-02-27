import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

export function formatMessageTime(timestamp: number): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    if (diffDays === 0) {
        return timeStr; // "2:34 PM"
    }

    const monthDay = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });

    if (date.getFullYear() === now.getFullYear()) {
        return `${monthDay}, ${timeStr}`; // "Feb 15, 2:34 PM"
    }

    return `${monthDay} ${date.getFullYear()}, ${timeStr}`; // "Feb 15, 2024, 2:34 PM"
}

export function formatLastSeen(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

export function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
}

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

export const NOTE_EMOJIS = ["💭", "✨", "🎵", "📚", "🌙", "☀️", "🔥", "💯", "🎯", "💡"];

export const THEMES = [
    { id: "midnight", name: "Midnight", color: "#6366f1", icon: "🌙" },
    { id: "aurora", name: "Aurora", color: "#10b981", icon: "🌌" },
    { id: "sunset", name: "Sunset", color: "#ef4444", icon: "🌅" },
    { id: "ocean", name: "Ocean", color: "#3b82f6", icon: "🌊" },
    { id: "rose", name: "Rose", color: "#ec4899", icon: "🌹" },
    { id: "light", name: "Light", color: "#f8fafc", icon: "☀️" },
];
