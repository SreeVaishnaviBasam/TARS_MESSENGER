"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { getInitials, THEMES } from "@/lib/utils";
import {
    X,
    Camera,
    Edit3,
    Save,
    Palette,
    Shield,
    Check,
    Sparkles,
} from "lucide-react";

interface ProfilePanelProps {
    currentUser: Doc<"users">;
    onClose: () => void;
}

export default function ProfilePanel({
    currentUser,
    onClose,
}: ProfilePanelProps) {
    const updateProfile = useMutation(api.users.updateProfile);
    const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
    const [name, setName] = useState(currentUser.name);
    const [bio, setBio] = useState(currentUser.bio || "");
    const [status, setStatus] = useState(currentUser.status || "");
    const [showOnline, setShowOnline] = useState(currentUser.showOnlineStatus);
    const [showRead, setShowRead] = useState(currentUser.showReadReceipts);
    const [showTyping, setShowTyping] = useState(currentUser.showTypingIndicator);
    const [selectedTheme, setSelectedTheme] = useState(currentUser.theme || "midnight");
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateProfile({
                name: name.trim() || currentUser.name,
                bio,
                status,
                theme: selectedTheme,
                showOnlineStatus: showOnline,
                showReadReceipts: showRead,
                showTypingIndicator: showTyping,
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update profile:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview immediately
        const reader = new FileReader();
        reader.onload = (ev) => setPreviewAvatarUrl(ev.target?.result as string);
        reader.readAsDataURL(file);

        setIsUploadingAvatar(true);
        try {
            const uploadUrl = await generateUploadUrl();
            const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await result.json();
            await updateProfile({ profileImageId: storageId });
        } catch (error) {
            console.error("Failed to upload avatar:", error);
            setPreviewAvatarUrl(null);
        } finally {
            setIsUploadingAvatar(false);
            if (avatarInputRef.current) avatarInputRef.current.value = "";
        }
    };

    const avatarSrc = previewAvatarUrl || currentUser.imageUrl;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Panel */}
            <div
                className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl animate-scale-in"
                style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-primary)",
                    boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ─── Header Banner ─── */}
                <div
                    className="relative h-24 rounded-t-2xl"
                    style={{ background: "var(--gradient-1)" }}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/20 text-white hover:bg-black/40 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ─── Avatar ─── */}
                <div className="flex flex-col items-center -mt-14 px-6">
                    <div className="relative group">
                        {avatarSrc ? (
                            <img
                                src={avatarSrc}
                                alt={currentUser.name}
                                className="w-32 h-32 rounded-3xl object-cover border-4 shadow-xl transition-all group-hover:scale-[1.02]"
                                style={{
                                    borderColor: "var(--bg-secondary)",
                                    opacity: isUploadingAvatar ? 0.6 : 1,
                                }}
                            />
                        ) : (
                            <div
                                className="w-32 h-32 rounded-3xl flex items-center justify-center text-4xl font-black border-4 shadow-xl"
                                style={{
                                    background: "var(--gradient-1)",
                                    color: "var(--text-on-accent)",
                                    borderColor: "var(--bg-secondary)",
                                }}
                            >
                                {getInitials(currentUser.name)}
                            </div>
                        )}

                        {/* Camera overlay */}
                        <input
                            type="file"
                            ref={avatarInputRef}
                            onChange={handleAvatarUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        <button
                            onClick={() => avatarInputRef.current?.click()}
                            className="absolute inset-0 rounded-3xl flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all cursor-pointer z-10"
                            disabled={isUploadingAvatar}
                            title="Upload Photo"
                        >
                            <Camera
                                size={28}
                                className="text-white opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100"
                            />
                        </button>

                        {isUploadingAvatar && (
                            <div className="absolute inset-0 rounded-3xl flex items-center justify-center bg-black/40 z-20">
                                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* AI Generate Button (New) */}
                    <button
                        onClick={async () => {
                            const prompt = window.prompt("Describe the avatar you want TARS AI to generate:");
                            if (!prompt) return;
                            setIsUploadingAvatar(true);
                            try {
                                const result = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 1000)}`);
                                if (result.ok) {
                                    setPreviewAvatarUrl(result.url);
                                    await updateProfile({ imageUrl: result.url });
                                }
                            } catch (e) {
                                console.error(e);
                            } finally {
                                setIsUploadingAvatar(false);
                            }
                        }}
                        className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all hover:scale-105 shadow-md"
                        style={{ background: "var(--gradient-1)", color: "white" }}
                    >
                        <Sparkles size={12} />
                        Generate with AI
                    </button>
                </div>

                <div className="px-6 py-5">
                    {/* ─── Name & Email ─── */}
                    <div className="text-center mb-6">
                        {isEditing ? (
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full text-center text-xl font-bold mb-1 px-4 py-2 rounded-xl outline-none"
                                style={{
                                    background: "var(--bg-input)",
                                    border: "1px solid var(--border-primary)",
                                    color: "var(--text-primary)",
                                }}
                            />
                        ) : (
                            <h2
                                className="text-xl font-bold mb-1"
                                style={{ color: "var(--text-primary)" }}
                            >
                                {currentUser.name}
                            </h2>
                        )}
                        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                            {currentUser.email}
                        </p>
                    </div>

                    {/* ─── Bio & Status ─── */}
                    <div className="space-y-4 mb-6">
                        <div>
                            <label
                                className="text-xs font-semibold uppercase tracking-wider mb-2 block"
                                style={{ color: "var(--text-tertiary)" }}
                            >
                                Bio
                            </label>
                            {isEditing ? (
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    className="w-full text-sm resize-none px-4 py-2.5 rounded-xl outline-none"
                                    style={{
                                        background: "var(--bg-input)",
                                        border: "1px solid var(--border-primary)",
                                        color: "var(--text-primary)",
                                    }}
                                    rows={2}
                                    placeholder="Tell people about yourself..."
                                    maxLength={150}
                                />
                            ) : (
                                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                                    {currentUser.bio || "No bio yet"}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                className="text-xs font-semibold uppercase tracking-wider mb-2 block"
                                style={{ color: "var(--text-tertiary)" }}
                            >
                                Status
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full text-sm px-4 py-2.5 rounded-xl outline-none"
                                    style={{
                                        background: "var(--bg-input)",
                                        border: "1px solid var(--border-primary)",
                                        color: "var(--text-primary)",
                                    }}
                                    placeholder="What's on your mind?"
                                    maxLength={50}
                                />
                            ) : (
                                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                                    {currentUser.status || "No status set"}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ─── Theme Selection ─── */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Palette size={14} style={{ color: "var(--text-tertiary)" }} />
                            <span
                                className="text-xs font-semibold uppercase tracking-wider"
                                style={{ color: "var(--text-tertiary)" }}
                            >
                                Theme
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {THEMES.map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => {
                                        setSelectedTheme(theme.id);
                                        if (!isEditing) updateProfile({ theme: theme.id });
                                    }}
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                                    style={{
                                        background:
                                            selectedTheme === theme.id
                                                ? "var(--accent-light)"
                                                : "var(--bg-tertiary)",
                                        border:
                                            selectedTheme === theme.id
                                                ? "2px solid var(--accent)"
                                                : "2px solid transparent",
                                        color: "var(--text-primary)",
                                    }}
                                >
                                    <span>{theme.icon}</span>
                                    <span className="truncate text-xs">{theme.name}</span>
                                    {selectedTheme === theme.id && (
                                        <Check size={12} className="ml-auto flex-shrink-0" style={{ color: "var(--accent)" }} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ─── Privacy Settings ─── */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Shield size={14} style={{ color: "var(--text-tertiary)" }} />
                            <span
                                className="text-xs font-semibold uppercase tracking-wider"
                                style={{ color: "var(--text-tertiary)" }}
                            >
                                Privacy
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            <ToggleSetting
                                label="Show Online Status"
                                description="Let others see when you're online"
                                checked={showOnline}
                                onChange={(v) => {
                                    setShowOnline(v);
                                    if (!isEditing) updateProfile({ showOnlineStatus: v });
                                }}
                            />
                            <ToggleSetting
                                label="Read Receipts"
                                description="Show blue ticks when you read messages"
                                checked={showRead}
                                onChange={(v) => {
                                    setShowRead(v);
                                    if (!isEditing) updateProfile({ showReadReceipts: v });
                                }}
                            />
                            <ToggleSetting
                                label="Typing Indicator"
                                description="Show when you're typing"
                                checked={showTyping}
                                onChange={(v) => {
                                    setShowTyping(v);
                                    if (!isEditing) updateProfile({ showTypingIndicator: v });
                                }}
                            />
                        </div>
                    </div>

                    {/* ─── Actions ─── */}
                    <div className="flex gap-2.5">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setName(currentUser.name);
                                        setBio(currentUser.bio || "");
                                        setStatus(currentUser.status || "");
                                    }}
                                    className="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                                    style={{
                                        background: "var(--bg-tertiary)",
                                        color: "var(--text-secondary)",
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                                    style={{
                                        background: "var(--gradient-2)",
                                        color: "var(--text-on-accent)",
                                    }}
                                >
                                    <Save size={16} />
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                                style={{
                                    background: "var(--gradient-2)",
                                    color: "var(--text-on-accent)",
                                }}
                            >
                                <Edit3 size={16} />
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Toggle Setting Component ─────────────────────────── */
function ToggleSetting({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-colors"
            style={{ background: "var(--bg-tertiary)" }}
            onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-hover)")
            }
            onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--bg-tertiary)")
            }
        >
            <div className="text-left">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {description}
                </p>
            </div>
            <div
                className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
                style={{
                    background: checked ? "var(--accent)" : "var(--bg-hover)",
                }}
            >
                <div
                    className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm"
                    style={{
                        left: checked ? "22px" : "2px",
                    }}
                />
            </div>
        </button>
    );
}
