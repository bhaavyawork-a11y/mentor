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

const AVATAR_PAL = ["#F7F4D5","#D3968C","#839958","#105666","#B5D5FF","#FFB5C8"];
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

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "8px 0 32px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#0A3323", margin:0 }}>Messages</h1>
          <p style={{ fontSize:12, color:"#839958", margin:"2px 0 0" }}>Direct messages with your connections</p>
        </div>
        <button onClick={()=>setShowSearch(o=>!o)} style={{ fontSize:13, fontWeight:700, backgroundColor:"#0A3323", color:"#F7F4D5", border:"none", borderRadius:10, padding:"8px 18px", cursor:"pointer", fontFamily:"inherit" }}>
          + New message
        </button>
      </div>

      {/* New message search */}
      {showSearch && (
        <div style={{ backgroundColor:"#fff", border:"1px solid #e8e4ce", borderRadius:14, padding:16, marginBottom:16 }}>
          <p style={{ fontSize:12, fontWeight:700, color:"#839958", margin:"0 0 10px" }}>Search people</p>
          <input
            value={newSearch} onChange={e=>setNewSearch(e.target.value)}
            placeholder="Type a name..."
            autoFocus
            style={{ width:"100%", boxSizing:"border-box", fontSize:13, border:"1px solid #e8e4ce", borderRadius:10, padding:"9px 12px", fontFamily:"inherit", outline:"none" }}
          />
          {searchResults.length > 0 && (
            <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:4 }}>
              {searchResults.map(u => {
                const name = u.full_name ?? "Member";
                return (
                  <button key={u.id} onClick={()=>startConversation(u.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:10, border:"1px solid #f5f0e8", backgroundColor:"#fff", cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", backgroundColor:avatarBg(u.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0 }}>{initials(name)}</div>
                    <div>
                      <p style={{ fontSize:13, fontWeight:700, color:"#1a1a1a", margin:0 }}>{name}</p>
                      {u.current_job_role && <p style={{ fontSize:11, color:"#839958", margin:0 }}>{u.current_job_role}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conversations list */}
      <div style={{ backgroundColor:"#fff", border:"1px solid #e8e4ce", borderRadius:14, overflow:"hidden" }}>
        {loading ? (
          <div style={{ padding:40, textAlign:"center" }}><p style={{ color:"#839958", fontSize:13 }}>Loading…</p></div>
        ) : conversations.length === 0 ? (
          <div style={{ padding:"48px 32px", textAlign:"center" }}>
            <p style={{ fontSize:14, fontWeight:700, color:"#1a1a1a", margin:"0 0 12px", lineHeight:1.6 }}>No messages yet. Start a conversation to connect with peers in your network.</p>
            <p style={{ fontSize:13, color:"#839958", margin:0 }}>Click <strong>+ New message</strong> above or share a post directly to someone.</p>
          </div>
        ) : (
          conversations.map((conv, i) => {
            const user = conv.other_user;
            const name = user?.full_name ?? "Member";
            const bg = user ? avatarBg(user.id) : "#e8e4ce";
            return (
              <Link key={conv.id} href={`/messages/${conv.id}`} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", textDecoration:"none", borderBottom: i < conversations.length-1 ? "1px solid #f5f0e8" : "none", backgroundColor: conv.unread_count > 0 ? "#F9F7EC" : "#fff", transition:"background 0.1s" }}>
                <div style={{ width:42, height:42, borderRadius:"50%", backgroundColor:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, flexShrink:0, position:"relative" }}>
                  {initials(name)}
                  {conv.unread_count > 0 && (
                    <div style={{ position:"absolute", top:-2, right:-2, width:16, height:16, borderRadius:"50%", backgroundColor:"#D3968C", border:"2px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:800, color:"#fff" }}>
                      {conv.unread_count > 9 ? "9+" : conv.unread_count}
                    </div>
                  )}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                    <p style={{ fontSize:14, fontWeight: conv.unread_count>0?800:600, color:"#1a1a1a", margin:0 }}>{name}</p>
                    {conv.last_message_at && <span style={{ fontSize:10, color:"#b0ab8c" }}>{timeAgo(conv.last_message_at)}</span>}
                  </div>
                  <p style={{ fontSize:12, color: conv.unread_count>0?"#555":"#839958", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight: conv.unread_count>0?600:400 }}>
                    {conv.last_message ?? "No messages yet"}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
