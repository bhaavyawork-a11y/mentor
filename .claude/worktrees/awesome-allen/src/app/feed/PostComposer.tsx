"use client";

import { useState, useRef } from "react";

interface PostComposerProps {
  userId: string;
  userInitials: string;
  communityId?: string;
  onPostCreated: (post: FeedPost) => void;
}

export interface FeedPost {
  id: string;
  author_id: string;
  community_id: string | null;
  type: string;
  content: string;
  tags: string[];
  likes_count: number;
  replies_count: number;
  is_pinned: boolean;
  created_at: string;
  author: { id: string; full_name: string | null; current_job_role: string | null; avatar_url: string | null } | null;
  community: { name: string; slug: string } | null;
  liked?: boolean;
}

const TYPE_CONFIG = {
  note:     { label: "Note",     color: "#666",     bg: "#f0f0f0"  },
  question: { label: "Question", color: "#b45309",  bg: "#fef3c7"  },
  win:      { label: "Win 🎉",   color: "#166534",  bg: "#dcfce7"  },
};

const AVATAR_COLORS = ["#0a66c2", "#7c3aed", "#db2777", "#d97706", "#059669"];
function avatarColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function PostComposer({ userId, userInitials, communityId, onPostCreated }: PostComposerProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [type, setType] = useState<"note" | "question" | "win">("note");
  const [tags, setTags] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const avatarBg = avatarColor(userId);

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSubmit = async () => {
    if (content.trim().length < 3) { setError("Post must be at least 3 characters."); return; }
    if (content.trim().length > 2000) { setError("Post must be under 2000 characters."); return; }
    setPosting(true);
    setError("");

    const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);

    const res = await fetch("/api/posts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim(), type, community_id: communityId ?? null, tags: parsedTags }),
    });

    const json = await res.json() as { post?: FeedPost; error?: string };

    if (!res.ok || !json.post) {
      setError(json.error ?? "Failed to post");
      setPosting(false);
      return;
    }

    onPostCreated(json.post);
    setContent("");
    setTags("");
    setType("note");
    setOpen(false);
    setPosting(false);
  };

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, padding: "12px 16px", marginBottom: 12 }}>
      {!open ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {userInitials}
          </div>
          <button
            onClick={handleOpen}
            style={{ flex: 1, textAlign: "left", backgroundColor: "#f3f2ef", border: "1px solid #c0bdb6", borderRadius: 24, padding: "12px 16px", fontSize: 14, color: "#666", cursor: "pointer", fontFamily: "inherit" }}
          >
            Share a note, question, or win…
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {userInitials}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Type selector */}
            <div style={{ display: "flex", gap: 6 }}>
              {(Object.entries(TYPE_CONFIG) as [keyof typeof TYPE_CONFIG, typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setType(key)}
                  style={{
                    fontSize: 12, fontWeight: type === key ? 700 : 500,
                    backgroundColor: type === key ? cfg.bg : "#f3f2ef",
                    color: type === key ? cfg.color : "#666",
                    border: type === key ? `1.5px solid ${cfg.color}` : "1.5px solid transparent",
                    borderRadius: 16, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                type === "note" ? "Share something useful with the community…" :
                type === "question" ? "Ask a question — the community will help…" :
                "Share a win! Got an offer, passed an interview, landed a referral?"
              }
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #e0ded8", borderRadius: 4, padding: "10px 12px", fontSize: 14, resize: "vertical", fontFamily: "inherit", outline: "none", lineHeight: 1.6 }}
            />

            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags — comma-separated (e.g. referral, product, hiring)"
              style={{ border: "1px solid #e0ded8", borderRadius: 4, padding: "8px 12px", fontSize: 13, fontFamily: "inherit", outline: "none" }}
            />

            {error && <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>{error}</p>}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setOpen(false); setContent(""); setError(""); }}
                style={{ fontSize: 13, fontWeight: 600, color: "#666", background: "none", border: "1px solid #c0bdb6", borderRadius: 24, padding: "6px 16px", cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={posting || content.trim().length < 3}
                style={{ fontSize: 13, fontWeight: 700, backgroundColor: posting || content.trim().length < 3 ? "#ccc" : "#0a66c2", color: "#fff", border: "none", borderRadius: 24, padding: "6px 18px", cursor: posting || content.trim().length < 3 ? "not-allowed" : "pointer", fontFamily: "inherit" }}
              >
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
