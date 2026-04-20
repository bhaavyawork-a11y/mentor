"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/layout/BottomNav";

const INK = "#0A0A0A"; const MID = "#888"; const LIGHT = "#EBEBEB";
const BG = "#FAFAFA"; const WHITE = "#FFFFFF"; const NAVY = "#1A3A8F"; const NAVYL = "#5B8AFF";

interface Conversation {
  id: string; last_message: string | null; last_message_at: string | null;
  updated_at: string; unread_count: number;
  other_user: { id: string; full_name: string | null; current_job_role: string | null } | null;
}

const AVATAR_COLORS = ["#1A3A8F","#16A34A","#DC2626","#D97706","#7C3AED","#0891B2","#0E7490","#B45309"];

function hashColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}
function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  const dy = Math.floor(h / 24);
  if (dy < 7)  return `${dy}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const DEMO_CONVS: Conversation[] = [
  { id: "d1", last_message: "Sure, happy to connect next week!", last_message_at: new Date(Date.now() - 600000).toISOString(),  updated_at: new Date(Date.now() - 600000).toISOString(),  unread_count: 2, other_user: { id: "u1", full_name: "Kavya Sharma",  current_job_role: "Sr. PM · Razorpay"  } },
  { id: "d2", last_message: "Thanks for the intro, really helpful 🙏", last_message_at: new Date(Date.now() - 7200000).toISOString(), updated_at: new Date(Date.now() - 7200000).toISOString(), unread_count: 0, other_user: { id: "u2", full_name: "Arjun Kapoor",  current_job_role: "Growth Lead · Meesho" } },
  { id: "d3", last_message: "Let me check my calendar and get back to you", last_message_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString(), unread_count: 1, other_user: { id: "u3", full_name: "Riya Mehta",    current_job_role: "VC Associate · Lightspeed" } },
  { id: "d4", last_message: "Sent you the doc link!", last_message_at: new Date(Date.now() - 172800000).toISOString(), updated_at: new Date(Date.now() - 172800000).toISOString(), unread_count: 0, other_user: { id: "u4", full_name: "Dev Patel",     current_job_role: "Eng Manager · Swiggy" } },
];

export default function MessagesPage() {
  const supabase = createClient();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [userId,  setUserId]      = useState("");
  const [search,  setSearch]      = useState("");
  const [results, setResults]     = useState<{id:string;full_name:string|null;current_job_role:string|null}[]>([]);

  const load = useCallback(async (uid: string) => {
    if (!uid) return;
    const { data: myParts } = await supabase.from("dm_participants").select("conversation_id,unread_count").eq("user_id", uid);
    if (!myParts || myParts.length === 0) { setConversations(DEMO_CONVS); setLoading(false); return; }

    const convIds = myParts.map((p: {conversation_id:string}) => p.conversation_id);
    const unreadMap: Record<string,number> = {};
    myParts.forEach((p:{conversation_id:string;unread_count:number}) => { unreadMap[p.conversation_id] = p.unread_count; });

    const { data: convs } = await supabase.from("dm_conversations").select("id,last_message,last_message_at,updated_at").in("id", convIds).order("updated_at", { ascending: false });
    const { data: allParts } = await supabase.from("dm_participants").select("conversation_id,user_id,profiles:user_id(id,full_name,current_job_role)").in("conversation_id", convIds).neq("user_id", uid);

    const otherMap: Record<string,{id:string;full_name:string|null;current_job_role:string|null}> = {};
    (allParts ?? []).forEach((p:{conversation_id:string;profiles:unknown}) => {
      const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
      if (prof) otherMap[p.conversation_id] = prof as {id:string;full_name:string|null;current_job_role:string|null};
    });

    const result: Conversation[] = (convs ?? []).map((c:{id:string;last_message:string|null;last_message_at:string|null;updated_at:string}) => ({
      ...c, other_user: otherMap[c.id] ?? null, unread_count: unreadMap[c.id] ?? 0,
    }));
    setConversations(result.length > 0 ? result : DEMO_CONVS);
    setLoading(false);
  }, [supabase]); // eslint-disable-line

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { setUserId(user.id); await load(user.id); } else { setConversations(DEMO_CONVS); setLoading(false); }
    })();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,current_job_role").ilike("full_name", `%${search}%`).neq("id", userId).limit(6);
      setResults(data ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [search, userId]); // eslint-disable-line

  const startDM = async (recipientId: string) => {
    const { data: myParts } = await supabase.from("dm_participants").select("conversation_id").eq("user_id", userId);
    const myConvIds = (myParts ?? []).map((p:{conversation_id:string}) => p.conversation_id);
    let convId: string | null = null;
    if (myConvIds.length > 0) {
      const { data: match } = await supabase.from("dm_participants").select("conversation_id").eq("user_id", recipientId).in("conversation_id", myConvIds).limit(1);
      if (match && match.length > 0) convId = match[0].conversation_id;
    }
    if (!convId) {
      const { data: conv } = await supabase.from("dm_conversations").insert({}).select("id").single();
      convId = conv?.id ?? null;
      if (convId) await supabase.from("dm_participants").insert([{ conversation_id: convId, user_id: userId }, { conversation_id: convId, user_id: recipientId }]);
    }
    if (convId) window.location.href = `/messages/${convId}`;
  };

  const visibleConvs = search.trim()
    ? conversations.filter(c => c.other_user?.full_name?.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BG, display: "flex", flexDirection: "column", fontFamily: "var(--font-sora),Inter,sans-serif", paddingBottom: 64 }}>

      {/* ── Header ── */}
      <div style={{ backgroundColor: BG, padding: "20px 20px 0", flexShrink: 0 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: INK, letterSpacing: "-0.8px", margin: "0 0 16px" }}>
          Messages<span style={{ color: NAVYL }}>.</span>
        </h1>

        {/* Search bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, background: WHITE, border: `1.5px solid ${LIGHT}`, borderRadius: 12, padding: "10px 14px", marginBottom: 4 }}>
          <span style={{ fontSize: 14, color: "#BBBBBB" }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search messages…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: INK, fontFamily: "inherit" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: MID, fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
          )}
        </div>
      </div>

      {/* ── Search results (new conversation) ── */}
      {results.length > 0 && (
        <div style={{ margin: "8px 20px 0", background: WHITE, borderRadius: 12, border: `1.5px solid ${LIGHT}`, overflow: "hidden" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#BBBBBB", textTransform: "uppercase", letterSpacing: "1.5px", padding: "10px 14px 6px" }}>New conversation</div>
          {results.map((u, i) => {
            const name = u.full_name ?? "Member";
            return (
              <button
                key={u.id}
                onClick={() => startDM(u.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                  width: "100%", background: "none", border: "none", borderTop: i > 0 ? `1px solid ${LIGHT}` : "none",
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: hashColor(u.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: WHITE, flexShrink: 0 }}>{initials(name)}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{name}</div>
                  {u.current_job_role && <div style={{ fontSize: 11, color: MID }}>{u.current_job_role}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Conversation list ── */}
      <div style={{ flex: 1, padding: "12px 20px 0" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
            <div style={{ width: 26, height: 26, border: `3px solid ${LIGHT}`, borderTop: `3px solid ${INK}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : visibleConvs.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 72 }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>💬</div>
            <p style={{ fontSize: 15, fontWeight: 800, color: INK, margin: "0 0 8px" }}>No messages yet</p>
            <p style={{ fontSize: 13, color: MID, lineHeight: 1.6, maxWidth: 260, margin: "0 auto" }}>
              Start a conversation with someone from your group. Search by name above.
            </p>
          </div>
        ) : (
          <div style={{ background: WHITE, borderRadius: 14, border: `1.5px solid ${LIGHT}`, overflow: "hidden" }}>
            {visibleConvs.map((conv, i) => {
              const user = conv.other_user;
              const name = user?.full_name ?? "Member";
              const bg = user ? hashColor(user.id) : NAVY;
              const hasUnread = conv.unread_count > 0;
              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "13px 14px",
                    textDecoration: "none", borderTop: i > 0 ? `1px solid ${LIGHT}` : "none",
                    background: hasUnread ? "#F5F8FF" : WHITE,
                  }}
                >
                  {/* Avatar */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: WHITE }}>
                      {initials(name)}
                    </div>
                    {/* Online dot */}
                    <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: "50%", background: "#22C55E", border: `2px solid ${WHITE}` }} />
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: hasUnread ? 900 : 700, color: INK }}>{name}</span>
                      <span style={{ fontSize: 10, color: hasUnread ? NAVYL : "#BBBBBB", fontWeight: hasUnread ? 700 : 400, flexShrink: 0 }}>
                        {conv.last_message_at ? timeAgo(conv.last_message_at) : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <p style={{ fontSize: 12, color: hasUnread ? "#555" : MID, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: hasUnread ? 600 : 400, flex: 1 }}>
                        {conv.last_message ?? "No messages yet"}
                      </p>
                      {hasUnread && (
                        <div style={{ minWidth: 18, height: 18, borderRadius: 9, background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: WHITE, padding: "0 5px", flexShrink: 0 }}>
                          {conv.unread_count > 9 ? "9+" : conv.unread_count}
                        </div>
                      )}
                    </div>
                    {user?.current_job_role && (
                      <p style={{ fontSize: 10, color: "#CCCCCC", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.current_job_role}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
