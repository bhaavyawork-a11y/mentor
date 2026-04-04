"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  shared_post_id: string | null;
  created_at: string;
  sender?: { full_name: string | null };
  shared_post?: { content: string; type: string; author?: { full_name: string | null } } | null;
}

interface OtherUser { id: string; full_name: string | null; current_job_role: string | null }

const AVATAR_PAL = ["#F7F4D5","#D3968C","#839958","#105666","#B5D5FF","#FFB5C8"];
function avatarBg(id: string) { let h=0; for(const c of id) h=(h*31+c.charCodeAt(0))&0xfffff; return AVATAR_PAL[h%AVATAR_PAL.length]; }
function initials(name: string) { return name.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase(); }
function timeStr(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
}
function dateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
  const msgDay = new Date(d); msgDay.setHours(0,0,0,0);
  if (msgDay.getTime()===today.getTime()) return "Today";
  if (msgDay.getTime()===yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
}

export default function ChatPage() {
  const params = useParams();
  const conversationId = params?.id as string;
  const supabase = createClient();
  const { session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser|null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userId = session?.user?.id ?? "";

  const load = useCallback(async () => {
    if (!userId || !conversationId) return;

    // Get other participant
    const { data: parts } = await supabase
      .from("dm_participants")
      .select("user_id, profiles:user_id(id, full_name, current_job_role)")
      .eq("conversation_id", conversationId)
      .neq("user_id", userId)
      .limit(1);

    if (parts && parts.length > 0 && parts[0].profiles) {
      const prof = Array.isArray(parts[0].profiles) ? parts[0].profiles[0] : parts[0].profiles;
      if (prof) setOtherUser(prof as unknown as OtherUser);
    }

    // Get messages
    const { data: msgs } = await supabase
      .from("dm_messages")
      .select("*, sender:sender_id(full_name), shared_post:shared_post_id(content, type, author:user_id(full_name))")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    setMessages((msgs as Message[]) ?? []);

    // Mark as read
    await supabase
      .from("dm_participants")
      .update({ unread_count: 0, last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);

    setLoading(false);
  }, [userId, conversationId, supabase]);

  useEffect(() => { load(); }, [load]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"dm_messages", filter:`conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id !== userId) {
            setMessages(prev => [...prev, newMsg]);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, userId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending || !userId) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: userId,
      content: text,
      shared_post_id: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    await supabase.from("dm_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: text,
    });

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach(msg => {
    const label = dateLabel(msg.created_at);
    if (grouped.length===0 || grouped[grouped.length-1].date!==label) {
      grouped.push({ date: label, msgs: [msg] });
    } else {
      grouped[grouped.length-1].msgs.push(msg);
    }
  });

  const otherName = otherUser?.full_name ?? "Member";
  const otherBg = otherUser ? avatarBg(otherUser.id) : "#e8e4ce";

  return (
    <div style={{ maxWidth:680, margin:"0 auto", display:"flex", flexDirection:"column", height:"calc(100vh - 40px)" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0 14px", borderBottom:"1px solid #e8e4ce", flexShrink:0 }}>
        <Link href="/messages" style={{ fontSize:18, color:"#839958", textDecoration:"none", lineHeight:1 }}>←</Link>
        <div style={{ width:38, height:38, borderRadius:"50%", backgroundColor:otherBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800 }}>
          {initials(otherName)}
        </div>
        <div>
          <p style={{ fontSize:14, fontWeight:800, color:"#1a1a1a", margin:0 }}>{otherName}</p>
          {otherUser?.current_job_role && <p style={{ fontSize:11, color:"#839958", margin:0 }}>{otherUser.current_job_role}</p>}
        </div>
        {otherUser && (
          <Link href={`/profile/${otherUser.id}`} style={{ marginLeft:"auto", fontSize:11, fontWeight:600, color:"#839958", textDecoration:"none", border:"1px solid #e8e4ce", borderRadius:8, padding:"5px 12px" }}>View profile</Link>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 0" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:40 }}><p style={{ color:"#839958", fontSize:13 }}>Loading…</p></div>
        ) : messages.length===0 ? (
          <div style={{ textAlign:"center", padding:"48px 24px" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", backgroundColor:otherBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:800, margin:"0 auto 12px" }}>{initials(otherName)}</div>
            <p style={{ fontSize:14, fontWeight:700, color:"#1a1a1a", margin:"0 0 6px" }}>{otherName}</p>
            {otherUser?.current_job_role && <p style={{ fontSize:12, color:"#839958", margin:"0 0 16px" }}>{otherUser.current_job_role}</p>}
            <p style={{ fontSize:13, color:"#b0ab8c", margin:0 }}>Start the conversation</p>
          </div>
        ) : (
          grouped.map(({ date, msgs }) => (
            <div key={date}>
              {/* Date divider */}
              <div style={{ display:"flex", alignItems:"center", gap:10, margin:"16px 0 10px" }}>
                <div style={{ flex:1, height:1, backgroundColor:"#f5f0e8" }} />
                <span style={{ fontSize:10, color:"#b0ab8c", fontWeight:600 }}>{date}</span>
                <div style={{ flex:1, height:1, backgroundColor:"#f5f0e8" }} />
              </div>

              {msgs.map((msg, i) => {
                const isMe = msg.sender_id === userId;
                const showAvatar = !isMe && (i===0 || msgs[i-1].sender_id!==msg.sender_id);
                return (
                  <div key={msg.id} style={{ display:"flex", justifyContent:isMe?"flex-end":"flex-start", marginBottom:4, alignItems:"flex-end", gap:8 }}>
                    {!isMe && (
                      <div style={{ width:28, height:28, borderRadius:"50%", backgroundColor:otherBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, flexShrink:0, opacity:showAvatar?1:0 }}>
                        {initials(otherName)}
                      </div>
                    )}
                    <div style={{ maxWidth:"70%" }}>
                      {/* Shared post preview */}
                      {msg.shared_post_id && msg.shared_post && (
                        <div style={{ backgroundColor: isMe?"rgba(255,255,255,0.15)":"#F9F7EC", border:"1px solid #e8e4ce", borderRadius:10, padding:"8px 12px", marginBottom:4, fontSize:12 }}>
                          <p style={{ fontSize:10, fontWeight:700, color:"#839958", margin:"0 0 4px", textTransform:"uppercase" }}>Shared post</p>
                          <p style={{ fontSize:12, color:"#333", margin:0, lineHeight:1.5 }}>{msg.shared_post.content.slice(0,100)}{msg.shared_post.content.length>100?"…":""}</p>
                        </div>
                      )}
                      {msg.content && (
                        <div style={{
                          backgroundColor: isMe?"#0A3323":"#fff",
                          color: isMe?"#F7F4D5":"#1a1a1a",
                          border: isMe?"none":"1px solid #e8e4ce",
                          borderRadius: isMe?"14px 14px 4px 14px":"4px 14px 14px 14px",
                          padding:"9px 13px", fontSize:13, lineHeight:1.6,
                        }}>
                          {msg.content}
                        </div>
                      )}
                      <p style={{ fontSize:9, color:"#b0ab8c", margin:"3px 0 0", textAlign:isMe?"right":"left" }}>{timeStr(msg.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop:"1px solid #e8e4ce", padding:"12px 0 4px", flexShrink:0 }}>
        <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherName}…`}
            rows={1}
            style={{ flex:1, fontSize:13, border:"1px solid #e8e4ce", borderRadius:12, padding:"10px 14px", resize:"none", fontFamily:"inherit", lineHeight:1.6, outline:"none", maxHeight:120, overflowY:"auto" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            style={{ width:40, height:40, borderRadius:10, flexShrink:0, border:"none", cursor:input.trim()&&!sending?"pointer":"default", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.15s",
              backgroundColor: input.trim()&&!sending?"#0A3323":"#e8e4ce",
              color: input.trim()&&!sending?"#F7F4D5":"#b0ab8c",
            }}
          >
            ↑
          </button>
        </div>
        <p style={{ fontSize:10, color:"#b0ab8c", margin:"5px 0 0", textAlign:"center" }}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
