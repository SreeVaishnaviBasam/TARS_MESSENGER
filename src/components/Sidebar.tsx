"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useClerk } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { formatMessageTime, getInitials } from "@/lib/utils";
import {
    Search,
    MessageSquarePlus,
    Users,
    LogOut,
    X,
    Sparkles,
} from "lucide-react";
import NewGroupModal from "./NewGroupModal";
import NotesBar from "./NotesBar";

interface SidebarProps {
    currentUser: Doc<"users">;
    selectedConversation: Id<"conversations"> | null;
    onSelectConversation: (id: Id<"conversations">) => void;
    onShowProfile: () => void;
}

export default function Sidebar({
    currentUser,
    selectedConversation,
    onSelectConversation,
    onShowProfile,
}: SidebarProps) {
    const { signOut } = useClerk();
    const conversations = useQuery(api.conversations.list);
    const allUsers = useQuery(api.users.listAll);
    const createOrGetDM = useMutation(api.conversations.createOrGetDM);
    const getAIConversation = useMutation(api.conversations.getAIConversation);
    const notes = useQuery(api.notes.listActive);

    const [searchQuery, setSearchQuery] = useState("");
    const [showUserList, setShowUserList] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);

    const handleAIClick = async () => {
        try {
            const conversationId = await getAIConversation();
            onSelectConversation(conversationId);
        } catch (error) {
            console.error("Failed to start AI conversation:", error);
        }
    };

    const filteredUsers =
        searchQuery.trim().length > 0
            ? (allUsers || []).filter((u) =>
                u.name.toLowerCase().includes(searchQuery.toLowerCase()) && u.clerkId !== "tars-ai-bot"
            )
            : (allUsers || []).filter(u => u.clerkId !== "tars-ai-bot");

    const filteredConversations = searchQuery.trim()
        ? (conversations || []).filter((c) => {
            if (c?.isGroup) {
                return c.name?.toLowerCase().includes(searchQuery.toLowerCase());
            }
            return c?.otherUser?.name
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase());
        })
        : conversations || [];

    const handleUserClick = async (userId: Id<"users">) => {
        try {
            const conversationId = await createOrGetDM({ otherUserId: userId });
            onSelectConversation(conversationId);
            setShowUserList(false);
            setSearchQuery("");
        } catch (error) {
            console.error("Failed to create conversation:", error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
            {/* ─── Header ─── */}
            <div className="flex items-center justify-between px-6 py-5 backdrop-blur-md bg-[var(--bg-secondary)]/90 relative z-10 border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onShowProfile}
                        className="relative flex-shrink-0 group"
                    >
                        {currentUser.imageUrl ? (
                            <img
                                src={currentUser.imageUrl}
                                alt={currentUser.name}
                                className="w-9 h-9 rounded-full object-cover ring-2 ring-transparent group-hover:ring-[var(--accent)] transition-all"
                            />
                        ) : (
                            <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-transparent group-hover:ring-[var(--accent)] transition-all"
                                style={{
                                    background: "var(--gradient-1)",
                                    color: "var(--text-on-accent)",
                                }}
                            >
                                {getInitials(currentUser.name)}
                            </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--bg-secondary)]" />
                    </button>
                    <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                        TARS
                    </h1>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleAIClick}
                        className="p-2.5 rounded-xl transition-all hover:bg-[var(--bg-hover)] text-[var(--accent)] hover:scale-105 active:scale-95"
                        title="TARS AI"
                    >
                        <Sparkles size={19} />
                    </button>
                    <button
                        onClick={() => setShowGroupModal(true)}
                        className="p-2.5 rounded-xl transition-all hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title="New Group"
                    >
                        <Users size={19} />
                    </button>
                    <button
                        onClick={() => {
                            setShowUserList(!showUserList);
                            setSearchQuery("");
                        }}
                        className="p-2.5 rounded-xl transition-all hover:bg-[var(--bg-hover)]"
                        style={{ color: showUserList ? "var(--accent)" : "var(--text-secondary)" }}
                        title="New Chat"
                    >
                        <MessageSquarePlus size={19} />
                    </button>
                    <button
                        onClick={() => signOut()}
                        className="p-2.5 rounded-xl transition-all hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--danger)]"
                        title="Sign out"
                    >
                        <LogOut size={19} />
                    </button>
                </div>
            </div>


            {/* ─── Notes Bar ─── */}
            <NotesBar notes={notes || []} currentUser={currentUser} />

            {/* ─── Search ─── */}
            <div className="px-6 py-4">
                <div className="relative flex items-center group">
                    <div className="absolute left-4 flex items-center justify-center pointer-events-none">
                        <Search
                            size={16}
                            className="transition-colors group-focus-within:text-[var(--accent)]"
                            style={{ color: "var(--text-tertiary)" }}
                        />
                    </div>
                    <input
                        type="text"
                        placeholder={
                            showUserList ? "Search users..." : "Search conversations..."
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-10 py-3 rounded-2xl text-base outline-none transition-all font-medium"
                        style={{
                            background: "var(--bg-input)",
                            border: "1px solid var(--border-primary)",
                            color: "var(--text-primary)",
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 p-1 rounded-full hover:bg-[var(--bg-hover)] transition-colors"
                            style={{ color: "var(--text-tertiary)" }}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* ─── Main Content Area ─── */}
            <div className="flex-1 overflow-y-auto sidebar-scroll">
                {showUserList ? (
                    <div className="animate-fade-in px-2">
                        <div className="px-3 py-2 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                                Global Directory
                            </span>
                            <button
                                onClick={() => setShowUserList(false)}
                                className="p-1 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                                style={{ color: "var(--text-tertiary)" }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                        {filteredUsers.length === 0 ? (
                            <div className="px-5 py-16 text-center">
                                <Search size={40} className="mx-auto mb-4 opacity-10" />
                                <p className="text-sm text-[var(--text-tertiary)]">No explorers found</p>
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {filteredUsers.map((user) => (
                                    <button
                                        key={user._id}
                                        onClick={() => handleUserClick(user._id)}
                                        className="w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl transition-all hover:bg-[var(--bg-hover)] group"
                                    >
                                        <div className="relative flex-shrink-0">
                                            {user.imageUrl ? (
                                                <img
                                                    src={user.imageUrl}
                                                    alt={user.name}
                                                    className="w-11 h-11 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform"
                                                />
                                            ) : (
                                                <div
                                                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shadow-sm group-hover:scale-105 transition-transform"
                                                    style={{
                                                        background: "var(--gradient-1)",
                                                        color: "var(--text-on-accent)",
                                                    }}
                                                >
                                                    {getInitials(user.name)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-left min-w-0 flex-1">
                                            <p className="font-semibold text-[14px] text-[var(--text-primary)] truncate">
                                                {user.name}
                                            </p>
                                            <p className="text-[12px] text-[var(--text-tertiary)] truncate">
                                                {user.status || user.email}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-fade-in px-2">
                        {!conversations ? (
                            <div className="space-y-1">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="flex items-center gap-3.5 p-3 rounded-2xl">
                                        <div className="skeleton w-12 h-12 rounded-full flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="skeleton h-4 w-1/3 mb-2 rounded-lg" />
                                            <div className="skeleton h-3 w-2/3 rounded-lg" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="px-5 py-24 text-center">
                                {searchQuery.trim() && filteredUsers.length > 0 ? (
                                    <div className="text-left animate-fade-in px-2 -mt-20">
                                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] opacity-60 px-3 mb-2 block">
                                            Found in Explorers
                                        </span>
                                        <div className="space-y-0.5">
                                            {filteredUsers.map((user) => (
                                                <button
                                                    key={user._id}
                                                    onClick={() => handleUserClick(user._id)}
                                                    className="w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl transition-all hover:bg-[var(--bg-hover)] group"
                                                >
                                                    <div className="relative flex-shrink-0">
                                                        {user.imageUrl ? (
                                                            <img
                                                                src={user.imageUrl}
                                                                alt={user.name}
                                                                className="w-11 h-11 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shadow-sm group-hover:scale-105 transition-transform"
                                                                style={{
                                                                    background: "var(--gradient-1)",
                                                                    color: "var(--text-on-accent)",
                                                                }}
                                                            >
                                                                {getInitials(user.name)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-left min-w-0 flex-1">
                                                        <p className="font-semibold text-[14px] text-[var(--text-primary)] truncate">
                                                            {user.name}
                                                        </p>
                                                        <p className="text-[12px] text-[var(--text-tertiary)] truncate">
                                                            New Contact
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <MessageSquarePlus size={52} className="mx-auto mb-5 opacity-10" />
                                        <h3 className="font-bold text-[var(--text-secondary)] mb-1">
                                            {searchQuery ? "No matches" : "Silence is golden"}
                                        </h3>
                                        <p className="text-sm text-[var(--text-tertiary)] px-8">
                                            {searchQuery ? "Try searching for someone else" : "Start your first transmission today"}
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2 pb-6">
                                {filteredConversations.map((conversation) => (
                                    conversation && (
                                        <ConversationItem
                                            key={conversation._id}
                                            conversation={conversation}
                                            isSelected={selectedConversation === conversation._id}
                                            onClick={() => onSelectConversation(conversation._id)}
                                            currentUserId={currentUser._id}
                                        />
                                    )
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─── New Group Modal ─── */}
            {showGroupModal && (
                <NewGroupModal
                    onClose={() => setShowGroupModal(false)}
                    onCreated={(id) => {
                        onSelectConversation(id);
                        setShowGroupModal(false);
                    }}
                />
            )}
        </div>
    );
}

/* ─── Conversation Item Component ─────────────────────────── */
function ConversationItem({
    conversation,
    isSelected,
    onClick,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conversation: any;
    isSelected: boolean;
    onClick: () => void;
    currentUserId: Id<"users">;
}) {
    const displayName = conversation.isGroup
        ? conversation.name
        : conversation.otherUser?.name || "Unknown";

    const displayImage = conversation.isGroup
        ? conversation.groupImage
        : conversation.otherUser?.imageUrl;

    const isOnline =
        !conversation.isGroup &&
        conversation.otherUser?.isOnline &&
        conversation.otherUser?.showOnlineStatus;

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-5 py-5 rounded-[24px] transition-all group relative ${isSelected ? "premium-card shadow-lg" : "hover:bg-[var(--bg-hover)]"
                }`}
            style={{
                background: isSelected ? "var(--bg-active)" : "transparent",
                border: isSelected ? "1px solid var(--border-primary)" : "1px solid transparent",
            }}
        >
            {isSelected && (
                <div className="absolute left-1 top-3 bottom-3 w-1 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
            )}
            <div className="relative flex-shrink-0">
                {displayImage ? (
                    <img
                        src={displayImage}
                        alt={displayName}
                        className="w-14 h-14 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform"
                    />
                ) : (
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-bold group-hover:scale-105 transition-transform shadow-sm"
                        style={{
                            background: conversation.isGroup ? "var(--gradient-1)" : "var(--bg-tertiary)",
                            color: conversation.isGroup ? "var(--text-on-accent)" : "var(--text-secondary)",
                        }}
                    >
                        {conversation.isGroup ? <Users size={20} /> : getInitials(displayName)}
                    </div>
                )}
                {isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-[3px] border-[var(--bg-secondary)] shadow-sm" />
                )}
            </div>

            <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={`font-semibold text-[14px] truncate ${isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"}`}>
                        {displayName}
                    </p>
                    {conversation.lastMessageAt && (
                        <span className="text-[11px] font-medium opacity-40 tabular-nums flex-shrink-0">
                            {formatMessageTime(conversation.lastMessageAt)}
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-between gap-2">
                    <p className={`text-[13px] truncate leading-snug ${isSelected ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)]"}`}>
                        {conversation.lastMessage?.content || ""}
                    </p>
                    {conversation.unreadCount > 0 && (
                        <div className="unread-badge animate-bounce-in flex-shrink-0 shadow-md">
                            {conversation.unreadCount}
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}
