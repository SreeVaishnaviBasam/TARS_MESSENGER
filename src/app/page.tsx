"use client";

import { useEffect, useState } from "react";
import {
  SignInButton,
  SignUpButton,
  useAuth,
  useUser,
} from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import ChatApp from "@/components/ChatApp";
import { Suspense } from "react";

const THEMES = [
  { id: "midnight", label: "Midnight", accent: "#6366f1", bg: "#0a0a0f" },
  { id: "aurora", label: "Aurora", accent: "#10b981", bg: "#0a0f0d" },
  { id: "sunset", label: "Sunset", accent: "#ef4444", bg: "#0f0a0a" },
  { id: "ocean", label: "Ocean", accent: "#3b82f6", bg: "#0a0d12" },
  { id: "rose", label: "Rose", accent: "#ec4899", bg: "#0f0a0d" },
  { id: "light", label: "Light", accent: "#6366f1", bg: "#ffffff" },
];

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const storeUser = useMutation(api.users.store);

  useEffect(() => {
    if (isSignedIn && clerkUser) {
      storeUser().catch(console.error);
    }
  }, [isSignedIn, clerkUser, storeUser]);

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (!isSignedIn) {
    return <LandingPage />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ChatApp />
    </Suspense>
  );
}

/* ─── Loading Screen ──────────────────────────────────── */
function LoadingScreen() {
  return (
    <div
      data-theme="midnight"
      className="h-[100dvh] w-screen flex items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="text-center animate-fade-in">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div
            className="absolute inset-0 rounded-2xl animate-spin"
            style={{
              background: "conic-gradient(from 0deg, transparent, var(--accent), transparent)",
              animationDuration: "2s",
            }}
          />
          <div
            className="absolute inset-[3px] rounded-2xl flex items-center justify-center"
            style={{ background: "var(--bg-primary)" }}
          >
            <img src="/tars-logo.png" alt="TARS" className="w-10 h-10 object-contain" />
          </div>
        </div>
        <h1
          className="text-xl font-semibold tracking-wide"
          style={{ color: "var(--text-primary)" }}
        >
          TARS Messenger
        </h1>
        <div className="flex gap-1.5 justify-center mt-5">
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
        </div>
      </div>
    </div>
  );
}

