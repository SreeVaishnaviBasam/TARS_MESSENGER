"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import ProfilePanel from "./ProfilePanel";
import EmptyChat from "./EmptyChat";

export default function ChatApp() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentUser = useQuery(api.users.currentUser);
    const setOnlineStatus = useMutation(api.users.setOnlineStatus);
    const createAIUser = useMutation(api.users.getOrCreateAIUser);

    const selectedConversationId = searchParams.get("id") as Id<"conversations"> | null;

    useEffect(() => {
        createAIUser();
    }, [createAIUser]);

    const [showProfile, setShowProfile] = useState(false);
    const [showMobileChat, setShowMobileChat] = useState(false);
    const offlineTimerRef = useRef<NodeJS.Timeout | null>(null);

    const theme = currentUser?.theme || "midnight";

    // Set online status with 5-second delay before going offline
    useEffect(() => {
        if (currentUser) {
            setOnlineStatus({ isOnline: true });

            const goOfflineDelayed = () => {
                // Clear any existing timer
                if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
                // Wait 5 seconds before actually going offline
                offlineTimerRef.current = setTimeout(() => {
                    setOnlineStatus({ isOnline: false });
                }, 5000);
            };

            const cancelOffline = () => {
                if (offlineTimerRef.current) {
                    clearTimeout(offlineTimerRef.current);
                    offlineTimerRef.current = null;
                }
                setOnlineStatus({ isOnline: true });
            };

            const handleBeforeUnload = () => {
                // On page close, set offline immediately (no delay)
                setOnlineStatus({ isOnline: false });
            };

            const handleVisibilityChange = () => {
                if (document.hidden) {
                    goOfflineDelayed();
                } else {
                    cancelOffline();
                }
            };

            window.addEventListener("beforeunload", handleBeforeUnload);
            document.addEventListener("visibilitychange", handleVisibilityChange);

            // Heartbeat every 30 seconds
            const heartbeat = setInterval(() => {
                if (!document.hidden) {
                    setOnlineStatus({ isOnline: true });
                }
            }, 30000);

            return () => {
                window.removeEventListener("beforeunload", handleBeforeUnload);
                document.removeEventListener(
                    "visibilitychange",
                    handleVisibilityChange
                );
                clearInterval(heartbeat);
                if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
                setOnlineStatus({ isOnline: false });
            };
        }
    }, [currentUser?._id]);

    const handleSelectConversation = useCallback(
        (id: Id<"conversations">) => {
            router.push(`?id=${id}`);
            setShowMobileChat(true);
        },
        [router]
    );

    const handleBack = useCallback(() => {
        router.push("/");
        setShowMobileChat(false);
    }, [router]);

    // sync showMobileChat with URL
    useEffect(() => {
        if (selectedConversationId) {
            setShowMobileChat(true);
        } else {
            setShowMobileChat(false);
        }
    }, [selectedConversationId]);

    if (!currentUser) {
        return (
            <div
                data-theme="midnight"
                className="h-[100dvh] flex items-center justify-center"
                style={{ background: "var(--bg-primary)" }}
            >
                <div className="flex gap-1.5">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                </div>
            </div>
        );
    }

    return (
        <div
            data-theme={theme}
            className="h-[100dvh] flex transition-theme overflow-hidden"
            style={{ background: "var(--bg-primary)" }}
        >
            {/* Sidebar */}
            <div
                className={`${showMobileChat ? "hidden md:flex" : "flex"
                    } w-full md:w-[340px] lg:w-[380px] xl:w-[400px] flex-shrink-0 flex-col h-[100dvh]`}
                style={{
                    borderRight: "1px solid var(--border-primary)",
                    background: "var(--bg-secondary)",
                }}
            >
                <Sidebar
                    currentUser={currentUser}
                    selectedConversation={selectedConversationId}
                    onSelectConversation={handleSelectConversation}
                    onShowProfile={() => setShowProfile(true)}
                />
            </div>

            {/* Chat Area */}
            <div
                className={`${showMobileChat ? "flex" : "hidden md:flex"
                    } flex-1 flex-col h-[100dvh] min-w-0`}
            >
                {selectedConversationId ? (
                    <ChatArea
                        conversationId={selectedConversationId}
                        currentUser={currentUser}
                        onBack={handleBack}
                    />
                ) : (
                    <EmptyChat />
                )}
            </div>

            {/* Profile Panel */}
            {showProfile && (
                <ProfilePanel
                    currentUser={currentUser}
                    onClose={() => setShowProfile(false)}
                />
            )}
        </div>
    );
}
