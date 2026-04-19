"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Community {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  role_type: string | null;
  icon_color: string;
  member_count: number;
  rules: string[];
}

interface Post {
  id: string;
  community_id: string;
  user_id: string;
  type: string;
  content: string;
  channel_type: string;
  link_url: string | null;
  referral_company: string | null;
  referral_role: string | null;
  helpful_count: number;
  reply_count: number;
  created_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
    current_job_role: string | null;
  };
}

interface MemberProfile {
  full_name: string | null;
  avatar_url: string | null;
  current_job_role: string | null;
  bio: string | null;
  linkedin_url: string | null;
  location: string | null;
  headline: string | null;
}

interface Member {
  user_id: string;
  joined_at: string;
  status: string;
  can_refer: boolean;
  employer: string | null;
  role: string | null;
  profile?: MemberProfile | MemberProfile[] | null;
}

interface OnboardingState {
  active: boolean;
  step: 1 | 2 | 3;
  intro: string;
  question: string;
  selectedMembers: Set<string>;
}

// ─── Channel config ───────────────────────────────────────────────────────────
const CHANNELS = [
  { type: "discussions", label: "Discussions", emoji: "💬", desc: "Ask questions, share thoughts, start conversations", postTypes: ["Discussion", "Poll"] },
  { type: "upskilling",  label: "Library",     emoji: "📚", desc: "Courses, resources, events and learning opportunities", postTypes: ["Resource", "Event"] },
  { type: "referrals",   label: "Warm Intros", emoji: "🤝", desc: "Warm intros, referral requests and job connections", postTypes: ["Referral"] },
  { type: "job_board",   label: "Open Roles",  emoji: "💼", desc: "Open roles, hiring announcements and job listings", postTypes: ["Job Listing"] },
];

