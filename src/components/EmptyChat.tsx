"use client";

import { MessageSquare, Sparkles, Users, Shield, Zap } from "lucide-react";

export default function EmptyChat() {
    return (
        <div
            className="flex flex-col items-center justify-center h-full text-center px-10 animate-fade-in mesh-gradient"
        >
            {/* Logo */}
            <div
                className="w-28 h-28 rounded-[32px] flex items-center justify-center mb-10 shadow-2xl animate-float"
                style={{ background: "var(--gradient-1)" }}
            >
                <Zap size={48} className="text-white" />
            </div>

            <h1
                className="text-5xl font-extrabold mb-4 tracking-tight"
                style={{ color: "var(--text-primary)" }}
            >
                TARS Messenger
            </h1>
            <p
                className="text-lg mb-12 max-w-lg font-medium opacity-60 leading-relaxed"
                style={{ color: "var(--text-tertiary)" }}
            >
                Experience seamless real-time messaging and AI assistance. Pick a conversation to begin.
            </p>

            <button
                className="px-10 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 shadow-2xl"
                style={{ background: "var(--gradient-1)", color: "white" }}
            >
                New Transmission
            </button>
        </div>
    );
}
