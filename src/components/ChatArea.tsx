"use client";

import {
    useState,
    useEffect,
    useRef,
    useCallback,
    FormEvent,
} from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { formatMessageTime, getInitials, REACTION_EMOJIS } from "@/lib/utils";
import {
    ArrowLeft,
    Send,
    Smile,
    Paperclip,
    ChevronDown,
    Trash2,
    Check,
    CheckCheck,
    X,
    MoreVertical,
    AlertCircle,
    RefreshCw,
    Sparkles,
    Users,
    FileIcon,
    Phone,
    VideoIcon,
    Info,
    Search,
} from "lucide-react";
import GroupSettingsModal from "./GroupSettingsModal";

interface ChatAreaProps {
    conversationId: Id<"conversations">;
    currentUser: Doc<"users">;
    onBack: () => void;
}

export default function ChatArea({
    conversationId,
    currentUser,
    onBack,
}: ChatAreaProps) {
    const conversation = useQuery(api.conversations.get, { conversationId });
    const messages = useQuery(api.messages.list, { conversationId });
    const typingUsers = useQuery(api.messages.getTyping, { conversationId });
    const sendMessage = useMutation(api.messages.send);
    const setTyping = useMutation(api.messages.setTyping);
    const markRead = useMutation(api.messages.markRead);
    const markDelivered = useMutation(api.messages.markDelivered);
    const markConversationRead = useMutation(api.conversations.markAsRead);
    const deleteMessage = useMutation(api.messages.deleteMessage);
    const toggleReaction = useMutation(api.messages.toggleReaction);
    const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
    const aiChatAndRespond = useAction(api.ai.chatAndRespond);
    const aiGenerateImage = useAction(api.ai.generateImage);

    const [messageText, setMessageText] = useState("");
    const [showNewMessageButton, setShowNewMessageButton] = useState(false);
    const [showReactionsFor, setShowReactionsFor] = useState<Id<"messages"> | null>(null);
    const [showMenuFor, setShowMenuFor] = useState<Id<"messages"> | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    const [failedMessage, setFailedMessage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const [isAITyping, setIsAITyping] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isNearBottomRef = useRef(true);
    const prevMessagesLengthRef = useRef(0);

    const displayName = conversation?.isGroup
        ? conversation.name
        : conversation?.otherUser?.name || "Loading...";

    const displayImage = conversation?.isGroup
        ? conversation.groupImage
        : conversation?.otherUser?.imageUrl;

    const otherUserOnline =
        !conversation?.isGroup &&
        conversation?.otherUser?.isOnline &&
        conversation?.otherUser?.showOnlineStatus;

    // Mark delivered and read
    useEffect(() => {
        const handleMarkRead = () => {
            // Only mark as read if the window is truly focused and visible
            if (conversationId && document.visibilityState === "visible" && document.hasFocus()) {
                markDelivered({ conversationId });
                markRead({ conversationId });
                markConversationRead({ conversationId });
            }
        };

        // Initial check with a small delay to ensure focus is correct
        const timeout = setTimeout(handleMarkRead, 1000);

        const events = ["visibilitychange", "focus", "mousedown", "keydown"];
        events.forEach(ev => window.addEventListener(ev, handleMarkRead));

        return () => {
            clearTimeout(timeout);
            events.forEach(ev => window.removeEventListener(ev, handleMarkRead));
        };
    }, [conversationId, messages?.length, markRead, markDelivered, markConversationRead]);

    // Scroll management
    const checkIfNearBottom = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const threshold = 100;
        const isNear =
            container.scrollHeight - container.scrollTop - container.clientHeight <
            threshold;
        isNearBottomRef.current = isNear;
        if (isNear) setShowNewMessageButton(false);
    }, []);

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        container.addEventListener("scroll", checkIfNearBottom);
        return () => container.removeEventListener("scroll", checkIfNearBottom);
    }, [checkIfNearBottom]);

    useEffect(() => {
        if (!messages) return;
        if (messages.length > prevMessagesLengthRef.current) {
            const lastMsg = messages[messages.length - 1];
            const isMine = lastMsg?.senderId === currentUser._id;
            if (isMine || isNearBottomRef.current) {
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 50);
            } else {
                setShowNewMessageButton(true);
            }
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages?.length, currentUser._id]);

    useEffect(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView();
        }, 100);
    }, [conversationId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowNewMessageButton(false);
    };

    // Typing indicator
    const handleTyping = useCallback(() => {
        if (!currentUser.showTypingIndicator) return;
        setTyping({ conversationId, isTyping: true });
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            setTyping({ conversationId, isTyping: false });
        }, 2000);
    }, [conversationId, currentUser.showTypingIndicator, setTyping]);

    // Send message
    const handleSend = async (e?: FormEvent) => {
        e?.preventDefault();
        if (!messageText.trim()) return;

        const text = messageText.trim();
        setMessageText("");
        setSendError(null);
        setFailedMessage(null);

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        setTyping({ conversationId, isTyping: false });

        try {
            // Check if this is a conversation with the AI bot
            const isAIBot = conversation?.otherUser?.clerkId === "tars-ai-bot";

            await sendMessage({ conversationId, content: text, messageType: "text" });

            if (isAIBot) {
                setIsAITyping(true);
                try {
                    const history = (messages || [])
                        .slice(-5)
                        .map(m => ({
                            role: m.senderId === currentUser._id ? "user" : "assistant",
                            content: m.content
                        }));

                    // Single action that fetches AI response AND saves it as a message
                    await aiChatAndRespond({
                        conversationId,
                        message: text,
                        conversationHistory: history
                    });
                } catch (error) {
                    console.error("AI error:", error);
                    setSendError("TARS AI couldn't respond. Try again.");
                } finally {
                    setIsAITyping(false);
                }
            }
        } catch {
            setSendError("Failed to send message");
            setFailedMessage(text);
        }
    };

    const handleRetry = () => {
        if (!failedMessage) return;
        setMessageText(failedMessage);
        setSendError(null);
        setFailedMessage(null);
    };

    // File upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
            const messageType = file.type.startsWith("image/")
                ? "image"
                : file.type.startsWith("video/")
                    ? "video"
                    : "file";
            await sendMessage({
                conversationId,
                content: file.name,
                messageType,
                fileName: file.name,
                fileStorageId: storageId,
            });
        } catch {
            setSendError("Failed to upload file");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const quickEmojis = ["😊", "😂", "❤️", "👍", "🔥", "💯", "🎉", "😎"];

    return (
        <div
            className="flex flex-col h-full relative"
            style={{ background: "var(--bg-chat)" }}
        >
            {/* ─── Header ─── */}
            <div
                className="flex items-center px-6 py-5 flex-shrink-0 gap-5 backdrop-blur-md z-20"
                style={{
                    background: "var(--bg-secondary)",
                    borderBottom: "1px solid var(--border-primary)",
                }}
            >
                {/* Back button (mobile) */}
                <button
                    onClick={onBack}
                    className="md:hidden p-3 -ml-2 rounded-2xl transition-all hover:bg-[var(--bg-hover)] flex-shrink-0"
                    style={{ color: "var(--text-secondary)" }}
                >
                    <ArrowLeft size={24} />
                </button>

                {/* Avatar & Name Area (Clickable) */}
                <div
                    className="flex items-center gap-5 flex-1 min-w-0 cursor-pointer group"
                    onClick={() => {
                        if (conversation?.isGroup) setShowGroupSettings(true);
                    }}
                >
                    <div className="relative flex-shrink-0 transition-transform group-hover:scale-105">
                        {displayImage ? (
                            <img
                                src={displayImage}
                                alt={displayName || ""}
                                className="w-13 h-13 rounded-2xl object-cover shadow-md ring-1 ring-[var(--border-primary)]"
                            />
                        ) : (
                            <div
                                className="w-13 h-13 rounded-2xl flex items-center justify-center text-sm font-black shadow-md"
                                style={{
                                    background: conversation?.isGroup
                                        ? "var(--gradient-1)"
                                        : "var(--bg-tertiary)",
                                    color: conversation?.isGroup
                                        ? "var(--text-on-accent)"
                                        : "var(--text-secondary)",
                                }}
                            >
                                {conversation?.isGroup ? (
                                    <Users size={24} />
                                ) : (
                                    getInitials(displayName || "?")
                                )}
                            </div>
                        )}
                        {otherUserOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-4 border-[var(--bg-secondary)] shadow-sm" />
                        )}
                    </div>

                    <div className="min-w-0">
                        <h2
                            className="font-black text-[20px] truncate leading-tight mb-0.5 group-hover:text-[var(--accent)] transition-colors"
                            style={{ color: "var(--text-primary)" }}
                        >
                            {displayName}
                        </h2>
                        <div className="flex items-center gap-2 overflow-hidden text-[13px] font-bold opacity-60">
                            {otherUserOnline && <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" />}
                            <p
                                className="truncate"
                                style={{ color: otherUserOnline ? "#10b981" : "var(--text-tertiary)" }}
                            >
                                {conversation?.isGroup
                                    ? `${conversation.members?.length || 0} members`
                                    : otherUserOnline
                                        ? "Online now"
                                        : "Offline"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                    <button
                        className="p-3 rounded-2xl transition-all hover:bg-[var(--bg-hover)] hover:scale-110 active:scale-95 text-[var(--text-secondary)]"
                        title="Search Messenger"
                    >
                        <Search size={22} />
                    </button>
                    <button
                        className="p-3 rounded-2xl transition-all hover:bg-[var(--bg-hover)] hover:scale-110 active:scale-95 text-[var(--text-secondary)] hidden sm:flex"
                        title="Voice Call"
                    >
                        <Phone size={22} />
                    </button>
                    <button
                        className="p-3 rounded-2xl transition-all hover:bg-[var(--bg-hover)] hover:scale-110 active:scale-95 text-[var(--text-secondary)] hidden sm:flex"
                        title="Video Call"
                    >
                        <VideoIcon size={22} />
                    </button>
                    {conversation?.isGroup && (
                        <button
                            className="p-3 rounded-2xl transition-all hover:bg-[var(--bg-hover)] hover:scale-110 active:scale-95 text-[var(--text-secondary)]"
                            title="Group Settings"
                            onClick={() => setShowGroupSettings(true)}
                        >
                            <Info size={22} />
                        </button>
                    )}
                    <button
                        className="p-3 rounded-2xl transition-all hover:bg-[var(--bg-hover)] hover:scale-110 active:scale-95 text-[var(--text-secondary)]"
                        title="More Options"
                    >
                        <MoreVertical size={22} />
                    </button>
                </div>
            </div>

            {/* ─── Group Settings Modal ─── */}
            {showGroupSettings && conversation?.isGroup && (
                <GroupSettingsModal
                    conversation={conversation}
                    currentUser={currentUser}
                    onClose={() => setShowGroupSettings(false)}
                />
            )}

            {/* ─── Messages ─── */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-10 sm:px-24 py-16 relative mesh-gradient scroll-smooth"
            >
                {!messages ? (
                    <div className="space-y-6">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`skeleton ${i % 2 === 0 ? "w-64" : "w-72"} h-14 rounded-3xl`} />
                            </div>
                        ))}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in px-4">
                        <div
                            className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                            style={{ background: "var(--bg-tertiary)" }}
                        >
                            <Send
                                size={40}
                                style={{ color: "var(--text-tertiary)" }}
                                className="opacity-50"
                            />
                        </div>
                        <p className="text-xl font-black mb-2" style={{ color: "var(--text-secondary)" }}>
                            Open a Conversation
                        </p>
                        <p className="text-base max-w-sm opacity-60" style={{ color: "var(--text-tertiary)" }}>
                            Select or start a chat to begin messaging.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {messages.map((message, index) => {
                            const isMine = message.senderId === currentUser._id;
                            const showAvatar =
                                !isMine &&
                                (index === 0 ||
                                    messages[index - 1]?.senderId !== message.senderId);
                            const isLastInGroup =
                                index === messages.length - 1 ||
                                messages[index + 1]?.senderId !== message.senderId;

                            return (
                                <MessageBubble
                                    key={message._id}
                                    message={message}
                                    isMine={isMine}
                                    showAvatar={showAvatar}
                                    isLastInGroup={isLastInGroup}
                                    currentUserId={currentUser._id}
                                    showReactions={showReactionsFor === message._id}
                                    showMenu={showMenuFor === message._id}
                                    onToggleReactions={() =>
                                        setShowReactionsFor(
                                            showReactionsFor === message._id ? null : message._id
                                        )
                                    }
                                    onToggleMenu={() =>
                                        setShowMenuFor(
                                            showMenuFor === message._id ? null : message._id
                                        )
                                    }
                                    onReact={(emoji) => {
                                        toggleReaction({ messageId: message._id, emoji });
                                        setShowReactionsFor(null);
                                    }}
                                    onDelete={() => {
                                        deleteMessage({ messageId: message._id });
                                        setShowMenuFor(null);
                                    }}
                                    onClose={() => {
                                        setShowReactionsFor(null);
                                        setShowMenuFor(null);
                                    }}
                                    isGroup={conversation?.isGroup || false}
                                />
                            );
                        })}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ─── Typing Indicators ─── */}
            <div className="px-8 py-2 space-y-2">
                {typingUsers && typingUsers.length > 0 && (
                    <div className="flex items-center gap-4 animate-fade-in">
                        <div className="flex -space-x-3">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {typingUsers?.map((u: any) => (
                                <div key={u?.userId || u?._id} className="w-8 h-8 rounded-full border-4 border-[var(--bg-chat)] flex-shrink-0">
                                    {u.imageUrl ? (
                                        <img src={u.imageUrl} alt={u.name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[8px] font-black">
                                            {getInitials(u.name)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 items-center bg-[var(--bg-secondary)] px-4 py-2 rounded-2xl border border-[var(--border-primary)] shadow-md">
                            <span className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>
                                {typingUsers.length === 1 ? `${typingUsers[0]?.name} is typing` : "Multiple people typing"}
                            </span>
                            <div className="flex gap-1 ml-1">
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                            </div>
                        </div>
                    </div>
                )}

                {isAITyping && (
                    <div className="flex items-center gap-4 animate-fade-in">
                        <div className="w-8 h-8 rounded-full bg-[var(--gradient-1)] flex items-center justify-center text-white ring-4 ring-[var(--bg-chat)]">
                            <Sparkles size={14} />
                        </div>
                        <div className="flex gap-2 items-center bg-[var(--bg-secondary)] px-4 py-2 rounded-2xl border border-[var(--border-primary)] shadow-md">
                            <span className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>
                                TARS AI is processing
                            </span>
                            <div className="flex gap-1 ml-1">
                                <div className="typing-dot" style={{ background: "var(--gradient-1)" }} />
                                <div className="typing-dot" style={{ background: "var(--gradient-1)" }} />
                                <div className="typing-dot" style={{ background: "var(--gradient-1)" }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Scroll to bottom ─── */}
            {showNewMessageButton && (
                <div className="absolute bottom-28 right-6 z-10">
                    <button
                        onClick={scrollToBottom}
                        className="flex items-center justify-center w-10 h-10 rounded-full shadow-xl animate-slide-up transition-all hover:scale-110 active:scale-95"
                        style={{
                            background: "var(--accent)",
                            color: "var(--text-on-accent)",
                        }}
                    >
                        <ChevronDown size={20} />
                    </button>
                </div>
            )}

            {/* ─── Error state ─── */}
            {sendError && (
                <div
                    className="mx-6 mb-4 px-6 py-4 rounded-2xl flex items-center justify-between animate-slide-up shadow-lg"
                    style={{
                        background: "rgba(239, 68, 68, 0.12)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        color: "var(--danger)",
                    }}
                >
                    <div className="flex items-center gap-3 text-sm font-bold">
                        <AlertCircle size={20} />
                        {sendError}
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={handleRetry} className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                            <RefreshCw size={16} /> Retry
                        </button>
                        <button onClick={() => { setSendError(null); setFailedMessage(null); }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            <div
                className="px-8 py-8 flex-shrink-0"
                style={{
                    background: "var(--bg-secondary)",
                    borderTop: "1px solid var(--border-primary)",
                }}
            >
                {/* Quick emoji bar */}
                {showEmojiPicker && (
                    <div
                        className="flex gap-4 mb-4 px-4 py-3 rounded-2xl animate-slide-up shadow-inner"
                        style={{ background: "var(--bg-tertiary)" }}
                    >
                        {quickEmojis.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    setMessageText((prev) => prev + emoji);
                                    setShowEmojiPicker(false);
                                }}
                                className="text-2xl hover:scale-125 transition-transform"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                {/* ─── Message Input ─── */}
                <form
                    onSubmit={handleSend}
                    className="max-w-5xl mx-auto flex items-center gap-6"
                >
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-3.5 rounded-2xl flex-shrink-0 transition-all hover:bg-[var(--bg-hover)]"
                        style={{ color: showEmojiPicker ? "var(--accent)" : "var(--text-tertiary)" }}
                    >
                        <Smile size={28} />
                    </button>

                    {/* File upload */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3.5 rounded-2xl flex-shrink-0 transition-all hover:bg-[var(--bg-hover)]"
                        style={{ color: "var(--text-tertiary)" }}
                        disabled={isUploading}
                    >
                        <Paperclip size={28} />
                    </button>

                    {/* Input */}
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={messageText}
                            onChange={(e) => {
                                setMessageText(e.target.value);
                                handleTyping();
                            }}
                            placeholder={
                                isUploading ? "Uploading..." : "Type a message..."
                            }
                            className="input-chat !py-5 !px-8 !text-lg !rounded-[24px] shadow-sm"
                            disabled={isUploading}
                        />
                    </div>

                    {/* Send */}
                    <button
                        type="submit"
                        disabled={!messageText.trim() || isUploading}
                        className="p-4 rounded-2xl flex-shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 shadow-xl"
                        style={{
                            background: messageText.trim()
                                ? "var(--gradient-1)"
                                : "var(--bg-tertiary)",
                            color: "var(--text-on-accent)",
                        }}
                    >
                        <Send size={26} />
                    </button>
                </form>
            </div>
        </div>
    );
}

/* ─── Message Bubble Component ──────────────────────────── */
function MessageBubble({
    message,
    isMine,
    showAvatar,
    isLastInGroup,
    currentUserId,
    showReactions,
    showMenu,
    onToggleReactions,
    onToggleMenu,
    onReact,
    onDelete,
    onClose,
    isGroup,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: any;
    isMine: boolean;
    showAvatar: boolean;
    isLastInGroup: boolean;
    currentUserId: Id<"users">;
    showReactions: boolean;
    showMenu: boolean;
    onToggleReactions: () => void;
    onToggleMenu: () => void;
    onReact: (emoji: string) => void;
    onDelete: () => void;
    onClose: () => void;
    isGroup: boolean;
}) {
    const fileUrl = useQuery(
        api.messages.getFileUrl,
        message.fileStorageId ? { storageId: message.fileStorageId } : "skip"
    );

    // Determine tick status
    const getTickStatus = () => {
        if (!isMine) return null;

        // Ensure we are comparing comparable IDs (as strings)
        const myIdStr = currentUserId.toString();
        const readByOthers = message.readBy?.filter((id: string) => id.toString() !== myIdStr) || [];

        if (readByOthers.length > 0) return "read";
        if (message.deliveredTo && message.deliveredTo.length > 0) return "delivered";
        return "sent";
    };

    const tickStatus = getTickStatus();

    // Deleted message
    if (message.isDeleted) {
        return (
            <div className={`flex ${isMine ? "justify-end" : "justify-start"} py-1`}>
                <div
                    className="px-6 py-3 rounded-2xl text-[13px] italic"
                    style={{
                        color: "var(--text-tertiary)",
                        background: "var(--bg-tertiary)",
                        opacity: 0.6,
                    }}
                >
                    🚫 This transmission was deleted
                </div>
            </div>
        );
    }

    return (
        <div
            className={`flex ${isMine ? "justify-end" : "justify-start"} py-2.5 group items-end`}
            onClick={() => {
                if (showReactions || showMenu) onClose();
            }}
        >
            {/* Avatar for others */}
            {!isMine && (
                <div className="w-12 mr-4 flex-shrink-0">
                    {showAvatar ? (
                        <div className="relative">
                            {message.sender?.imageUrl ? (
                                <img
                                    src={message.sender.imageUrl}
                                    alt=""
                                    className="w-11 h-11 rounded-[1.25rem] object-cover mt-1 transition-transform group-hover:scale-105 shadow-md"
                                />
                            ) : (
                                <div
                                    className="w-11 h-11 rounded-[1.25rem] flex items-center justify-center text-[11px] font-black mt-1 shadow-md"
                                    style={{
                                        background: "var(--bg-tertiary)",
                                        color: "var(--text-secondary)",
                                    }}
                                >
                                    {getInitials(message.sender?.name || "?")}
                                </div>
                            )}
                            {message.sender?.isOnline && (
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[var(--bg-chat)] shadow-sm" />
                            )}
                        </div>
                    ) : null}
                </div>
            )}

            <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                {/* Sender name in groups */}
                {isGroup && !isMine && showAvatar && (
                    <p
                        className="text-[12px] font-black tracking-widest uppercase mb-2 ml-1 opacity-80"
                        style={{ color: "var(--accent)" }}
                    >
                        {message.sender?.name}
                    </p>
                )}

                <div className={`relative ${isMine ? "message-sent" : "message-received"} shadow-lg transition-all hover:shadow-xl`}>
                    {/* Message content */}
                    <div className="px-7 py-5">
                        {/* AI message label */}
                        {message.messageType === "ai" && (
                            <div className="flex items-center gap-2 mb-3 p-1.5 rounded-xl bg-black/10 w-fit">
                                <Sparkles size={14} style={{ color: isMine ? "rgba(255,255,255,0.9)" : "var(--accent)" }} />
                                <span className="text-[11px] font-black uppercase tracking-widest opacity-80">
                                    TARS AI Core
                                </span>
                            </div>
                        )}

                        {/* Text content */}
                        {message.content && message.messageType !== "image" && message.messageType !== "video" && (
                            <p className="text-[16px] leading-[1.6] whitespace-pre-wrap break-words" style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
                                {message.content}
                            </p>
                        )}

                        {/* Image content */}
                        {message.messageType === "image" && (
                            <div className="relative group/media overflow-hidden rounded-2xl shadow-inner">
                                <img
                                    src={fileUrl || message.fileUrl}
                                    alt="Message image"
                                    className="max-w-full max-h-[450px] object-contain rounded-2xl transition-transform group-hover/media:scale-[1.02]"
                                />
                                {message.content && (
                                    <p className="mt-3 text-[14px] leading-relaxed opacity-90 border-t border-white/10 pt-3">
                                        {message.content}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Video content */}
                        {message.messageType === "video" && (
                            <div className="rounded-2xl overflow-hidden shadow-inner">
                                <video
                                    src={fileUrl || message.fileUrl}
                                    controls
                                    className="max-w-full max-h-[450px] rounded-2xl"
                                />
                                {message.content && (
                                    <p className="mt-3 text-[14px] opacity-90 border-t border-white/10 pt-3">
                                        {message.content}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* File content */}
                        {message.messageType === "file" && (
                            <a
                                href={fileUrl || message.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 p-4 rounded-2xl bg-black/10 hover:bg-black/20 transition-all border border-white/5"
                            >
                                <div className="p-3 rounded-xl bg-white/10">
                                    <FileIcon size={24} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[15px] font-bold truncate">
                                        {message.fileName || message.content}
                                    </p>
                                    <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mt-1">
                                        Download Transmission
                                    </p>
                                </div>
                            </a>
                        )}

                        {/* Timestamp & Status */}
                        <div className={`flex items-center gap-1.5 mt-2 text-[10px] font-medium opacity-50 ${isMine ? "justify-end" : "justify-start"}`}>
                            <span>{formatMessageTime(message._creationTime)}</span>
                            {isMine && tickStatus && (
                                <div className="ml-1 scale-125">
                                    {tickStatus === "sent" && <Check size={13} />}
                                    {tickStatus === "delivered" && <CheckCheck size={13} />}
                                    {tickStatus === "read" && (
                                        <CheckCheck size={14} className="text-blue-tick drop-shadow-[0_0_8px_var(--blue-tick)]" />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Reactions List */}
                    {message.reactions && message.reactions.length > 0 && (
                        <div className={`absolute -bottom-4 ${isMine ? "right-3" : "left-3"} flex flex-wrap gap-1.5 z-10`}>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {message.reactions.map((r: any) => {
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */ }
                                const isMyReaction = r.users.some((u: any) => (u?.userId || u) === currentUserId);
                                return (
                                    <button
                                        key={r.emoji}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onReact(r.emoji);
                                        }}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[13px] shadow-lg transition-all hover:scale-110 active:scale-90 ${isMyReaction
                                            ? "bg-[var(--accent)] text-white border-2 border-white/20"
                                            : "bg-[var(--bg-secondary)] border border-[var(--border-primary)]"
                                            }`}
                                    >
                                        <span>{r.emoji}</span>
                                        <span className="font-bold">{r.users.length}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Hover actions trigger */}
                    <div className={`absolute top-2 ${isMine ? "-left-14" : "-right-14"} opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1`}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleReactions();
                            }}
                            className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xl hover:scale-110 active:scale-95 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all"
                        >
                            <Smile size={18} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleMenu();
                            }}
                            className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xl hover:scale-110 active:scale-95 text-[var(--text-secondary)] hover:text-[var(--danger)] transition-all"
                        >
                            <MoreVertical size={18} />
                        </button>
                    </div>

                    {/* Reaction Picker Overlay */}
                    {showReactions && (
                        <div
                            className={`absolute -top-14 ${isMine ? "right-0" : "left-0"} flex items-center gap-2 p-2.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-50 animate-bounce-in`}
                        >
                            {REACTION_EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onReact(emoji);
                                    }}
                                    className="text-2xl hover:scale-150 transition-transform px-1.5"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Message Menu */}
                    {showMenu && (
                        <div
                            className={`absolute top-12 ${isMine ? "right-0" : "left-0"} p-2 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-50 min-w-[180px] animate-slide-up`}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                                <Trash2 size={18} />
                                Delete Transaction
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
