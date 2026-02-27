"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { getInitials } from "@/lib/utils";
import {
    X,
    Camera,
    Users,
    Edit3,
    Trash2,
    Crown,
    LogOut,
    Check,
} from "lucide-react";

interface GroupSettingsModalProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conversation: any;
    currentUser: Doc<"users">;
    onClose: () => void;
}

export default function GroupSettingsModal({
    conversation,
    currentUser,
    onClose,
}: GroupSettingsModalProps) {
    const updateSettings = useMutation(api.conversations.updateGroupSettings);
    const updateImage = useMutation(api.conversations.updateGroupImage);
    const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
    const leaveGroup = useMutation(api.conversations.leaveGroup);
    const deleteGroup = useMutation(api.conversations.deleteGroup);

    const [isEditingName, setIsEditingName] = useState(false);
    const [groupName, setGroupName] = useState(conversation.name || "");
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Find current user's role in this group
    const members = conversation.members || [];
    const isAdmin = conversation.createdBy === currentUser._id;

    const handleUpdateName = async () => {
        if (!groupName.trim() || groupName === conversation.name) {
            setIsEditingName(false);
            return;
        }
        setIsSaving(true);
        try {
            await updateSettings({
                conversationId: conversation._id,
                name: groupName.trim(),
            });
            setIsEditingName(false);
        } catch (error) {
            console.error("Failed to update group name:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLeaveGroup = async () => {
        if (!window.confirm("Are you sure you want to leave this group?")) return;
        setIsSaving(true);
        try {
            await leaveGroup({ conversationId: conversation._id });
            onClose();
        } catch (error) {
            console.error("Failed to leave group:", error);
            alert("Failed to leave group");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!window.confirm("Are you sure you want to delete this group for everyone? This action cannot be undone.")) return;
        setIsSaving(true);
        try {
            await deleteGroup({ conversationId: conversation._id });
            onClose();
        } catch (error) {
            console.error("Failed to delete group:", error);
            alert("Failed to delete group");
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const uploadUrl = await generateUploadUrl();
            const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await result.json();
            await updateImage({
                conversationId: conversation._id,
                storageId,
            });
        } catch (error) {
            console.error("Failed to upload group image:", error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md max-h-[85vh] overflow-hidden rounded-2xl animate-scale-in"
                style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-primary)",
                    boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ─── Header ─── */}
                <div
                    className="h-24 relative"
                    style={{ background: "var(--gradient-1)" }}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-xl bg-black/20 text-white hover:bg-black/40 transition-colors"
                    >
                        <X size={18} />
                    </button>
                    <div className="absolute -bottom-12 left-6">
                        <div className="relative group">
                            {conversation.groupImage ? (
                                <img
                                    src={conversation.groupImage}
                                    alt={conversation.name}
                                    className="w-24 h-24 rounded-2xl object-cover border-4"
                                    style={{ borderColor: "var(--bg-secondary)" }}
                                />
                            ) : (
                                <div
                                    className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold border-4"
                                    style={{
                                        background: "var(--gradient-2)",
                                        color: "white",
                                        borderColor: "var(--bg-secondary)",
                                    }}
                                >
                                    {getInitials(conversation.name || "G")}
                                </div>
                            )}

                            {isAdmin && (
                                <>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        disabled={isUploading}
                                    >
                                        {isUploading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Camera size={24} className="text-white" />
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─── Content ─── */}
                <div className="mt-14 px-6 pb-6 overflow-y-auto max-h-[calc(85vh-120px)]">
                    <div className="mb-6">
                        <div className="flex items-center justify-between group">
                            {isEditingName ? (
                                <div className="flex gap-2 w-full">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleUpdateName()}
                                        className="flex-1 bg-transparent border-b-2 border-[var(--accent)] outline-none text-xl font-bold py-1"
                                        style={{ color: "var(--text-primary)" }}
                                    />
                                    <button
                                        onClick={handleUpdateName}
                                        disabled={isSaving}
                                        className="p-1.5 rounded-lg bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20"
                                    >
                                        <Check size={18} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h2
                                        className="text-2xl font-black tracking-tight"
                                        style={{ color: "var(--text-primary)" }}
                                    >
                                        {conversation.name}
                                    </h2>
                                    {isAdmin && (
                                        <button
                                            onClick={() => setIsEditingName(true)}
                                            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] opacity-0 group-hover:opacity-100 transition-all text-[var(--accent)]"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
                            Secret Group · {members.length} members
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Members List */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Users size={14} className="text-[var(--accent)] opacity-60" />
                                <span
                                    className="text-[11px] font-black uppercase tracking-[0.2em]"
                                    style={{ color: "var(--text-tertiary)" }}
                                >
                                    Transmitted Members
                                </span>
                            </div>
                            <div className="space-y-2">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {members.map((member: any) => {
                                    const isMemberAdmin = member._id === conversation.createdBy;
                                    return (
                                        <div
                                            key={member._id}
                                            className="flex items-center justify-between p-2.5 rounded-2xl transition-all hover:bg-[var(--bg-hover)] group"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <div className="relative">
                                                    {member.imageUrl ? (
                                                        <img
                                                            src={member.imageUrl}
                                                            alt={member.name}
                                                            className="w-10 h-10 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform"
                                                        />
                                                    ) : (
                                                        <div
                                                            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-105 transition-transform"
                                                            style={{
                                                                background: "var(--bg-tertiary)",
                                                                color: "var(--text-secondary)",
                                                            }}
                                                        >
                                                            {getInitials(member.name)}
                                                        </div>
                                                    )}
                                                    {member.isOnline && member.showOnlineStatus && (
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--bg-secondary)]" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p
                                                        className="text-sm font-bold flex items-center gap-2"
                                                        style={{ color: "var(--text-primary)" }}
                                                    >
                                                        {member.name}
                                                        {member._id === currentUser._id && <span className="text-[10px] opacity-40">(You)</span>}
                                                        {isMemberAdmin && (
                                                            <Crown
                                                                size={12}
                                                                className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                                                            />
                                                        )}
                                                    </p>
                                                    <p
                                                        className="text-[11px] leading-tight opacity-60"
                                                        style={{ color: "var(--text-tertiary)" }}
                                                    >
                                                        {member.status || "Exploring the universe..."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 space-y-3 border-t border-[var(--border-primary)]">
                            <button
                                className="w-full h-12 flex items-center justify-between px-5 rounded-xl transition-all font-bold text-sm bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white group"
                                onClick={handleLeaveGroup}
                                disabled={isSaving}
                            >
                                <span>Leave Group</span>
                                <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            {isAdmin && (
                                <button
                                    className="w-full h-12 flex items-center justify-between px-5 rounded-xl transition-all font-bold text-sm bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20 group"
                                    onClick={handleDeleteGroup}
                                    disabled={isSaving}
                                >
                                    <span>Terminate Transmission (Delete)</span>
                                    <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
