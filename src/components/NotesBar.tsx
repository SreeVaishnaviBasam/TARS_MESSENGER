"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { getInitials, NOTE_EMOJIS } from "@/lib/utils";
import { Plus, X, StickyNote } from "lucide-react";

interface NotesBarProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notes: any[];
    currentUser: Doc<"users">;
}

export default function NotesBar({ notes, currentUser }: NotesBarProps) {
    const createNote = useMutation(api.notes.create);
    const deleteNote = useMutation(api.notes.deleteMyNote);
    const [showCreate, setShowCreate] = useState(false);
    const [noteContent, setNoteContent] = useState("");
    const [noteEmoji, setNoteEmoji] = useState("💭");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedNote, setSelectedNote] = useState<any | null>(null);

    const myNote = notes.find(
        (n) => n.userId === currentUser._id
    );

    const handleCreate = async () => {
        if (!noteContent.trim()) return;
        try {
            await createNote({
                content: noteContent.trim(),
                emoji: noteEmoji,
            });
            setNoteContent("");
            setShowCreate(false);
        } catch (error) {
            console.error("Failed to create note:", error);
        }
    };

    if (notes.length === 0 && !showCreate) {
        return (
            <div
                className="px-4 py-2"
                style={{ borderBottom: "1px solid var(--border-secondary)" }}
            >
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl w-full transition-colors text-sm"
                    style={{
                        background: "var(--bg-tertiary)",
                        color: "var(--text-tertiary)",
                    }}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--bg-hover)")
                    }
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "var(--bg-tertiary)")
                    }
                >
                    <StickyNote size={14} />
                    Add a note...
                </button>
            </div>
        );
    }

    return (
        <div
            style={{ borderBottom: "1px solid var(--border-secondary)" }}
        >
            <div className="flex gap-3 px-4 py-3 overflow-x-auto">
                {/* My Note / Create */}
                <button
                    onClick={() =>
                        myNote
                            ? setSelectedNote(myNote)
                            : setShowCreate(true)
                    }
                    className="flex flex-col items-center gap-1 flex-shrink-0"
                >
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center relative"
                        style={{
                            border: myNote
                                ? "2px solid var(--accent)"
                                : "2px dashed var(--border-primary)",
                            background: myNote ? "var(--accent-light)" : "var(--bg-tertiary)",
                        }}
                    >
                        {myNote ? (
                            <span className="text-lg">{myNote.emoji || "💭"}</span>
                        ) : (
                            <Plus
                                size={20}
                                style={{ color: "var(--text-tertiary)" }}
                            />
                        )}
                    </div>
                    <span
                        className="text-[10px] font-medium w-14 truncate text-center"
                        style={{ color: "var(--text-tertiary)" }}
                    >
                        {myNote ? "My Note" : "Add Note"}
                    </span>
                </button>

                {/* Other Notes */}
                {notes
                    .filter((n) => n.userId !== currentUser._id)
                    .map((note) => (
                        <button
                            key={note._id}
                            onClick={() => setSelectedNote(note)}
                            className="flex flex-col items-center gap-1 flex-shrink-0"
                        >
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center"
                                style={{
                                    border: "2px solid var(--accent)",
                                    background: "var(--accent-light)",
                                }}
                            >
                                {note.user?.imageUrl ? (
                                    <img
                                        src={note.user.imageUrl}
                                        alt={note.user.name}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <span className="text-lg">{note.emoji || "💭"}</span>
                                )}
                            </div>
                            <span
                                className="text-[10px] font-medium w-14 truncate text-center"
                                style={{ color: "var(--text-tertiary)" }}
                            >
                                {note.user?.name?.split(" ")[0]}
                            </span>
                        </button>
                    ))}
            </div>

            {/* Create Note Modal */}
            {showCreate && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={() => setShowCreate(false)}
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative w-full max-w-sm mx-4 rounded-2xl p-5 animate-scale-in"
                        style={{
                            background: "var(--bg-secondary)",
                            border: "1px solid var(--border-primary)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3
                                className="font-bold"
                                style={{ color: "var(--text-primary)" }}
                            >
                                Create Note
                            </h3>
                            <button
                                onClick={() => setShowCreate(false)}
                                style={{ color: "var(--text-secondary)" }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Emoji Picker */}
                        <div className="flex gap-2 mb-3 flex-wrap">
                            {NOTE_EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => setNoteEmoji(emoji)}
                                    className="text-xl p-1 rounded-lg transition-all"
                                    style={{
                                        background:
                                            noteEmoji === emoji
                                                ? "var(--accent-light)"
                                                : "transparent",
                                        transform:
                                            noteEmoji === emoji ? "scale(1.2)" : "scale(1)",
                                    }}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            className="input-chat text-sm resize-none mb-3"
                            rows={2}
                            placeholder="Share what's on your mind... (disappears in 24h)"
                            maxLength={100}
                        />

                        <button
                            onClick={handleCreate}
                            disabled={!noteContent.trim()}
                            className="w-full btn-primary py-2.5 disabled:opacity-40"
                        >
                            Post Note
                        </button>
                    </div>
                </div>
            )}

            {/* View Note Modal */}
            {selectedNote && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={() => setSelectedNote(null)}
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative w-full max-w-xs mx-4 rounded-2xl p-6 text-center animate-scale-in"
                        style={{
                            background: "var(--bg-secondary)",
                            border: "1px solid var(--border-primary)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {selectedNote.user?.imageUrl ? (
                            <img
                                src={selectedNote.user.imageUrl}
                                alt={selectedNote.user.name}
                                className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
                            />
                        ) : (
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold"
                                style={{
                                    background: "var(--gradient-1)",
                                    color: "var(--text-on-accent)",
                                }}
                            >
                                {getInitials(selectedNote.user?.name || "?")}
                            </div>
                        )}
                        <p
                            className="font-semibold mb-1"
                            style={{ color: "var(--text-primary)" }}
                        >
                            {selectedNote.user?.name}
                        </p>
                        <div className="text-3xl mb-2">
                            {selectedNote.emoji || "💭"}
                        </div>
                        <p
                            className="text-sm"
                            style={{ color: "var(--text-secondary)" }}
                        >
                            {selectedNote.content}
                        </p>

                        {selectedNote.userId === currentUser._id && (
                            <button
                                onClick={async () => {
                                    await deleteNote();
                                    setSelectedNote(null);
                                }}
                                className="mt-4 text-sm font-medium"
                                style={{ color: "var(--danger)" }}
                            >
                                Delete Note
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