/* ─── Landing Page ────────────────────────────────────── */
function LandingPage() {
  const [theme, setTheme] = useState("midnight");
  const [showThemePicker, setShowThemePicker] = useState(false);

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div
      data-theme={theme}
      className="min-h-[100dvh] w-screen overflow-hidden relative transition-all duration-700"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* ─── Animated Background Orbs ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute rounded-full blur-[140px] opacity-[0.12]"
          style={{
            background: currentTheme.accent,
            width: "clamp(300px, 50vw, 800px)",
            height: "clamp(300px, 50vw, 800px)",
            top: "-15%",
            right: "-10%",
            animation: "float-slow 20s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full blur-[120px] opacity-[0.08]"
          style={{
            background: currentTheme.accent,
            width: "clamp(200px, 35vw, 600px)",
            height: "clamp(200px, 35vw, 600px)",
            bottom: "-10%",
            left: "-5%",
            animation: "float-slow 25s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute rounded-full blur-[100px] opacity-[0.06]"
          style={{
            background: currentTheme.accent,
            width: "clamp(150px, 25vw, 400px)",
            height: "clamp(150px, 25vw, 400px)",
            top: "40%",
            left: "30%",
            animation: "float-slow 18s ease-in-out infinite 5s",
          }}
        />
      </div>

      {/* ─── Grid pattern overlay ─── */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${currentTheme.accent} 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* ─── Main Content ─── */}
      <div className="relative z-10 flex flex-col min-h-[100dvh]">
        {/* ─── Nav Bar ─── */}
        <nav className="flex items-center justify-between px-6 sm:px-10 lg:px-16 py-5">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${currentTheme.accent}30, ${currentTheme.accent}10)`,
                border: `1px solid ${currentTheme.accent}25`,
              }}
            >
              <img src="/tars-logo.png" alt="TARS" className="w-5 h-5 object-contain" />
            </div>
            <span
              className="text-base font-bold tracking-wide"
              style={{ color: "var(--text-primary)" }}
            >
              TARS
            </span>
          </div>
          <SignInButton mode="modal">
            <button
              className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-[1.03]"
              style={{
                border: `1px solid var(--border-primary)`,
                color: "var(--text-primary)",
                background: "var(--bg-secondary)",
              }}
            >
              Sign In
            </button>
          </SignInButton>
        </nav>

        {/* ─── Hero Section ─── */}
        <main className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-16 py-8 sm:py-12">
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Text content */}
            <div className="animate-fade-in text-center lg:text-left order-2 lg:order-1">
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 tracking-wider uppercase"
                style={{
                  background: `${currentTheme.accent}12`,
                  color: currentTheme.accent,
                  border: `1px solid ${currentTheme.accent}25`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: currentTheme.accent }}
                />
                Now in Beta
              </div>

              {/* Headline */}
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6"
                style={{ color: "var(--text-primary)" }}
              >
                Chat{" "}
                <span style={{ color: "var(--accent)" }}>
                  Smarter
                </span>
                <br />
                Connect{" "}
                <span style={{ color: "var(--text-tertiary)" }}>Faster</span>
              </h1>

              {/* Subtitle */}
              <p
                className="text-base sm:text-lg leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0"
                style={{ color: "var(--text-secondary)" }}
              >
                Real-time messaging powered by AI. Group chats, media sharing,
                customizable themes, and privacy controls — all in one
                beautifully crafted experience.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <SignUpButton mode="modal">
                  <button
                    className="group relative px-8 py-3.5 rounded-2xl text-base font-bold transition-all duration-300 hover:scale-[1.04] hover:shadow-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${currentTheme.accent}, ${currentTheme.accent}cc)`,
                      color: "#fff",
                      boxShadow: `0 8px 32px ${currentTheme.accent}30`,
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Get Started Free
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button
                    className="px-8 py-3.5 rounded-2xl text-base font-semibold transition-all duration-300 hover:scale-[1.03]"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-primary)",
                    }}
                  >
                    I have an account
                  </button>
                </SignInButton>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-4 mt-10 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {["🟣", "🔵", "🟢", "🟡"].map((c, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2"
                      style={{
                        background: "var(--bg-tertiary)",
                        borderColor: "var(--bg-primary)",
                      }}
                    >
                      {c}
                    </div>
                  ))}
                </div>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Join early adopters using TARS
                </p>
              </div>
            </div>

            {/* Right: 3D Visual / App Preview */}
            <div className="flex justify-center items-center order-1 lg:order-2 animate-fade-in">
              <div className="relative w-full max-w-md">
                {/* Main 3D floating card */}
                <div
                  className="relative rounded-3xl p-6 sm:p-8"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-primary)",
                    boxShadow: `0 24px 80px ${currentTheme.accent}15, 0 0 0 1px ${currentTheme.accent}08`,
                    animation: "float 6s ease-in-out infinite",
                  }}
                >
                  {/* Mock chat UI preview */}
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-3 pb-3" style={{ borderBottom: "1px solid var(--border-primary)" }}>
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                        style={{ background: `${currentTheme.accent}20` }}
                      >
                        🤖
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>TARS AI</p>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
                          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Online</p>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="space-y-2.5 py-2">
                      <div className="flex justify-start">
                        <div
                          className="px-4 py-2.5 rounded-2xl rounded-bl-sm max-w-[80%] text-sm"
                          style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                        >
                          Hey! I&apos;m TARS, your AI assistant 👋
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div
                          className="px-4 py-2.5 rounded-2xl rounded-br-sm max-w-[80%] text-sm text-white"
                          style={{ background: currentTheme.accent }}
                        >
                          What can you do?
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div
                          className="px-4 py-2.5 rounded-2xl rounded-bl-sm max-w-[85%] text-sm"
                          style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                        >
                          I can help with anything! Chat, create groups, share files, and more ✨
                        </div>
                      </div>
                      {/* Typing indicator */}
                      <div className="flex justify-start">
                        <div
                          className="px-4 py-3 rounded-2xl rounded-bl-sm"
                          style={{ background: "var(--bg-tertiary)" }}
                        >
                          <div className="flex gap-1">
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Input */}
                    <div
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                      style={{ background: "var(--bg-input)", border: "1px solid var(--border-primary)" }}
                    >
                      <span style={{ color: "var(--text-tertiary)" }} className="text-sm">Type a message...</span>
                      <div className="ml-auto">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: currentTheme.accent }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating notification card - top right */}
                <div
                  className="absolute -top-4 -right-4 sm:-top-6 sm:-right-8 rounded-2xl px-4 py-3 glass"
                  style={{
                    animation: "float 5s ease-in-out infinite 1s",
                    boxShadow: `0 8px 32px ${currentTheme.accent}15`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-base">
                      👥
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>New Group Created</p>
                      <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>3 members</p>
                    </div>
                  </div>
                </div>

                {/* Floating emoji reaction - bottom left */}
                <div
                  className="absolute -bottom-3 -left-3 sm:-bottom-5 sm:-left-6 rounded-2xl px-4 py-2.5 glass"
                  style={{
                    animation: "float 7s ease-in-out infinite 2s",
                    boxShadow: `0 8px 32px ${currentTheme.accent}15`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">❤️</span>
                    <span className="text-lg">😂</span>
                    <span className="text-lg">🔥</span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: currentTheme.accent }}
                    >
                      +12
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ─── Feature Strip ─── */}
        <div
          className="px-6 sm:px-10 lg:px-16 py-6"
          style={{ borderTop: "1px solid var(--border-secondary)" }}
        >
          <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: "💬", label: "Real-time Chat" },
              { icon: "👥", label: "Group Chats" },
              { icon: "🤖", label: "AI Assistant" },
              { icon: "📸", label: "Media Sharing" },
              { icon: "🎨", label: "Custom Themes" },
              { icon: "🔒", label: "Privacy First" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-[1.03]"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-secondary)",
                }}
              >
                <span className="text-lg">{f.icon}</span>
                <span
                  className="text-xs sm:text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Theme Picker (Bottom Right) ─── */}
      <div className="fixed bottom-6 right-6 z-50">
        {showThemePicker && (
          <div
            className="absolute bottom-14 right-0 rounded-2xl p-3 mb-2 animate-scale-in"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-primary)",
              boxShadow: `0 16px 48px rgba(0,0,0,0.4)`,
              minWidth: "200px",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2.5 px-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Theme
            </p>
            <div className="space-y-1">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setShowThemePicker(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    background: theme === t.id ? `${t.accent}15` : "transparent",
                    color: theme === t.id ? t.accent : "var(--text-secondary)",
                    border: theme === t.id ? `1px solid ${t.accent}30` : "1px solid transparent",
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{
                      background: t.accent,
                      outline: theme === t.id ? `2px solid ${t.accent}` : "2px solid transparent",
                      outlineOffset: "2px",
                    }}
                  />
                  {t.label}
                  {theme === t.id && (
                    <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={() => setShowThemePicker(!showThemePicker)}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${currentTheme.accent}, ${currentTheme.accent}bb)`,
            boxShadow: `0 4px 24px ${currentTheme.accent}40`,
          }}
          title="Change Theme"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
      </div>
    </div>
  );
}
