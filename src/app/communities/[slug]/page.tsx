"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";

/* ─── Types ─────────────────────────────────────────────────────── */
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

interface Channel {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  description: string | null;
  position: number;
}

interface ChannelMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  author?: { full_name: string | null; avatar_url: string | null; current_job_role: string | null };
}

interface Member {
  user_id: string;
  joined_at: string;
  can_refer: boolean;
  employer: string | null;
  role: string | null;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    current_job_role: string | null;
    bio: string | null;
    linkedin_url: string | null;
    location: string | null;
  };
}

/* ─── Helpers ───────────────────────────────────────────────────── */
const PALETTE = ["#F7F4D5", "#D3968C", "#839958", "#FFB5C8", "#B5D5FF", "#FFCBA4"];

function avatarBg(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return PALETTE[h % PALETTE.length];
}

function initials(name: string | null | undefined) {
  return (name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDateGroup(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/* ─── Avatar ────────────────────────────────────────────────────── */
function Avatar({ userId, name, size = 34 }: { userId: string; name: string | null | undefined; size?: number }) {
  const bg = avatarBg(userId);
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 3,
      backgroundColor: bg, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 800, color: "#1a1a1a",
    }}>
      {initials(name)}
    </div>
  );
}

/* ─── Channel Chat View ─────────────────────────────────────────── */
function ChannelChat({
  channel, communityId, isMember, userId,
}: {
  channel: Channel; communityId: string; isMember: boolean; userId: string | null;
}) {
  const supabase = createClient();
  const { profile } = useProfile();
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [pinned, setPinned] = useState<ChannelMessage | null>(null);
  const [showPinned, setShowPinned] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("channel_messages")
      .select("*, author:profiles(full_name, avatar_url, current_job_role)")
      .eq("channel_id", channel.id)
      .order("created_at", { ascending: true })
      .limit(100);

    const msgs = (data as ChannelMessage[]) ?? [];
    setMessages(msgs);
    const p = msgs.find((m) => m.is_pinned);
    setPinned(p ?? null);
    setLoading(false);
    scrollToBottom();
  }, [channel.id, supabase]);

  useEffect(() => {
    loadMessages();

    const sub = supabase
      .channel(`channel-${channel.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "channel_messages",
        filter: `channel_id=eq.${channel.id}`,
      }, async (payload) => {
        const newMsg = payload.new as ChannelMessage;
        const { data: authorData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, current_job_role")
          .eq("id", newMsg.user_id)
          .single();
        const enriched = { ...newMsg, author: authorData ?? undefined };
        setMessages((prev) => [...prev, enriched]);
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [channel.id, loadMessages, supabase]);

  const handleSend = async () => {
    if (!text.trim() || !userId || sending) return;
    setSending(true);
    const optimistic: ChannelMessage = {
      id: `opt-${Date.now()}`,
      channel_id: channel.id,
      user_id: userId,
      content: text.trim(),
      is_pinned: false,
      created_at: new Date().toISOString(),
      author: { full_name: profile?.full_name ?? null, avatar_url: null, current_job_role: profile?.current_job_role ?? null },
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    scrollToBottom();

    const { error } = await supabase.from("channel_messages").insert({
      channel_id: channel.id,
      user_id: userId,
      content: optimistic.content,
    });
    if (error) setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    setSending(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handlePin = async (msg: ChannelMessage) => {
    const newPinned = !msg.is_pinned;
    await supabase.from("channel_messages").update({ is_pinned: false }).eq("channel_id", channel.id);
    if (newPinned) {
      await supabase.from("channel_messages").update({ is_pinned: true }).eq("id", msg.id);
    }
    loadMessages();
  };

  // Group messages by date and consecutive sender
  const grouped: { date: string; msgs: ChannelMessage[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const d = formatDateGroup(msg.created_at);
    if (d !== currentDate) {
      grouped.push({ date: d, msgs: [msg] });
      currentDate = d;
    } else {
      grouped[grouped.length - 1].msgs.push(msg);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Channel header */}
      <div style={{
        padding: "14px 20px", borderBottom: "1px solid #e8e4ce",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        backgroundColor: "#fff",
      }}>
        <span style={{ fontSize: 20 }}>{channel.emoji}</span>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>{channel.name}</p>
          {channel.description && <p style={{ fontSize: 11, color: "#839958", margin: 0 }}>{channel.description}</p>}
        </div>
      </div>

      {/* Pinned message */}
      {pinned && showPinned && (
        <div style={{
          backgroundColor: "#F7F4D5", borderBottom: "1px solid #e8e4ce",
          padding: "8px 20px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          <span style={{ fontSize: 14 }}>📌</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#839958", marginRight: 6 }}>Pinned</span>
            <span style={{ fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {pinned.content.length > 80 ? pinned.content.slice(0, 80) + "…" : pinned.content}
            </span>
          </div>
          <button onClick={() => setShowPinned(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#b0ab8c", padding: 0 }}>✕</button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 0 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#839958", fontSize: 13 }}>Loading messages…</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{channel.emoji}</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 6px" }}>
              Welcome to #{channel.name.toLowerCase()}
            </p>
            <p style={{ fontSize: 13, color: "#839958", margin: 0 }}>
              {channel.description ?? "Start the conversation!"}
            </p>
          </div>
        ) : (
          grouped.map(({ date, msgs: dayMsgs }) => (
            <div key={date}>
              {/* Date separator */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 16px" }}>
                <div style={{ flex: 1, height: 1, backgroundColor: "#e8e4ce" }} />
                <span style={{ fontSize: 11, color: "#b0ab8c", fontWeight: 600, whiteSpace: "nowrap" }}>{date}</span>
                <div style={{ flex: 1, height: 1, backgroundColor: "#e8e4ce" }} />
              </div>

              {dayMsgs.map((msg, i) => {
                const prev = dayMsgs[i - 1];
                const sameAuthor = prev && prev.user_id === msg.user_id &&
                  new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
                const isMine = msg.user_id === userId;
                const name = msg.author?.full_name;

                return (
                  <div key={msg.id} style={{
                    display: "flex", gap: 10,
                    marginBottom: sameAuthor ? 2 : 12,
                    marginTop: sameAuthor ? 0 : 4,
                    opacity: msg.id.startsWith("opt-") ? 0.6 : 1,
                  }}>
                    {/* Avatar (only on first of group) */}
                    <div style={{ width: 34, flexShrink: 0 }}>
                      {!sameAuthor && <Avatar userId={msg.user_id} name={name} size={34} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Name + time (only on first of group) */}
                      {!sameAuthor && (
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: isMine ? "#0A3323" : "#1a1a1a" }}>
                            {isMine ? "You" : (name ?? "Member")}
                          </span>
                          <span style={{ fontSize: 10, color: "#b0ab8c" }}>{formatTime(msg.created_at)}</span>
                          {msg.is_pinned && <span style={{ fontSize: 10, color: "#839958" }}>📌</span>}
                        </div>
                      )}

                      {/* Message bubble */}
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                        <div style={{
                          backgroundColor: isMine ? "#0A3323" : "#f5f5f0",
                          color: isMine ? "#c8e6b0" : "#333",
                          borderRadius: sameAuthor
                            ? (isMine ? "12px 12px 4px 12px" : "12px 12px 12px 4px")
                            : "12px",
                          padding: "8px 12px",
                          fontSize: 14,
                          lineHeight: 1.5,
                          maxWidth: 480,
                          wordBreak: "break-word",
                          whiteSpace: "pre-wrap",
                        }}>
                          {msg.content}
                        </div>
                        {sameAuthor && (
                          <span style={{ fontSize: 9, color: "#b0ab8c", whiteSpace: "nowrap", paddingBottom: 2 }}>
                            {formatTime(msg.created_at)}
                          </span>
                        )}
                        {/* Pin button on hover (only for members) */}
                        {isMember && !msg.id.startsWith("opt-") && (
                          <button
                            onClick={() => handlePin(msg)}
                            title={msg.is_pinned ? "Unpin" : "Pin message"}
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              fontSize: 12, opacity: 0.4, padding: "0 2px",
                              color: msg.is_pinned ? "#839958" : "#999",
                            }}
                          >
                            📌
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {isMember && userId ? (
        <div style={{
          padding: "12px 20px", borderTop: "1px solid #e8e4ce",
          backgroundColor: "#fff", flexShrink: 0,
        }}>
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-end",
            backgroundColor: "#f5f5f0", borderRadius: 14,
            padding: "10px 14px", border: "1px solid #e8e4ce",
          }}>
            <Avatar userId={userId} name={profile?.full_name} size={30} />
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${channel.name.toLowerCase()}…`}
              style={{
                flex: 1, border: "none", background: "transparent", resize: "none",
                fontSize: 14, color: "#1a1a1a", outline: "none", fontFamily: "inherit",
                lineHeight: 1.5, minHeight: 22, maxHeight: 120, overflowY: "auto",
              }}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              style={{
                backgroundColor: text.trim() ? "#0A3323" : "#e8e4ce",
                color: text.trim() ? "#839958" : "#b0ab8c",
                border: "none", borderRadius: 8, padding: "6px 14px",
                fontSize: 13, fontWeight: 700, cursor: text.trim() ? "pointer" : "default",
                transition: "all 0.15s", flexShrink: 0,
              }}
            >
              Send
            </button>
          </div>
          <p style={{ fontSize: 10, color: "#b0ab8c", margin: "6px 0 0", textAlign: "center" }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      ) : !isMember ? (
        <div style={{
          padding: "16px 20px", borderTop: "1px solid #e8e4ce",
          backgroundColor: "#F7F4D5", textAlign: "center", flexShrink: 0,
        }}>
          <p style={{ fontSize: 13, color: "#839958", margin: 0 }}>
            Join this community to participate in the conversation
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Directory View ────────────────────────────────────────────── */
function DirectoryView({ communityId }: { communityId: string }) {
  const supabase = createClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("community_members")
        .select("user_id, joined_at, can_refer, employer, role, profile:profiles(full_name, avatar_url, current_job_role, bio, linkedin_url, location)")
        .eq("community_id", communityId)
        .order("joined_at", { ascending: false });

      const raw = (data ?? []) as Array<{
        user_id: string; joined_at: string; can_refer: boolean; employer: string | null; role: string | null;
        profile: Member["profile"] | Member["profile"][];
      }>;
      setMembers(raw.map((m) => ({
        ...m,
        profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
      })));
      setLoading(false);
    })();
  }, [communityId, supabase]);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return !q ||
      m.profile?.full_name?.toLowerCase().includes(q) ||
      m.profile?.current_job_role?.toLowerCase().includes(q) ||
      m.employer?.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px", borderBottom: "1px solid #e8e4ce",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0, backgroundColor: "#fff",
      }}>
        <span style={{ fontSize: 20 }}>👥</span>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>Member Directory</p>
          <p style={{ fontSize: 11, color: "#839958", margin: 0 }}>{members.length} members</p>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #e8e4ce", flexShrink: 0, backgroundColor: "#fff" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members by name, role, or company…"
          style={{
            width: "100%", boxSizing: "border-box", border: "1px solid #e8e4ce",
            borderRadius: 10, padding: "9px 14px", fontSize: 13, color: "#1a1a1a",
            backgroundColor: "#f9f9f7", outline: "none", fontFamily: "inherit",
          }}
        />
      </div>

      {/* Members grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {loading ? (
          <p style={{ fontSize: 13, color: "#839958" }}>Loading members…</p>
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: "#839958" }}>No members found.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {filtered.map((m) => (
              <div key={m.user_id} style={{
                backgroundColor: "#fff", border: "1px solid #e8e4ce",
                borderRadius: 14, padding: 16,
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar userId={m.user_id} name={m.profile?.full_name} size={38} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.profile?.full_name ?? "Member"}
                    </p>
                    {m.profile?.current_job_role && (
                      <p style={{ fontSize: 11, color: "#839958", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.profile.current_job_role}
                      </p>
                    )}
                  </div>
                </div>

                {m.profile?.location && (
                  <p style={{ fontSize: 11, color: "#b0ab8c", margin: 0 }}>📍 {m.profile.location}</p>
                )}

                {m.can_refer && m.employer && (
                  <div style={{
                    backgroundColor: "#F7F4D5", borderRadius: 8,
                    padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "#8a7200",
                  }}>
                    🤝 Can refer at {m.employer}
                    {m.role && <span style={{ fontWeight: 500, color: "#839958" }}> · {m.role}</span>}
                  </div>
                )}

                {m.profile?.bio && (
                  <p style={{
                    fontSize: 12, color: "#555", margin: 0, lineHeight: 1.5,
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {m.profile.bio}
                  </p>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  {m.profile?.linkedin_url && (
                    <a
                      href={m.profile.linkedin_url}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        fontSize: 11, fontWeight: 700, color: "#0A3323",
                        border: "1px solid #0A3323", borderRadius: 7,
                        padding: "5px 10px", textDecoration: "none",
                      }}
                    >
                      LinkedIn ↗
                    </a>
                  )}
                  <span style={{ fontSize: 10, color: "#b0ab8c", alignSelf: "center" }}>
                    Joined {new Date(m.joined_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Rules View ────────────────────────────────────────────────── */
function RulesView({ community }: { community: Community }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        padding: "14px 20px", borderBottom: "1px solid #e8e4ce",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0, backgroundColor: "#fff",
      }}>
        <span style={{ fontSize: 20 }}>📋</span>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>Community Rules</p>
          <p style={{ fontSize: 11, color: "#839958", margin: 0 }}>{community.name}</p>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {community.description && (
          <div style={{ backgroundColor: "#F7F4D5", borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#839958", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>About</p>
            <p style={{ fontSize: 14, color: "#333", margin: 0, lineHeight: 1.7 }}>{community.description}</p>
          </div>
        )}
        {community.rules?.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {community.rules.map((rule, i) => (
              <div key={i} style={{
                backgroundColor: "#fff", border: "1px solid #e8e4ce",
                borderRadius: 12, padding: "14px 18px",
                display: "flex", gap: 12, alignItems: "flex-start",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: "#0A3323", color: "#839958",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 14, color: "#333", margin: 0, lineHeight: 1.6, paddingTop: 4 }}>{rule}</p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 14, color: "#839958" }}>No rules have been set for this community yet.</p>
        )}
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const supabase = createClient();
  const { session } = useSession();

  const [community, setCommunity] = useState<Community | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [view, setView] = useState<"chat" | "directory" | "rules">("chat");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("communities").select("*").eq("slug", slug).single();
      if (!c) { setLoading(false); return; }
      setCommunity(c as Community);
      setMemberCount((c as Community).member_count);

      const { data: ch } = await supabase
        .from("community_channels")
        .select("*")
        .eq("community_id", c.id)
        .order("position", { ascending: true });
      const chList = (ch as Channel[]) ?? [];
      setChannels(chList);
      if (chList.length > 0) setActiveChannel(chList[0]);

      if (session?.user.id) {
        const { data: mem } = await supabase
          .from("community_members")
          .select("user_id")
          .eq("community_id", c.id)
          .eq("user_id", session.user.id)
          .single();
        setIsMember(!!mem);

        const { count } = await supabase
          .from("community_members")
          .select("user_id", { count: "exact", head: true })
          .eq("community_id", c.id);
        if (count !== null) setMemberCount(count);
      }
      setLoading(false);
    })();
  }, [slug, session?.user.id, supabase]);

  const handleJoin = async () => {
    if (!session?.user.id || !community) return;
    await supabase.from("community_members").upsert({
      community_id: community.id,
      user_id: session.user.id,
    });
    setIsMember(true);
    setMemberCount((n) => n + 1);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <p style={{ color: "#839958", fontSize: 14 }}>Loading…</p>
    </div>
  );

  if (!community) return (
    <div style={{ padding: 32 }}>
      <p style={{ color: "#839958" }}>Community not found.</p>
      <Link href="/communities" style={{ color: "#0A3323", fontSize: 14 }}>← Back to Groups</Link>
    </div>
  );

  const iconBg = community.icon_color ?? "#F7F4D5";

  return (
    <div className="community-inner">
      {/* ── Left panel: community + channels ── */}
      <div className="community-channels-panel">
        {/* Community header */}
        <div style={{ padding: "16px 14px", borderBottom: "1px solid #e8e4ce" }}>
          <button
            onClick={() => router.push("/communities")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#839958", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}
          >
            ← All Groups
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              backgroundColor: iconBg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 800, color: "#1a1a1a", flexShrink: 0,
            }}>
              {community.name[0]}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>{community.name}</p>
              <p style={{ fontSize: 11, color: "#839958", margin: 0 }}>{memberCount.toLocaleString()} members</p>
            </div>
          </div>
          {isMember ? (
            <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#83995822", color: "#0A3323", borderRadius: 99, padding: "3px 10px" }}>
              Member ✓
            </span>
          ) : (
            <button onClick={handleJoin} style={{
              backgroundColor: "#0A3323", color: "#839958", border: "none",
              borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", width: "100%",
            }}>
              Join Community
            </button>
          )}
        </div>

        {/* Channel list */}
        <div style={{ padding: "12px 10px", flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#b0ab8c", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 4px 8px" }}>
            Channels
          </p>
          {channels.map((ch) => {
            const active = view === "chat" && activeChannel?.id === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => { setActiveChannel(ch); setView("chat"); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 8, border: "none",
                  backgroundColor: active ? "#0A3323" : "transparent",
                  color: active ? "#839958" : "#555",
                  fontWeight: active ? 700 : 500, fontSize: 13,
                  cursor: "pointer", textAlign: "left", marginBottom: 2,
                  transition: "all 0.12s",
                }}
              >
                <span style={{ fontSize: 15 }}>{ch.emoji}</span>
                <span>{ch.name}</span>
              </button>
            );
          })}

          {/* Directory + Rules */}
          <div style={{ borderTop: "1px solid #e8e4ce", marginTop: 12, paddingTop: 12 }}>
            <button
              onClick={() => setView("directory")}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", borderRadius: 8, border: "none",
                backgroundColor: view === "directory" ? "#0A3323" : "transparent",
                color: view === "directory" ? "#839958" : "#555",
                fontWeight: view === "directory" ? 700 : 500, fontSize: 13,
                cursor: "pointer", textAlign: "left", marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 15 }}>👥</span>
              <span>Member Directory</span>
            </button>
            <button
              onClick={() => setView("rules")}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", borderRadius: 8, border: "none",
                backgroundColor: view === "rules" ? "#0A3323" : "transparent",
                color: view === "rules" ? "#839958" : "#555",
                fontWeight: view === "rules" ? 700 : 500, fontSize: 13,
                cursor: "pointer", textAlign: "left", marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 15 }}>📋</span>
              <span>Rules</span>
            </button>
          </div>
        </div>

        {/* Role type badge */}
        {community.role_type && (
          <div style={{ padding: "10px 14px", borderTop: "1px solid #e8e4ce" }}>
            <span style={{ fontSize: 11, backgroundColor: "#e8e4ce", color: "#839958", borderRadius: 99, padding: "3px 10px", fontWeight: 600 }}>
              {community.role_type}
            </span>
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {view === "chat" && activeChannel ? (
          <ChannelChat
            key={activeChannel.id}
            channel={activeChannel}
            communityId={community.id}
            isMember={isMember}
            userId={session?.user.id ?? null}
          />
        ) : view === "directory" ? (
          <DirectoryView communityId={community.id} />
        ) : view === "rules" ? (
          <RulesView community={community} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
            <p style={{ color: "#839958", fontSize: 14 }}>Select a channel to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