const POST_TYPE_COLORS: Record<string, string> = {
  "Discussion":  "#e8e4ce",
  "Poll":        "#D3E4FF",
  "Resource":    "#D3F4E8",
  "Event":       "#FDE8C8",
  "Referral":    "#FFE4F0",
  "Job Listing": "#EAE4FF",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupEmoji(slug: string): string {
  const map: Record<string, string> = {
    "product-managers": "📦",
    "early-engineers":  "⚙️",
    "founders-office":  "🚀",
    "vc-investing":     "💹",
    "growth-marketing": "📈",
    "data-ai":          "🤖",
    "ops-strategy":     "🔧",
    "sales-bd":         "🤝",
  };
  return map[slug] ?? "👥";
}

const PALETTE = ["#F7F4D5", "#D3968C", "#839958", "#FFB5C8", "#B5D5FF", "#FFCBA4"];
function avatarBg(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return PALETTE[h % PALETTE.length];
}
function initials(name: string | null | undefined) {
  return (name ?? "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}
function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function Avatar({ userId, name, size = 32 }: { userId: string; name?: string | null; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 3, flexShrink: 0,
      backgroundColor: avatarBg(userId),
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 800, color: "#F9FAFB",
    }}>
      {initials(name)}
    </div>
  );
}

// ─── Post card ────────────────────────────────────────────────────────────────
function PostCard({ post, onHelpful }: { post: Post; onHelpful: (id: string) => void }) {
  const typeColor = POST_TYPE_COLORS[post.type] ?? "#e8e4ce";
  return (
    <div style={{
      backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 14,
      padding: "16px 18px", marginBottom: 12,
    }}>
      {/* Author row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Avatar userId={post.user_id} name={post.author?.full_name} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB" }}>
            {post.author?.full_name ?? "Member"}
          </div>
          <div style={{ fontSize: 11, color: "#6B7280" }}>
            {post.author?.current_job_role ?? ""}
            {post.author?.current_job_role ? " · " : ""}{relativeTime(post.created_at)}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
          backgroundColor: typeColor, color: "#F9FAFB",
        }}>
          {post.type}
        </span>
      </div>

      {/* Content */}
      <p style={{ fontSize: 14, color: "#F9FAFB", margin: "0 0 12px", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
        {post.content}
      </p>

      {/* Link */}
      {post.link_url && (
        <a href={post.link_url} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-block", fontSize: 12, color: "#F9FAFB", fontWeight: 600,
          marginBottom: 10, textDecoration: "underline",
        }}>
          {post.link_url.replace(/^https?:\/\//, "").split("/")[0]} ↗
        </a>
      )}

      {/* Referral/Job details */}
      {(post.referral_company || post.referral_role) && (
        <div style={{
          display: "inline-flex", gap: 12, padding: "8px 12px", borderRadius: 8,
          backgroundColor: "#1F2937", marginBottom: 10,
        }}>
          {post.referral_company && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#F9FAFB" }}>🏢 {post.referral_company}</span>
          )}
          {post.referral_role && (
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{post.referral_role}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
        <button onClick={() => onHelpful(post.id)} style={{
          background: "none", border: "none", cursor: "pointer", fontSize: 12,
          color: "#6B7280", fontFamily: "inherit", padding: 0, display: "flex", alignItems: "center", gap: 4,
        }}>
          👍 {post.helpful_count > 0 ? post.helpful_count : ""} Helpful
        </button>
        <span style={{ fontSize: 12, color: "#6B7280" }}>
          💬 {post.reply_count} replies
        </span>
      </div>
    </div>
  );
}

// ─── Post Composer ────────────────────────────────────────────────────────────
function PostComposer({ communityId, channelType, postTypes, onPosted, userId }: {
  communityId: string;
  channelType: string;
  postTypes: string[];
  onPosted: () => void;
  userId: string;
}) {
  const supabase = createClient();
  const [open, setOpen]       = useState(false);
  const [content, setContent] = useState("");
  const [type, setType]       = useState(postTypes[0]);
  const [linkUrl, setLinkUrl] = useState("");
  const [company, setCompany] = useState("");
  const [roleTitle, setRole]  = useState("");
  const [posting, setPosting] = useState(false);

  const showLink    = ["Resource", "Event", "Job Listing"].includes(type);
  const showReferral = ["Referral", "Job Listing"].includes(type);

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    await supabase.from("community_posts").insert({
      community_id: communityId,
      user_id: userId,
      type,
      content: content.trim(),
      channel_type: channelType,
      link_url: linkUrl.trim() || null,
      referral_company: company.trim() || null,
      referral_role: roleTitle.trim() || null,
    });
    // Fire career event (non-blocking)
    const eventType = type === "Referral" ? "referral_post" : "post_created";
    // Fire career event non-blocking
    void (async () => {
      try {
        await supabase.from("career_events").insert({
          user_id: userId,
          event_type: eventType,
          community_id: communityId,
          metadata: { channel: channelType, post_type: type },
        });
      } catch { /* ignore */ }
    })();
    setContent(""); setLinkUrl(""); setCompany(""); setRole(""); setOpen(false);
    onPosted();
    setPosting(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "12px 16px", borderRadius: 12, marginBottom: 16,
          border: "1.5px dashed #c8c4ae", backgroundColor: "#181C24",
          cursor: "pointer", fontFamily: "inherit", color: "#6B7280", fontSize: 13,
        }}
      >
        <Avatar userId={userId} size={28} />
        <span>Write a post in this channel…</span>
      </button>
    );
  }

  return (
    <div style={{
      backgroundColor: "#181C24", border: "1.5px solid #1A3A8F", borderRadius: 14,
      padding: "16px 18px", marginBottom: 16,
    }}>
      {/* Type selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {postTypes.map(pt => (
          <button key={pt} onClick={() => setType(pt)} style={{
            padding: "5px 12px", borderRadius: 99, border: "1.5px solid",
            borderColor: type === pt ? "#1A3A8F" : "#374151",
            backgroundColor: type === pt ? "#1A3A8F" : "transparent",
            color: type === pt ? "#F9FAFB" : "#6B7280",
            fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            {pt}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={
          type === "Poll" ? "Ask your question…" :
          type === "Referral" ? "I can refer for this role at my company. Here's what to know…" :
          type === "Job Listing" ? "Describe the role, team, and requirements…" :
          type === "Resource" ? "Share what you found and why it's valuable…" :
          "What's on your mind?"
        }
        style={{
          width: "100%", boxSizing: "border-box", padding: "10px 0",
          fontSize: 14, border: "none", borderBottom: "1px solid #1F2937",
          fontFamily: "inherit", outline: "none", backgroundColor: "transparent",
          color: "#F9FAFB", minHeight: 80, resize: "vertical" as const, lineHeight: 1.6,
        }}
      />

      {showLink && (
        <input
          value={linkUrl}
          onChange={e => setLinkUrl(e.target.value)}
          placeholder="Link URL (optional)"
          style={{
            width: "100%", boxSizing: "border-box", padding: "8px 0",
            fontSize: 13, border: "none", borderBottom: "1px solid #f0ede0",
            fontFamily: "inherit", outline: "none", color: "#9CA3AF",
            backgroundColor: "transparent", marginTop: 8,
          }}
        />
      )}
      {showReferral && (
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name" style={{
            flex: 1, boxSizing: "border-box", padding: "8px 10px", fontSize: 12,
            border: "1px solid #1F2937", borderRadius: 8, fontFamily: "inherit", outline: "none",
          }} />
          <input value={roleTitle} onChange={e => setRole(e.target.value)} placeholder="Role title" style={{
            flex: 1, boxSizing: "border-box", padding: "8px 10px", fontSize: 12,
            border: "1px solid #1F2937", borderRadius: 8, fontFamily: "inherit", outline: "none",
          }} />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
        <button onClick={() => { setOpen(false); setContent(""); }} style={{
          padding: "8px 16px", borderRadius: 8, border: "1px solid #1F2937",
          backgroundColor: "transparent", fontSize: 13, color: "#6B7280",
          cursor: "pointer", fontFamily: "inherit",
        }}>
          Cancel
        </button>
        <button onClick={handlePost} disabled={!content.trim() || posting} style={{
          padding: "8px 20px", borderRadius: 8, border: "none",
          backgroundColor: content.trim() ? "#1A3A8F" : "#374151",
          color: "#F9FAFB", fontSize: 13, fontWeight: 700,
          cursor: content.trim() && !posting ? "pointer" : "default",
          fontFamily: "inherit",
        }}>
          {posting ? "Posting…" : "Post →"}
        </button>
      </div>
    </div>
  );
}

// ─── Member Directory ─────────────────────────────────────────────────────────
function MemberDirectory({ members, onClose }: { members: Member[]; onClose: () => void }) {
  const approvedMembers = members.filter(m => m.status === "approved" || !m.status);
  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 50, padding: "0 0 0 0",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: "#181C24", borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 520, maxHeight: "80vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Handle */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #1F2937", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#F9FAFB", margin: 0 }}>Members</h3>
            <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{approvedMembers.length} verified members</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6B7280" }}>×</button>
        </div>
        <div style={{ overflowY: "auto", padding: "16px 20px", flex: 1 }}>
          {approvedMembers.map(m => {
            const p = Array.isArray(m.profile) ? m.profile[0] : m.profile;
            return (
            <div key={m.user_id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0", borderBottom: "1px solid #1F2937",
            }}>
              <Avatar userId={m.user_id} name={p?.full_name} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB", marginBottom: 1, display: "flex", alignItems: "center", gap: 6 }}>
                  {p?.full_name ?? "Member"}
                  {p?.headline && /founder|vp|director|head of|partner|principal|chief|cto|cpo|cmo|coo|ceo/i.test(p.headline) && (
                    <span style={{ marginLeft: "6px", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "10px", fontWeight: 600, backgroundColor: "#a0822040", color: "#93B4FF", borderRadius: "4px", padding: "2px 8px", border: "0.5px solid #c0a08080" }}>
                      Expert
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>
                  {p?.current_job_role ?? m.role ?? ""}
                  {m.employer ? ` · ${m.employer}` : ""}
                  {p?.location ? ` · ${p.location}` : ""}
                </div>
              </div>
              {m.can_refer && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99,
                  backgroundColor: "#FFE4F0", color: "#c04080",
                }}>
                  Can refer
                </span>
              )}
              {p?.linkedin_url && (
                <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: "#F9FAFB", fontSize: 14 }}>
                  in
                </a>
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Rules Panel ──────────────────────────────────────────────────────────────
function RulesPanel({ rules }: { rules: string[] }) {
  if (!rules?.length) return null;
  return (
    <div style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 14, padding: "16px 18px", marginTop: 16 }}>
      <h4 style={{ fontSize: 12, fontWeight: 800, color: "#F9FAFB", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>
        Community Rules
      </h4>
      <ol style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {rules.map((rule, i) => (
          <li key={i} style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>{rule}</li>
        ))}
      </ol>
    </div>
  );
}

// ─── Invite Panel ─────────────────────────────────────────────────────────────
function InvitePanel({ communityId, userId }: { communityId: string; userId: string }) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState<any[]>([]);
  const [invitesRemaining, setInvitesRemaining] = useState(3);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load existing invites
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/groups/invite?communityId=${communityId}`);
        const data = await res.json();
        if (data.invites) {
          setInvites(data.invites);
          setInvitesRemaining(data.invites_remaining ?? 3);
        }
      } catch (e) {
        console.error("Failed to load invites:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [communityId]);

  const handleSendInvite = async () => {
    if (!email.trim()) return;
    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/groups/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ community_id: communityId, invitee_email: email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send invite");
        return;
      }

      setEmail("");
      setInvitesRemaining(data.invites_remaining);
      // Reload invites
      const getRes = await fetch(`/api/groups/invite?communityId=${communityId}`);
      const getData = await getRes.json();
      if (getData.invites) {
        setInvites(getData.invites);
      }
    } catch (e) {
      console.error("Error sending invite:", e);
      setError("Something went wrong");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 14, padding: "16px 18px", marginTop: 16 }}>
        <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>Loading invites…</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 14, padding: "16px 18px", marginTop: 16 }}>
      <h4 style={{ fontSize: 12, fontWeight: 800, color: "#F9FAFB", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>
        Invite a Peer
      </h4>

      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 10px" }}>
          {invitesRemaining > 0
            ? `You have ${invitesRemaining} invite${invitesRemaining === 1 ? "" : "s"} remaining`
            : "You've used all 3 invites for this group"}
        </p>

        {invitesRemaining > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              placeholder="peer@example.com"
              disabled={sending}
              style={{
                flex: 1,
                padding: "8px 12px",
                fontSize: 12,
                border: "1px solid #1F2937",
                borderRadius: 8,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              onClick={handleSendInvite}
              disabled={!email.trim() || sending}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                backgroundColor: email.trim() && !sending ? "#1A3A8F" : "#374151",
                color: "#F9FAFB",
                fontSize: 12,
                fontWeight: 700,
                cursor: email.trim() && !sending ? "pointer" : "default",
                fontFamily: "inherit",
              }}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        )}

        {error && (
          <p style={{ fontSize: 11, color: "#FCA5A5", margin: "8px 0 0" }}>{error}</p>
        )}
      </div>

      {invites.length > 0 && (
        <div style={{ borderTop: "1px solid #1F2937", paddingTop: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Sent Invites
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {invites.map(inv => (
              <div key={inv.id} style={{
                padding: "8px",
                backgroundColor: "#0F1117",
                borderRadius: 8,
                fontSize: 11,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: "#F9FAFB" }}>{inv.email}</span>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    backgroundColor:
                      inv.status === "pending" ? "rgba(245,158,11,0.15)" :
                      inv.status === "used" ? "rgba(26,58,143,0.2)" : "rgba(239,68,68,0.12)",
                    color:
                      inv.status === "pending" ? "#93B4FF" :
                      inv.status === "used" ? "#93B4FF" : "#FCA5A5",
                    padding: "2px 6px",
                    borderRadius: 4,
                    textTransform: "capitalize",
                  }}>
                    {inv.status}
                  </span>
                </div>
                {inv.status === "pending" && (
                  <div style={{
                    padding: "6px",
                    backgroundColor: "#181C24",
                    borderRadius: 6,
                    border: "1px solid #1F2937",
                    fontSize: 10,
                    color: "#9CA3AF",
                    wordBreak: "break-all" as const,
                    marginBottom: 6,
                  }}>
                    Share: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{inv.link}</span>
                  </div>
                )}
                <span style={{ fontSize: 10, color: "#6B7280" }}>
                  {new Date(inv.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Onboarding Modal ─────────────────────────────────────────────────────────
function OnboardingModal({
  communityId,
  communityName,
  members,
  onboarding,
  setOnboarding,
  userId,
  onComplete,
}: {
  communityId: string;
  communityName: string;
  members: Member[];
  onboarding: OnboardingState;
  setOnboarding: (state: OnboardingState) => void;
  userId: string;
  onComplete: () => void;
}) {
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);

  const fireCareerEvent = async (eventType: string, meta?: Record<string, unknown>) => {
    try {
      await supabase.from("career_events").insert({
        user_id: userId,
        event_type: eventType,
        community_id: communityId,
        metadata: meta ?? {},
      });
    } catch { /* non-blocking */ }
  };

  const handleNext = async () => {
    if (onboarding.step === 1) {
      if (!onboarding.intro.trim()) return;
      setSubmitting(true);
      try {
        await supabase.from("community_posts").insert({
          community_id: communityId,
          user_id: userId,
          type: "Discussion",
          content: onboarding.intro.trim(),
          channel_type: "discussions",
          title: "Introduction",
        });
        await fireCareerEvent("post_created", { channel: "discussions", type: "introduction" });
      } catch (e) {
        console.error("Failed to post intro:", e);
      }
      setSubmitting(false);
      setOnboarding({ ...onboarding, step: 2, intro: "" });
    } else if (onboarding.step === 2) {
      if (onboarding.selectedMembers.size === 0) return;
      setSubmitting(true);
      try {
        // Fire intro_requested event for each selected peer
        for (const peerId of Array.from(onboarding.selectedMembers)) {
          await supabase.from("career_events").insert({
            user_id: userId,
            event_type: "intro_requested",
            community_id: communityId,
            metadata: { target_user_id: peerId },
          });
        }
      } catch { /* non-blocking */ }
      setSubmitting(false);
      setOnboarding({ ...onboarding, step: 3, selectedMembers: new Set() });
    } else if (onboarding.step === 3) {
      setSubmitting(true);
      try {
        if (onboarding.question.trim()) {
          await supabase.from("community_posts").insert({
            community_id: communityId,
            user_id: userId,
            type: "Discussion",
            content: onboarding.question.trim(),
            channel_type: "discussions",
          });
          await fireCareerEvent("post_created", { channel: "discussions", type: "first_question" });
        }
        await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", userId);
      } catch (e) {
        console.error("Failed to complete onboarding:", e);
      }
      setSubmitting(false);
      setOnboarding({ ...onboarding, active: false });
      onComplete();
    }
  };

  const handleSkip = async () => {
    if (onboarding.step === 3) {
      // Skip on step 3 still marks complete
      try {
        await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", userId);
      } catch (e) {
        console.error("Failed to mark onboarding complete:", e);
      }
      setOnboarding({ ...onboarding, active: false });
      onComplete();
    } else {
      setOnboarding({ ...onboarding, step: (onboarding.step + 1) as 1 | 2 | 3, intro: "", question: "" });
    }
  };

  const approvedMembers = members.filter(m => m.status === "approved" || !m.status);
  const recentMembers = approvedMembers.slice(0, 9);
  const canProceed =
    onboarding.step === 1 ? onboarding.intro.trim().length > 0 :
    onboarding.step === 2 ? onboarding.selectedMembers.size > 0 :
    true;

  const progressPct = ((onboarding.step) / 3) * 100;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      padding: "20px",
    }} onClick={() => {}} >
      <div style={{
        backgroundColor: "#181C24",
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
        maxWidth: 500,
        width: "100%",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header with progress */}
        <div style={{
          backgroundColor: "#1A3A8F",
          color: "#F9FAFB",
          padding: "24px 24px 16px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, opacity: 0.9 }}>
            STEP {onboarding.step} OF 3
          </div>
          <div style={{
            height: 4,
            backgroundColor: "rgba(255,255,255,0.2)",
            borderRadius: 2,
            overflow: "hidden",
            marginBottom: 16,
          }}>
            <div style={{
              height: "100%",
              backgroundColor: "#F9FAFB",
              width: `${progressPct}%`,
              transition: "width 0.3s ease",
            }} />
          </div>
          <h2 style={{
            fontSize: 20,
            fontWeight: 800,
            margin: 0,
          }}>
            {onboarding.step === 1 ? "Welcome! Introduce yourself" :
             onboarding.step === 2 ? "Find 3 peers" :
             "Post your first question"}
          </h2>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
        }}>
          {onboarding.step === 1 && (
            <div>
              <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 16, lineHeight: 1.6 }}>
                Tell the community about yourself. What's your role, company, and what are you looking for?
              </p>
              <textarea
                value={onboarding.intro}
                onChange={e => setOnboarding({ ...onboarding, intro: e.target.value })}
                placeholder="E.g., I'm a product manager at Acme, focused on payments infrastructure. Looking to connect with others in fintech..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px",
                  fontSize: 13,
                  border: "1.5px solid #1F2937",
                  borderRadius: 10,
                  fontFamily: "inherit",
                  outline: "none",
                  backgroundColor: "#181C24",
                  color: "#F9FAFB",
                  minHeight: 100,
                  resize: "vertical",
                  lineHeight: 1.6,
                }}
              />
            </div>
          )}

          {onboarding.step === 2 && (
            <div>
              <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 16, lineHeight: 1.6 }}>
                Click on members you'd like to note. Select at least 1 to continue.
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
              }}>
                {recentMembers.map(m => {
                  const p = Array.isArray(m.profile) ? m.profile[0] : m.profile;
                  const isSelected = onboarding.selectedMembers.has(m.user_id);
                  return (
                    <button
                      key={m.user_id}
                      onClick={() => {
                        const next = new Set(onboarding.selectedMembers);
                        if (isSelected) next.delete(m.user_id);
                        else next.add(m.user_id);
                        setOnboarding({ ...onboarding, selectedMembers: next });
                      }}
                      style={{
                        padding: "12px",
                        borderRadius: 12,
                        border: isSelected ? "2px solid #1A3A8F" : "1.5px solid #1F2937",
                        backgroundColor: isSelected ? "rgba(26,58,143,0.25)" : "#0F1117",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "center",
                        transition: "all 0.15s",
                      }}
                    >
                      <Avatar userId={m.user_id} name={p?.full_name} size={40} />
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#F9FAFB", marginTop: 8, marginBottom: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flexWrap: "wrap" }}>
                        {p?.full_name ?? "Member"}
                        {p?.headline && /founder|vp|director|head of|partner|principal|chief|cto|cpo|cmo|coo|ceo/i.test(p.headline) && (
                          <span style={{ fontSize: "9px", fontWeight: 600, backgroundColor: "#a0822040", color: "#93B4FF", borderRadius: "3px", padding: "1px 5px", border: "0.5px solid #c0a08080" }}>
                            Expert
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: "#6B7280" }}>
                        {p?.current_job_role ? p.current_job_role.substring(0, 12) + (p.current_job_role.length > 12 ? "…" : "") : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {onboarding.step === 3 && (
            <div>
              <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 16, lineHeight: 1.6 }}>
                Ask a question or start a discussion to kick things off. (Optional)
              </p>
              <textarea
                value={onboarding.question}
                onChange={e => setOnboarding({ ...onboarding, question: e.target.value })}
                placeholder="E.g., What's the biggest challenge you're facing in your role right now?"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px",
                  fontSize: 13,
                  border: "1.5px solid #1F2937",
                  borderRadius: 10,
                  fontFamily: "inherit",
                  outline: "none",
                  backgroundColor: "#181C24",
                  color: "#F9FAFB",
                  minHeight: 100,
                  resize: "vertical",
                  lineHeight: 1.6,
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: "1px solid #1F2937",
          padding: "16px 24px",
          display: "flex",
          gap: 10,
          justifyContent: "flex-end",
        }}>
          <button
            onClick={handleSkip}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              border: "none",
              backgroundColor: "transparent",
              color: "#6B7280",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              textDecoration: "underline",
            }}
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed || submitting}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "none",
              backgroundColor: canProceed && !submitting ? "#1A3A8F" : "#374151",
              color: "#F9FAFB",
              fontSize: 13,
              fontWeight: 700,
              cursor: canProceed && !submitting ? "pointer" : "default",
              fontFamily: "inherit",
            }}
          >
            {submitting ? "Saving…" : onboarding.step === 3 ? "Get started →" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const params  = useParams();
  const router  = useRouter();
  const slug    = params.slug as string;
  const { session } = useSession();
  const supabase    = createClient();
  const userId      = session?.user?.id ?? null;

  const [community, setCommunity]     = useState<Community | null>(null);
  const [isMember, setIsMember]       = useState(false);
  const [members, setMembers]         = useState<Member[]>([]);
  const [activeTab, setActiveTab]     = useState<string>("discussions");
  const [posts, setPosts]             = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [onboarding, setOnboarding]   = useState<OnboardingState>({
    active: false,
    step: 1,
    intro: "",
    question: "",
    selectedMembers: new Set(),
  });

  // ─── Load community ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from("communities")
      .select("id, slug, name, description, role_type, icon_color, member_count, rules")
      .eq("slug", slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { router.push("/communities"); return; }
        setCommunity(data as Community);
        setLoading(false);
      });
  }, [slug, supabase, router]);

  // ─── Check membership & onboarding status ─────────────────────────────────
  useEffect(() => {
    if (!community?.id || !userId) return;
    (async () => {
      const { data: memberData } = await supabase
        .from("community_members")
        .select("status, created_at")
        .eq("community_id", community.id)
        .eq("user_id", userId)
        .single();

      const isApproved = memberData?.status === "approved" || !!memberData;
      setIsMember(isApproved);

      // Show onboarding if member is approved and hasn't completed it yet
      if (isApproved) {
        const lsKey = `mentor_onboarding_shown_${userId}_${community?.id ?? slug}`;
        const alreadyShown = typeof window !== "undefined" && localStorage.getItem(lsKey);
        if (!alreadyShown) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", userId)
            .single();
          if (!profileData?.onboarding_completed) {
            if (typeof window !== "undefined") localStorage.setItem(lsKey, "1");
            setOnboarding(prev => ({ ...prev, active: true }));
          }
        }
      }
    })();
  }, [community?.id, userId, supabase]);

  // ─── Load members ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!community?.id) return;
    supabase
      .from("community_members")
      .select("user_id, joined_at, can_refer, employer, role, status, profile:profiles(full_name, avatar_url, current_job_role, bio, linkedin_url, location, headline)")
      .eq("community_id", community.id)
      .order("joined_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        setMembers((data as Member[]) ?? []);
      });
  }, [community?.id, supabase]);

  // ─── Load posts for active channel ────────────────────────────────────────
  const loadPosts = useCallback(async () => {
    if (!community?.id) return;
    setLoadingPosts(true);
    const { data } = await supabase
      .from("community_posts")
      .select("*, author:profiles(full_name, avatar_url, current_job_role)")
      .eq("community_id", community.id)
      .eq("channel_type", activeTab)
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts((data as Post[]) ?? []);
    setLoadingPosts(false);
  }, [community?.id, activeTab, supabase]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleHelpful = async (postId: string) => {
    if (!userId) return;
    // Optimistic update
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, helpful_count: p.helpful_count + 1 } : p));
    try {
      await supabase.rpc("increment_helpful", { post_id_arg: postId });
    } catch {
      // RPC may not exist yet — optimistic update stays
    }
  };

  if (loading || !community) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 14, color: "#6B7280" }}>Loading…</p>
      </div>
    );
  }

  const activeChannel = CHANNELS.find(c => c.type === activeTab) ?? CHANNELS[0];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* ─── Left sidebar (desktop only) ───────────────────────────────────── */}
      <div className="community-channels-panel" style={{
        backgroundColor: "#181C24", borderRight: "1px solid #1F2937",
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        {/* Community header */}
        <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid #1F2937" }}>
          <Link href="/communities" style={{ fontSize: 11, color: "#6B7280", textDecoration: "none", display: "block", marginBottom: 12 }}>
            ← All Groups
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              backgroundColor: community.icon_color ?? "#FDE68A",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>
              {groupEmoji(community.slug)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#F9FAFB" }}>{community.name}</div>
              <div style={{ fontSize: 10, color: "#6B7280" }}>{community.member_count.toLocaleString()} members</div>
            </div>
          </div>
        </div>

        {/* Channel nav */}
        <div style={{ padding: "12px 10px", flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 6px", margin: "0 0 6px" }}>
            Channels
          </p>
          {CHANNELS.map(ch => (
            <button key={ch.type} onClick={() => setActiveTab(ch.type)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "9px 10px", borderRadius: 9, marginBottom: 2,
              border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
              backgroundColor: activeTab === ch.type ? "rgba(26,58,143,0.3)" : "transparent",
              color: activeTab === ch.type ? "#F9FAFB" : "#9CA3AF",
              transition: "background 0.1s",
            }}>
              <span style={{ fontSize: 16 }}>{ch.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: activeTab === ch.type ? 700 : 500 }}>{ch.label}</span>
            </button>
          ))}
        </div>

        {/* Members + Rules */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid #f0ede0" }}>
          <button onClick={() => setShowMembers(true)} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "9px 10px", borderRadius: 9, border: "none",
            backgroundColor: "transparent", cursor: "pointer", fontFamily: "inherit",
            color: "#9CA3AF", fontSize: 13,
          }}>
            👥 Members ({members.filter(m => !m.status || m.status === "approved").length})
          </button>
        </div>

        <RulesPanel rules={community.rules} />

        {/* Invite panel (members only) */}
        {isMember && userId && (
          <InvitePanel communityId={community.id} userId={userId} />
        )}

        <div style={{ height: 16 }} />
      </div>

      {/* ─── Main content ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", backgroundColor: "#0F1117" }}>
        {/* Channel header */}
        <div style={{
          backgroundColor: "#181C24", borderBottom: "1px solid #1F2937",
          padding: "14px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Mobile: back to communities link */}
            <Link href="/communities" className="mobile-only" style={{ color: "#6B7280", fontSize: 18, textDecoration: "none" }}>←</Link>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 18 }}>{activeChannel.emoji}</span>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: "#F9FAFB", margin: 0 }}>
                  {activeChannel.label}
                </h2>
              </div>
              <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{activeChannel.desc}</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowMembers(true)} style={{
              padding: "7px 14px", borderRadius: 8, border: "1px solid #1F2937",
              backgroundColor: "#181C24", cursor: "pointer", fontSize: 12, color: "#9CA3AF",
              fontFamily: "inherit",
            }}>
              👥 {members.filter(m => !m.status || m.status === "approved").length}
            </button>
            {/* Mobile: channel tab switcher */}
            <button className="mobile-only" onClick={() => setShowMobileNav(!showMobileNav)} style={{
              padding: "7px 12px", borderRadius: 8, border: "1px solid #1F2937",
              backgroundColor: "#181C24", cursor: "pointer", fontSize: 12, color: "#9CA3AF",
              fontFamily: "inherit",
            }}>
              # Channels
            </button>
          </div>
        </div>

        {/* Mobile channel nav (drawer) */}
        {showMobileNav && (
          <div style={{
            backgroundColor: "#181C24", borderBottom: "1px solid #1F2937",
            padding: "8px 16px", display: "flex", gap: 8, overflowX: "auto", flexShrink: 0,
          }}>
            {CHANNELS.map(ch => (
              <button key={ch.type} onClick={() => { setActiveTab(ch.type); setShowMobileNav(false); }} style={{
                padding: "7px 14px", borderRadius: 99, border: "1.5px solid",
                borderColor: activeTab === ch.type ? "#1A3A8F" : "#1F2937",
                backgroundColor: activeTab === ch.type ? "#1A3A8F" : "#0F1117",
                color: activeTab === ch.type ? "#F9FAFB" : "#9CA3AF",
                fontSize: 12, fontWeight: activeTab === ch.type ? 700 : 500,
                cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const,
                display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
              }}>
                {ch.emoji} {ch.label}
              </button>
            ))}
          </div>
        )}

        {/* Feed */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 16px" }}>
          {/* Gate: must be member to post */}
          {!isMember && (
            <div style={{
              backgroundColor: "#181C24", border: "1.5px solid #1F2937", borderRadius: 14,
              padding: "20px 20px", marginBottom: 16, textAlign: "center",
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB", margin: "0 0 6px" }}>
                🔒 This is a verified-members-only group
              </p>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 14px" }}>
                Apply to join {community.name} to read and post in channels.
              </p>
              <Link href={`/communities/${community.slug}/apply`} style={{
                display: "inline-block", padding: "10px 20px", backgroundColor: "#1A3A8F",
                color: "#F9FAFB", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none",
              }}>
                Apply to join →
              </Link>
            </div>
          )}

          {/* Composer (members only) */}
          {isMember && userId && (
            <PostComposer
              communityId={community.id}
              channelType={activeTab}
              postTypes={activeChannel.postTypes}
              onPosted={loadPosts}
              userId={userId}
            />
          )}

          {/* Job posting CTA (for job_board channel) */}
          {activeTab === "job_board" && (
            <div style={{
              backgroundColor: "#0a4d2a",
              border: "1.5px solid #1A3A8F",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#d4ff99", margin: "0 0 4px" }}>
                  Hiring in this space?
                </p>
                <p style={{ fontSize: 12, color: "#a8d66e", margin: 0 }}>
                  Post directly to {community.member_count.toLocaleString()} verified {community.role_type || "professionals"}.
                </p>
              </div>
              <Link
                href={`/post-job?group=${community.id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  backgroundColor: "#d4ff99",
                  color: "#F9FAFB",
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontWeight: 600,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Post a Job →
              </Link>
            </div>
          )}

          {/* Posts */}
          {loadingPosts ? (
            <p style={{ fontSize: 13, color: "#6B7280", textAlign: "center", marginTop: 40 }}>Loading posts…</p>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ fontSize: 32, margin: "0 0 8px" }}>{activeChannel.emoji}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB", margin: "0 0 6px" }}>
                No posts in {activeChannel.label} yet
              </p>
              {isMember && (
                <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Be the first to post here!</p>
              )}
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} onHelpful={handleHelpful} />
            ))
          )}
        </div>
      </div>

      {/* Member directory modal */}
      {showMembers && (
        <MemberDirectory members={members} onClose={() => setShowMembers(false)} />
      )}

      {/* Onboarding modal */}
      {onboarding.active && community && userId && (
        <OnboardingModal
          communityId={community.id}
          communityName={community.name}
          members={members}
          onboarding={onboarding}
          setOnboarding={setOnboarding}
          userId={userId}
          onComplete={() => {
            setOnboarding(prev => ({ ...prev, active: false }));
            loadPosts();
          }}
        />
      )}

      <style>{`
        .mobile-only { display: none; }
        @media (max-width: 767px) {
          .mobile-only { display: flex !important; align-items: center; }
        }
      `}</style>
    </div>
  );
}
