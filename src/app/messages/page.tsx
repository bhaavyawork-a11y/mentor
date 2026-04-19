"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

interface Conversation {
  id: string;
  last_message: string | null;
  last_message_at: string | null;
  updated_at: string;
  other_user: { id: string; full_name: string | null; current_job_role: string | null } | null;
  unread_count: number;
}

const AVATAR_PAL = ["#F7F4D5","#D3968C","#5B8AFF","#105666","#B5D5FF","#FFB5C8"];
function avatarBg(id: string) { let h=0; for(const c of id) h=(h*31+c.charCodeAt(0))&0xfffff; return AVATAR_PAL[h%AVATAR_PAL.length]; }
function initials(name: string) { return name.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase(); }
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff/60000);
  if(m<60) return `${m}m`;
  const h = Math.floor(m/60);
  if(h<24) return `${h}h`;
  return `${Math.floor(h/24)}d`;
}

export default function MessagesPage() {
  const supabase = createClient();
  const { session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSearch, setNewSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{id:string;full_name:string|null;current_job_role:string|null}[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const userId = session?.user?.id ?? "";

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    // Get my conversations
    const { data: myParts } = await supabase
      .from("dm_participants")
      .select("conversation_id, unread_count")
      .eq("user_id", userId);

    if (!myParts || myParts.length === 0) { setLoading(false); return; }

    const convIds = myParts.map((p: {conversation_id: string}) => p.conversation_id);
    const unreadMap: Record<string,number> = {};
    myParts.forEach((p: {conversation_id:string; unread_count:number}) => { unreadMap[p.conversation_id] = p.unread_count; });

    // Get conversation details
    const { data: convs } = await supabase
      .from("dm_conversations")
      .select("id, last_message, last_message_at, updated_at")
      .in("id", convIds)
      .order("updated_at", { ascending: false });

    // Get other participants for each conversation
    const { data: allParts } = await supabase
      .from("dm_participants")
      .select("conversation_id, user_id, profiles:user_id(id, full_name, current_job_role)")
      .in("conversation_id", convIds)
      .neq("user_id", userId);

    const otherUserMap: Record<string, {id:string; full_name:string|null; current_job_role:string|null}> = {};
    (allParts ?? []).forEach((p: {conversation_id:string; profiles: unknown}) => {
      const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
      if (prof) otherUserMap[p.conversation_id] = prof as {id:string; full_name:string|null; current_job_role:string|null};
    });

    const result: Conversation[] = (convs ?? []).map((c: {id:string; last_message:string|null; last_message_at:string|null; updated_at:string}) => ({
      ...c,
      other_user: otherUserMap[c.id] ?? null,
      unread_count: unreadMap[c.id] ?? 0,
    }));

    setConversations(result);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!newSearch.trim()) { setSearchResults([]); return; }
    const run = async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, current_job_role").ilike("full_name", `%${newSearch}%`).neq("id", userId).limit(6);
      setSearchResults(data ?? []);
    };
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [newSearch, userId, supabase]);

  const startConversation = async (recipientId: string) => {
    // Check if conversation exists
    const { data: myParts } = await supabase.from("dm_participants").select("conversation_id").eq("user_id", userId);
    const myConvIds = (myParts ?? []).map((p: {conversation_id:string}) => p.conversation_id);

    let convId: string | null = null;
    if (myConvIds.length > 0) {
      const { data: match } = await supabase.from("dm_participants").select("conversation_id").eq("user_id", recipientId).in("conversation_id", myConvIds).limit(1);
      if (match && match.length > 0) convId = match[0].conversation_id;
    }

    if (!convId) {
      const { data: conv } = await supabase.from("dm_conversations").insert({}).select("id").single();
      convId = conv?.id ?? null;
      if (convId) {
        await supabase.from("dm_participants").insert([
          { conversation_id: convId, user_id: userId },
          { conversation_id: convId, user_id: recipientId },
        ]);
      }
    }

    if (convId) {
      window.location.href = `/messages/${convId}`;
    }
  };

  const WA_HEADER = "#075E54";
  const WA_GREEN  = "#25D366";
  const WA_BG     = "#0D0F14";
  const WA_CARD   = "#141720";
  const WA_BORDER = "#1C2030";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 0 32px" }}>

      {/* ── WhatsApp-style header ── */}
      <div style={{
        backgroundColor: WA_HEADER,
        borderRadius: "16px 16px 0 0",
        padding: "16px 20px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 0,
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.3px" }}>Messages</h1>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", margin: "2px 0 0" }}>Direct messages with your connections</p>
        </div>
        <button
          onClick={() => setShowSearch(o => !o)}
          style={{
            fontSize: 12, fontWeight: 700, backgroundColor: WA_GREEN, color: "#fff",
            border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer",
            fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> New message
        </button>
      </div>

      {/* ── Search bar (inline, WhatsApp style) ── */}
      <div style={{ backgroundColor: WA_CARD, padding: "10px 16px", borderBottom: `1px solid ${WA_BORDER}` }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          backgroundColor: WA_BG, borderRadius: 10, padding: "8px 12px",
        }}>
          <span style={{ fontSize: 13, color: "#6B7280" }}>🔍</span>
          <input
            value={newSearch}
            onChange={e => setNewSearch(e.target.value)}
            onFocus={() => setShowSearch(true)}
            placeholder="Search or start new chat"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: 13, color: "#F9FAFB", fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* ── Search results dropdown ── */}
      {showSearch && searchResults.length > 0 && (
        <div style={{ backgroundColor: WA_CARD, borderBottom: `1px solid ${WA_BORDER}` }}>
          {searchResults.map(u => {
            const name = u.full_name ?? "Member";
            return (
              <button
                key={u.id}
                onClick={() => startConversation(u.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 20px", width: "100%",
                  background: "none", border: "none", cursor: "pointer",
                  textAlign: "left", fontFamily: "inherit",
                  borderBottom: `1px solid ${WA_BORDER}`,
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  backgroundColor: avatarBg(u.id),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, flexShrink: 0, color: "#fff",
                }}>
                  {initials(name)}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB", margin: 0 }}>{name}</p>
                  {u.current_job_role && (
                    <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{u.current_job_role}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Conversation list ── */}
      <div style={{ backgroundColor: WA_CARD, borderRadius: "0 0 16px 16px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <p style={{ color: "#6B7280", fontSize: 13, margin: 0 }}>Loading…</p>
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: "56px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#F9FAFB", margin: "0 0 8px" }}>
              No messages yet
            </p>
            <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>
              Start a conversation with someone from your group. Use the search bar above.
            </p>
          </div>
        ) : (
          conversations.map((conv, i) => {
            const user = conv.other_user;
            const name = user?.full_name ?? "Member";
            const bg = user ? avatarBg(user.id) : "#1A3A8F";
            const hasUnread = conv.unread_count > 0;
            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 20px", textDecoration: "none",
                  borderBottom: i < conversations.length - 1 ? `1px solid ${WA_BORDER}` : "none",
                  backgroundColor: hasUnread ? "rgba(37,211,102,0.04)" : "transparent",
                  transition: "background 0.1s",
                }}
              >
                {/* Avatar with online dot */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: "50%", backgroundColor: bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 800, color: "#fff",
                  }}>
                    {initials(name)}
                  </div>
                  {/* Online dot */}
                  <div style={{
                    position: "absolute", bottom: 1, right: 1,
                    width: 11, height: 11, borderRadius: "50%",
                    backgroundColor: WA_GREEN,
                    border: `2px solid ${WA_CARD}`,
                  }} />
                  {/* Unread badge */}
                  {hasUnread && (
                    <div style={{
                      position: "absolute", top: -2, right: -2,
                      minWidth: 18, height: 18, borderRadius: 9,
                      backgroundColor: WA_GREEN, border: `2px solid ${WA_CARD}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 800, color: "#fff", padding: "0 4px",
                    }}>
                      {conv.unread_count > 9 ? "9+" : conv.unread_count}
                    </div>
                  )}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <p style={{ fontSize: 14, fontWeight: hasUnread ? 800 : 600, color: "#F9FAFB", margin: 0 }}>
                      {name}
                    </p>
                    {conv.last_message_at && (
                      <span style={{ fontSize: 10, color: hasUnread ? WA_GREEN : "#6B7280", fontWeight: hasUnread ? 700 : 400, flexShrink: 0 }}>
                        {timeAgo(conv.last_message_at)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {/* Double tick (sent indicator) */}
                    <span style={{ fontSize: 11, color: hasUnread ? WA_GREEN : "#6B7280", flexShrink: 0 }}>✓✓</span>
                    <p style={{
                      fontSize: 12, color: hasUnread ? "#9CA3AF" : "#6B7280", margin: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      fontWeight: hasUnread ? 600 : 400,
                    }}>
                      {conv.last_message ?? "No messages yet"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
