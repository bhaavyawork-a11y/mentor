"use client";

import { useState } from "react";
import type { FeedPost } from "./PostComposer";

interface Reply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  author: { id: string; full_name: string | null; current_job_role: string | null; avatar_url: string | null } | null;
}

interface PostCardProps {
  post: FeedPost;
  currentUserId: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const AVATAR_COLORS = ["#0a66c2", "#7c3aed", "#db2777", "#d97706", "#059669"];
function avatarColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function TypeBadge({ type }: { type: string }) {
  if (type === "win") return (
    <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#dcfce7", color: "#166534", borderRadius: 99, padding: "2px 10px" }}>Win 🎉</span>
  );
  if (type === "question") return (
    <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#fef3c7", color: "#b45309", borderRadius: 99, padding: "2px 10px" }}>Question</span>
  );
  if (type === "referral_offer") return (
    <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#dbeafe", color: "#1d4ed8", borderRadius: 99, padding: "2px 10px" }}>Referral offer</span>
  );
  return null;
}

function ReplyBox({ postId, currentUserId, onReplied }: { postId: string; currentUserId: string; onReplied: (reply: Reply) => void }) {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  const submit = async () => {
    if (!content.trim() || posting) return;
    setPosting(true);
    const res = await fetch(`/api/posts/${postId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    });
    if (res.ok) {
      const { reply } = await res.json() as { reply: Reply };
      onReplied(reply);
      setContent("");
    }
    setPosting(false);
  };

  const bg = avatarColor(currentUserId);
  const userInitials = "Me";

  return (
    <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: "1px solid #f0eeea" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
        {userInitials}
      </div>
      <div style={{ flex: 1, display: "flex", gap: 8 }}>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Write a reply…"
          style={{ flex: 1, border: "1px solid #e0ded8", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontFamily: "inherit", outline: "none" }}
        />
        <button
          onClick={submit}
          disabled={!content.trim() || posting}
          style={{ fontSize: 12, fontWeight: 700, backgroundColor: content.trim() && !posting ? "#0a66c2" : "#ccc", color: "#fff", border: "none", borderRadius: 20, padding: "7px 14px", cursor: content.trim() && !posting ? "pointer" : "not-allowed", fontFamily: "inherit", flexShrink: 0 }}
        >
          Reply
        </button>
      </div>
    </div>
  );
}

/* ─── PostCard ──────────────────────────────────────────────────────── */

export default function PostCard({ post, currentUserId }: PostCardProps) {
  const [liked, setLiked] = useState(post.liked ?? false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [repliesCount, setRepliesCount] = useState(post.replies_count);
  const [expanded, setExpanded] = useState(false);

  const authorId = post.author?.id ?? post.author_id;
  const name = post.author?.full_name ?? "Member";
  const role = post.author?.current_job_role ?? "";
  const bg = avatarColor(authorId);
  const long = post.content.length > 300;
  const displayContent = !expanded && long ? post.content.slice(0, 300) + "…" : post.content;

  const isReferralOffer = post.type === "referral_offer";

  const handleLike = async () => {
    setLiked((l) => !l);
    setLikesCount((c) => liked ? c - 1 : c + 1);
    const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    if (res.ok) {
      const { liked: newLiked, count } = await res.json() as { liked: boolean; count: number };
      setLiked(newLiked);
      setLikesCount(count);
    }
  };

  const handleReplyToggle = async () => {
    setShowReplyBox((o) => !o);
    if (!repliesLoaded) {
      const res = await fetch(`/api/posts/${post.id}/replies`);
      if (res.ok) {
        const { replies: r } = await res.json() as { replies: Reply[] };
        setReplies(r);
        setRepliesLoaded(true);
      }
    }
  };

  const handleReplied = (reply: Reply) => {
    setReplies((r) => [...r, reply]);
    setRepliesCount((c) => c + 1);
    setRepliesLoaded(true);
    setShowAllReplies(true);
  };

  const visibleReplies = showAllReplies ? replies : replies.slice(0, 2);

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #e0ded8",
      borderRadius: 8,
      borderLeft: isReferralOffer ? "4px solid #0a66c2" : undefined,
      marginBottom: 8,
      overflow: "hidden",
    }}>
      <div style={{ padding: "16px 16px 0" }}>
        {/* Author row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {initials(name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{name}</span>
              {post.community && (
                <span style={{ fontSize: 11, backgroundColor: "#f3f2ef", color: "#666", borderRadius: 4, padding: "1px 6px" }}>{post.community.name}</span>
              )}
              <TypeBadge type={post.type} />
            </div>
            {role && <p style={{ fontSize: 12, color: "#666", margin: "1px 0 0" }}>{role}</p>}
            <p style={{ fontSize: 11, color: "#999", margin: "1px 0 0" }}>{timeAgo(post.created_at)}</p>
          </div>
        </div>

        {/* Content */}
        <p style={{ fontSize: 14, color: "#1a1a1a", margin: "0 0 2px", lineHeight: 1.6 }}>
          {displayContent}
          {long && (
            <button
              onClick={() => setExpanded((e) => !e)}
              style={{ background: "none", border: "none", color: "#0a66c2", fontSize: 13, cursor: "pointer", padding: "0 4px", fontFamily: "inherit" }}
            >
              {expanded ? " …less" : " …more"}
            </button>
          )}
        </p>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
            {post.tags.map((tag) => (
              <span key={tag} style={{ fontSize: 11, color: "#0a66c2", backgroundColor: "#eff6ff", borderRadius: 4, padding: "2px 7px" }}>#{tag}</span>
            ))}
          </div>
        )}

        {/* Referral offer CTA */}
        {isReferralOffer && (
          <div style={{ marginTop: 12, backgroundColor: "#eff6ff", borderRadius: 6, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>🤝 This member can refer you</span>
            <a
              href={`/communities`}
              style={{ fontSize: 12, fontWeight: 700, backgroundColor: "#0a66c2", color: "#fff", borderRadius: 16, padding: "5px 14px", textDecoration: "none" }}
            >
              Request referral
            </a>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", borderTop: "1px solid #f0eeea", margin: "12px 0 0" }}>
        {[
          {
            label: liked ? `Liked (${likesCount})` : `Like${likesCount > 0 ? ` (${likesCount})` : ""}`,
            icon: "👍",
            active: liked,
            onClick: handleLike,
          },
          {
            label: `Comment${repliesCount > 0 ? ` (${repliesCount})` : ""}`,
            icon: "💬",
            active: showReplyBox,
            onClick: handleReplyToggle,
          },
          { label: "Repost", icon: "🔁", active: false, onClick: () => {} },
          { label: "Send", icon: "📤", active: false, onClick: () => {} },
        ].map(({ label, icon, active, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              padding: "10px 4px", fontSize: 12, fontWeight: active ? 700 : 500,
              color: active ? "#0a66c2" : "#666",
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f2ef"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
          >
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span className="hide-mobile">{label}</span>
          </button>
        ))}
      </div>

      {/* Replies section */}
      {(showReplyBox || replies.length > 0) && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {visibleReplies.map((reply) => (
            <div key={reply.id} style={{ display: "flex", gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                backgroundColor: avatarColor(reply.author?.id ?? reply.author_id),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
              }}>
                {initials(reply.author?.full_name ?? null)}
              </div>
              <div style={{ flex: 1, backgroundColor: "#f3f2ef", borderRadius: 8, padding: "8px 12px" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", margin: "0 0 2px" }}>
                  {reply.author?.full_name ?? "Member"}
                  <span style={{ fontWeight: 400, color: "#999", marginLeft: 6, fontSize: 11 }}>{timeAgo(reply.created_at)}</span>
                </p>
                <p style={{ fontSize: 13, color: "#333", margin: 0, lineHeight: 1.5 }}>{reply.content}</p>
              </div>
            </div>
          ))}

          {replies.length > 2 && !showAllReplies && (
            <button
              onClick={() => setShowAllReplies(true)}
              style={{ fontSize: 12, fontWeight: 600, color: "#0a66c2", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, fontFamily: "inherit" }}
            >
              View {replies.length - 2} more repl{replies.length - 2 === 1 ? "y" : "ies"}
            </button>
          )}

          {showReplyBox && (
            <ReplyBox postId={post.id} currentUserId={currentUserId} onReplied={handleReplied} />
          )}
        </div>
      )}
    </div>
  );
}
