"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getInitials } from "@/lib/utils";
import { X, Check, Users, Search } from "lucide-react";

interface NewGroupModalProps {
    onClose: () => void;
    onCreated: (id: Id<"conversations">) => void;
}

export default function NewGroupModal({
    onClose,
    onCreated,
}: NewGroupModalProps) {
    const allUsers = useQuery(api.users.listAll);
    const createGroup = useMutation(api.conversations.createGroup);
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState<Id<"users">[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const filteredUsers = searchQuery.trim()
        ? (allUsers || []).filter((u) =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : allUsers || [];

    const toggleMember = (userId: Id<"users">) => {
        setSelectedMembers((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        );
    };

    const handleCreate = async () => {
        if (!groupName.trim() || selectedMembers.length === 0) return;

        setIsCreating(true);
        try {
            const conversationId = await createGroup({
                name: groupName.trim(),
                memberIds: selectedMembers,
            });
            onCreated(conversationId);
        } catch (error) {
            console.error("Failed to create group:", error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-md mx-4 max-h-[80vh] rounded-2xl flex flex-col animate-scale-in"
                style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-primary)",
                    boxShadow: "var(--shadow-glow)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid var(--border-primary)" }}
                >
                    <h2
                        className="text-lg font-bold"
                        style={{ color: "var(--text-primary)" }}
                    >
                        New Group
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-5 py-4 flex-shrink-0 space-y-3">
                    {/* Group Name */}
                    <div>
                        <label
                            className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                            style={{ color: "var(--text-tertiary)" }}
                        >
                            Group Name
                        </label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="input-chat text-sm"
                            placeholder="Enter group name..."
                            maxLength={50}
                        />
                    </div>

                    {/* Selected Members */}
                    {selectedMembers.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {selectedMembers.map((id) => {
                                const user = allUsers?.find((u) => u._id === id);
                                return (
                                    <span
                                        key={id}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium animate-scale-in"
                                        style={{
                                            background: "var(--accent-light)",
                                            color: "var(--accent)",
                                            border: "1px solid var(--accent)",
                                        }}
                                    >
                                        {user?.name || "Unknown"}
                                        <button onClick={() => toggleMember(id)}>
                                            <X size={12} />
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2"
                            style={{ color: "var(--text-tertiary)" }}
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-chat pl-10 text-sm"
                            placeholder="Search users..."
                        />
                    </div>
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto px-2">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-8">
                            <Users
                                size={32}
                                className="mx-auto mb-2 opacity-30"
                                style={{ color: "var(--text-tertiary)" }}
                            />
                            <p
                                className="text-sm"
                                style={{ color: "var(--text-tertiary)" }}
                            >
                                No users found
                            </p>
                        </div>
                    ) : (
                        filteredUsers.map((user) => {
                            const isSelected = selectedMembers.includes(user._id);
                            return (
                                <button
                                    key={user._id}
                                    onClick={() => toggleMember(user._id)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                                    style={{
                                        background: isSelected
                                            ? "var(--accent-light)"
                                            : "transparent",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected)
                                            e.currentTarget.style.background = "var(--bg-hover)";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected)
                                            e.currentTarget.style.background = "transparent";
                                    }}
                                >
                                    <div className="relative flex-shrink-0">
                                        {user.imageUrl ? (
                                            <img
                                                src={user.imageUrl}
                                                alt={user.name}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                                                style={{
                                                    background: "var(--bg-tertiary)",
                                                    color: "var(--text-secondary)",
                                                }}
                                            >
                                                {getInitials(user.name)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p
                                            className="font-medium text-sm"
                                            style={{ color: "var(--text-primary)" }}
                                        >
                                            {user.name}
                                        </p>
                                        <p
                                            className="text-xs"
                                            style={{ color: "var(--text-tertiary)" }}
                                        >
                                            {user.email}
                                        </p>
                                    </div>
                                    <div
                                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                        style={{
                                            borderColor: isSelected
                                                ? "var(--accent)"
                                                : "var(--border-primary)",
                                            background: isSelected ? "var(--accent)" : "transparent",
                                        }}
                                    >
                                        {isSelected && <Check size={14} color="white" />}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Create Button */}
                <div className="px-5 py-4 flex-shrink-0">
                    <button
                        onClick={handleCreate}
                        disabled={
                            !groupName.trim() || selectedMembers.length === 0 || isCreating
                        }
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                        <Users size={18} />
                        {isCreating
                            ? "Creating..."
                            : `Create Group (${selectedMembers.length} members)`}
                    </button>
                </div>
            </div>
        </div>
    );
}
