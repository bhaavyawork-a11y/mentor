"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  community_id: string;
  user_id: string;
  type: "Discussion" | "Resource" | "Job referral" | "Repost";
  content: string;
  link_url: string | null;
  referral_company: string | null;
  referral_role: string | null;
  media_urls: string[];
  repost_of: string | null;
  helpful_count: number;
  reply_count: number;
  created_at: string;
  author?: { full_name: string | null; current_job_role: string | null };
  community?: { name: string; slug: string };
  original?: Post | null;
}

interface Community { id: string; slug: string; name: string; member_count: number; posts_this_week: number; icon_color: string }
interface FollowedUser { following_id: string }
interface LikedPost { post_id: string }
interface SavedPost { post_id: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const AVATAR_PAL = ["#F7F4D5","#D3968C","#839958","#105666","#B5D5FF","#FFB5C8"];
function avatarBg(id: string) { let h=0; for(const c of id) h=(h*31+c.charCodeAt(0))&0xfffff; return AVATAR_PAL[h%AVATAR_PAL.length]; }
function initials(name: string) { return name.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase(); }

const TYPE_STYLE: Record<string, {bg:string; color:string; label:string}> = {
  "Discussion":  { bg:"#e8e4ce",   color:"#839958", label:"Discussion"  },
  "Resource":    { bg:"#B5D5FF33", color:"#105666", label:"Resource 🔗" },
  "Job referral":{ bg:"#D3968C22", color:"#a05a44", label:"Referral 🤝" },
  "Repost":      { bg:"#83995822", color:"#0A3323", label:"Repost 🔁"   },
};

// ─── Share Modal ──────────────────────────────────────────────────────────────

function ShareModal({ post, currentUserId, onClose }: { post: Post; currentUserId: string; onClose: () => void }) {
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<{id:string; full_name:string|null; current_job_role:string|null}[]>([]);
  const [sending, setSending] = useState<string|null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    const run = async () => {
      const q = supabase.from("profiles").select("id, full_name, current_job_role").neq("id", currentUserId).limit(20);
      if (search.trim()) q.ilike("full_name", `%${search}%`);
      const { data } = await q;
      setUsers(data ?? []);
    };
    run();
  }, [search, currentUserId, supabase]);

  const handleSend = async (recipientId: string) => {
    setSending(recipientId);
    // Find or create DM conversation
    const { data: existing } = await supabase
      .from("dm_participants")
      .select("conversation_id")
      .eq("user_id", currentUserId);

    const myConvIds = (existing ?? []).map((p: {conversation_id: string}) => p.conversation_id);
    let conversationId: string | null = null;

    if (myConvIds.length > 0) {
      const { data: match } = await supabase
        .from("dm_participants")
        .select("conversation_id")
        .eq("user_id", recipientId)
        .in("conversation_id", myConvIds)
        .limit(1);
      if (match && match.length > 0) conversationId = match[0].conversation_id;
    }

    if (!conversationId) {
      const { data: conv } = await supabase.from("dm_conversations").insert({}).select("id").single();
      conversationId = conv?.id ?? null;
      if (conversationId) {
        await supabase.from("dm_participants").insert([
          { conversation_id: conversationId, user_id: currentUserId },
          { conversation_id: conversationId, user_id: recipientId },
        ]);
      }
    }

    if (conversationId) {
      await supabase.from("dm_messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        shared_post_id: post.id,
        content: `Shared a post: "${post.content.slice(0, 60)}${post.content.length > 60 ? "…" : ""}"`,
      });
    }
    setSent(prev => { const s = new Set(Array.from(prev)); s.add(recipientId); return s; });
    setSending(null);
  };

  return (
    <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ backgroundColor:"#fff", borderRadius:16, padding:24, width:380, maxHeight:"80vh", display:"flex", flexDirection:"column", gap:14 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <p style={{ fontSize:15, fontWeight:800, color:"#1a1a1a", margin:0 }}>Share post</p>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#839958" }}>×</button>
        </div>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search people..."
          style={{ fontSize:13, border:"1px solid #e8e4ce", borderRadius:10, padding:"9px 12px", fontFamily:"inherit", outline:"none" }}
        />
        <div style={{ overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
          {users.map(u => {
            const name = u.full_name ?? "Member";
            const bg = avatarBg(u.id);
            const isSent = sent.has(u.id);
            return (
              <div key={u.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 4px" }}>
                <div style={{ width:34, height:34, borderRadius:"50%", backgroundColor:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, flexShrink:0 }}>{initials(name)}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:"#1a1a1a", margin:0 }}>{name}</p>
                  {u.current_job_role && <p style={{ fontSize:11, color:"#839958", margin:0 }}>{u.current_job_role}</p>}
                </div>
                <button
                  onClick={() => !isSent && handleSend(u.id)}
                  disabled={isSent || sending === u.id}
                  style={{ fontSize:11, fontWeight:700, border:"none", borderRadius:8, padding:"6px 14px", cursor: isSent ? "default":"pointer", fontFamily:"inherit",
                    backgroundColor: isSent ? "#83995833" : "#0A3323",
                    color: isSent ? "#0A3323" : "#F7F4D5",
                  }}
                >
                  {isSent ? "Sent ✓" : sending===u.id ? "…" : "Send"}
                </button>
              </div>
            );
          })}
        </div>
        <div style={{ borderTop:"1px solid #e8e4ce", paddingTop:12 }}>
          <button
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/communities/${post.community?.slug ?? ""}`); }}
            style={{ width:"100%", fontSize:12, fontWeight:700, color:"#839958", background:"#F9F7EC", border:"1px solid #e8e4ce", borderRadius:10, padding:"9px 0", cursor:"pointer", fontFamily:"inherit" }}
          >
            📋 Copy link
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Media display ────────────────────────────────────────────────────────────

function MediaGrid({ urls }: { urls: string[] }) {
  if (!urls || urls.length === 0) return null;
  const isVideo = (url: string) => /\.(mp4|mov|webm)(\?|$)/i.test(url);

  if (urls.length === 1) {
    const url = urls[0];
    return isVideo(url) ? (
      <video src={url} controls style={{ width:"100%", borderRadius:10, maxHeight:400, objectFit:"cover", marginBottom:10 }} />
    ) : (
      <img src={url} alt="" style={{ width:"100%", borderRadius:10, maxHeight:400, objectFit:"cover", marginBottom:10 }} />
    );
  }

  return (
    <div style={{ display:"grid", gridTemplateColumns: urls.length === 2 ? "1fr 1fr" : "1fr 1fr", gap:4, marginBottom:10, borderRadius:10, overflow:"hidden" }}>
      {urls.slice(0,4).map((url, i) => (
        isVideo(url)
          ? <video key={i} src={url} controls style={{ width:"100%", height:180, objectFit:"cover" }} />
          : <img key={i} src={url} alt="" style={{ width:"100%", height:180, objectFit:"cover" }} />
      ))}
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  post, currentUserId, isLiked, isSaved,
  isFollowing, onLike, onSave, onRepost, onShare, onFollow,
}: {
  post: Post; currentUserId: string;
  isLiked: boolean; isSaved: boolean; isFollowing: boolean;
  onLike: (id:string) => void; onSave: (id:string) => void;
  onRepost: (post:Post) => void; onShare: (post:Post) => void;
  onFollow: (uid:string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const authorName = post.author?.full_name ?? "Member";
  const authorRole = post.author?.current_job_role ?? "";
  const bg = avatarBg(post.user_id);
  const inits = initials(authorName);
  const typeStyle = TYPE_STYLE[post.type] ?? TYPE_STYLE["Discussion"];
  const long = post.content.length > 240;
  const display = !expanded && long ? post.content.slice(0,240)+"…" : post.content;
  const isOwnPost = currentUserId === post.user_id;

  return (
    <div style={{ backgroundColor:"#fff", border:"1px solid #e8e4ce", borderRadius:14, padding:18, marginBottom:10 }}>
      {/* Header */}
      <div style={{ display:"flex", gap:10, marginBottom:12 }}>
        <Link href={`/profile/${post.user_id}`}>
          <div style={{ width:40, height:40, borderRadius:"50%", backgroundColor:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, flexShrink:0, cursor:"pointer" }}>
            {inits}
          </div>
        </Link>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <Link href={`/profile/${post.user_id}`} style={{ fontSize:14, fontWeight:700, color:"#1a1a1a", textDecoration:"none" }}>{authorName}</Link>
            <span style={{ fontSize:11, backgroundColor:typeStyle.bg, color:typeStyle.color, borderRadius:99, padding:"2px 8px", fontWeight:600 }}>{typeStyle.label}</span>
            {!isOwnPost && (
              <button onClick={() => onFollow(post.user_id)} style={{ marginLeft:"auto", fontSize:11, fontWeight:700, border:`1px solid ${isFollowing?"#e8e4ce":"#0A3323"}`, borderRadius:99, padding:"3px 10px", cursor:"pointer", backgroundColor:"transparent", color:isFollowing?"#839958":"#0A3323", fontFamily:"inherit" }}>
                {isFollowing ? "Following" : "+ Follow"}
              </button>
            )}
          </div>
          <div style={{ fontSize:11, color:"#839958", marginTop:2, display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
            {authorRole && <span>{authorRole}</span>}
            {authorRole && <span>·</span>}
            <span>{timeAgo(post.created_at)}</span>
            {post.community && (
              <><span>·</span>
              <Link href={`/communities/${post.community.slug}`} style={{ color:"#105666", textDecoration:"none", fontWeight:600 }}>{post.community.name}</Link></>
            )}
          </div>
        </div>
      </div>

      {/* Referral badge */}
      {post.type === "Job referral" && post.referral_company && (
        <div style={{ backgroundColor:"#D3968C11", border:"1px solid #D3968C33", borderRadius:8, padding:"8px 12px", marginBottom:10 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#a05a44" }}>🤝 Can refer at {post.referral_company}</span>
          {post.referral_role && <span style={{ fontSize:12, color:"#839958", marginLeft:8 }}>· {post.referral_role}</span>}
        </div>
      )}

      {/* Repost: show original */}
      {post.type === "Repost" && post.original && (
        <div style={{ border:"1px solid #e8e4ce", borderRadius:10, padding:12, marginBottom:10, backgroundColor:"#F9F7EC" }}>
          <p style={{ fontSize:12, fontWeight:700, color:"#555", margin:"0 0 6px" }}>{post.original.author?.full_name ?? "Member"}</p>
          <p style={{ fontSize:13, color:"#333", margin:0, lineHeight:1.6 }}>{post.original.content.slice(0,160)}{post.original.content.length>160?"…":""}</p>
        </div>
      )}

      {/* Content */}
      {post.content && (
        <p style={{ fontSize:14, color:"#333", lineHeight:1.65, margin:"0 0 10px", whiteSpace:"pre-wrap" }}>
          {display}
          {long && <button onClick={()=>setExpanded(o=>!o)} style={{ background:"none", border:"none", cursor:"pointer", color:"#839958", fontSize:13, fontWeight:600, padding:0, marginLeft:4 }}>{expanded?" Show less":" …more"}</button>}
        </p>
      )}

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && <MediaGrid urls={post.media_urls} />}

      {post.link_url && (
        <a href={post.link_url} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:"#105666", textDecoration:"none", display:"block", marginBottom:10 }}>🔗 {post.link_url}</a>
      )}

      {/* Action bar */}
      <div style={{ display:"flex", gap:2, borderTop:"1px solid #f5f0e8", paddingTop:10, flexWrap:"wrap" }}>
        {/* Like */}
        <button onClick={()=>onLike(post.id)} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight: isLiked?700:400, color:isLiked?"#0A3323":"#839958", background: isLiked?"#F7F4D5":"none", border:"none", cursor:"pointer", padding:"5px 10px", borderRadius:8, fontFamily:"inherit", transition:"all 0.15s" }}>
          👍 {post.helpful_count > 0 && <span>{post.helpful_count}</span>}
          <span>Helpful</span>
        </button>

        {/* Reply */}
        <button style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#839958", background:"none", border:"none", cursor:"pointer", padding:"5px 10px", borderRadius:8, fontFamily:"inherit" }}>
          💬 {post.reply_count > 0 && <span>{post.reply_count}</span>} <span>Reply</span>
        </button>

        {/* Repost */}
        <button onClick={()=>onRepost(post)} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#839958", background:"none", border:"none", cursor:"pointer", padding:"5px 10px", borderRadius:8, fontFamily:"inherit" }}>
          🔁 Repost
        </button>

        {/* Save */}
        <button onClick={()=>onSave(post.id)} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:isSaved?700:400, color:isSaved?"#105666":"#839958", background:isSaved?"#B5D5FF22":"none", border:"none", cursor:"pointer", padding:"5px 10px", borderRadius:8, fontFamily:"inherit", transition:"all 0.15s" }}>
          {isSaved?"🔖":"🔖"} <span>{isSaved?"Saved":"Save"}</span>
        </button>

        {/* Share */}
        <button onClick={()=>onShare(post)} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#839958", background:"none", border:"none", cursor:"pointer", padding:"5px 10px", borderRadius:8, fontFamily:"inherit", marginLeft:"auto" }}>
          ↗ Share
        </button>
      </div>

      {/* Request referral CTA */}
      {post.type === "Job referral" && !isOwnPost && (
        <div style={{ marginTop:10 }}>
          <button onClick={()=>onShare(post)} style={{ width:"100%", fontSize:12, fontWeight:700, color:"#0A3323", backgroundColor:"#F7F4D5", border:"1px solid #e8e4ce", borderRadius:8, padding:"9px 0", cursor:"pointer", fontFamily:"inherit" }}>
            Request referral via DM →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Post Composer ────────────────────────────────────────────────────────────

function PostComposer({ userId, userInitials, userAvatarBg, communities, onPosted }: {
  userId: string; userInitials: string; userAvatarBg: string;
  communities: Community[]; onPosted: () => void;
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [type, setType] = useState<"Discussion"|"Resource"|"Job referral">("Discussion");
  const [communityId, setCommunityId] = useState(communities[0]?.id ?? "");
  const [referralCompany, setReferralCompany] = useState("");
  const [referralRole, setReferralRole] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);

  useEffect(() => { if(communities.length>0 && !communityId) setCommunityId(communities[0].id); }, [communities, communityId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 4);
    setMediaFiles(files);
    setMediaPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const removeMedia = (i: number) => {
    setMediaFiles(prev => prev.filter((_,idx)=>idx!==i));
    setMediaPreviews(prev => prev.filter((_,idx)=>idx!==i));
  };

  const handlePost = async () => {
    if (!content.trim() || !communityId) return;
    setPosting(true);

    // Upload media files to Supabase Storage
    let uploadedUrls: string[] = [];
    for (const file of mediaFiles) {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: uploaded } = await supabase.storage.from("post-media").upload(path, file, { upsert: false });
      if (uploaded) {
        const { data: { publicUrl } } = supabase.storage.from("post-media").getPublicUrl(path);
        uploadedUrls.push(publicUrl);
      }
    }

    await supabase.from("community_posts").insert({
      community_id: communityId, user_id: userId, type,
      content: content.trim(),
      link_url: linkUrl || null,
      referral_company: type === "Job referral" ? referralCompany : null,
      referral_role: type === "Job referral" ? referralRole : null,
      media_urls: uploadedUrls,
    });

    setContent(""); setLinkUrl(""); setReferralCompany(""); setReferralRole("");
    setMediaFiles([]); setMediaPreviews([]); setOpen(false); setPosting(false);
    onPosted();
  };

  return (
    <div style={{ backgroundColor:"#fff", border:"1px solid #e8e4ce", borderRadius:14, padding:16, marginBottom:12 }}>
      {!open ? (
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ width:36, height:36, borderRadius:"50%", backgroundColor:userAvatarBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, flexShrink:0 }}>{userInitials}</div>
          <button onClick={()=>setOpen(true)} style={{ flex:1, textAlign:"left", background:"#F9F7EC", border:"1px solid #e8e4ce", borderRadius:20, padding:"10px 16px", fontSize:13, color:"#839958", cursor:"pointer", fontFamily:"inherit" }}>
            Share a win, question, or referral offer...
          </button>
          <button onClick={()=>setOpen(true)} style={{ fontSize:20, background:"none", border:"none", cursor:"pointer" }} title="Add photo/video">📷</button>
        </div>
      ) : (
        <div style={{ display:"flex", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:"50%", backgroundColor:userAvatarBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, flexShrink:0 }}>{userInitials}</div>
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
            {/* Type pills */}
            <div style={{ display:"flex", gap:6 }}>
              {(["Discussion","Resource","Job referral"] as const).map(t => (
                <button key={t} onClick={()=>setType(t)} style={{ fontSize:11, fontWeight:type===t?700:500, border:"none", borderRadius:99, cursor:"pointer", padding:"4px 12px", backgroundColor:type===t?"#0A3323":"#e8e4ce", color:type===t?"#F7F4D5":"#839958" }}>{t}</button>
              ))}
            </div>

            {/* Community picker */}
            {communities.length > 0 && (
              <select value={communityId} onChange={e=>setCommunityId(e.target.value)} style={{ fontSize:12, color:"#555", border:"1px solid #e8e4ce", borderRadius:8, padding:"6px 10px", backgroundColor:"#fff", fontFamily:"inherit" }}>
                {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}

            <textarea rows={3} value={content} onChange={e=>setContent(e.target.value)}
              placeholder={type==="Job referral" ? "I can refer people at [company]. What role and a bit about yourself..." : "What's on your mind?"}
              style={{ width:"100%", boxSizing:"border-box", resize:"none", fontSize:13, border:"1px solid #e8e4ce", borderRadius:10, padding:"10px 12px", fontFamily:"inherit", lineHeight:1.6, outline:"none" }}
            />

            {type==="Job referral" && (
              <div style={{ display:"flex", gap:8 }}>
                <input value={referralCompany} onChange={e=>setReferralCompany(e.target.value)} placeholder="Company" style={{ flex:1, fontSize:12, border:"1px solid #e8e4ce", borderRadius:8, padding:"8px 10px", fontFamily:"inherit" }} />
                <input value={referralRole} onChange={e=>setReferralRole(e.target.value)} placeholder="Role (optional)" style={{ flex:1, fontSize:12, border:"1px solid #e8e4ce", borderRadius:8, padding:"8px 10px", fontFamily:"inherit" }} />
              </div>
            )}
            {type==="Resource" && (
              <input value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} placeholder="Link URL (optional)" style={{ width:"100%", boxSizing:"border-box", fontSize:12, border:"1px solid #e8e4ce", borderRadius:8, padding:"8px 10px", fontFamily:"inherit" }} />
            )}

            {/* Media previews */}
            {mediaPreviews.length > 0 && (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {mediaPreviews.map((url, i) => (
                  <div key={i} style={{ position:"relative" }}>
                    {mediaFiles[i]?.type.startsWith("video/")
                      ? <video src={url} style={{ width:80, height:80, objectFit:"cover", borderRadius:8 }} />
                      : <img src={url} alt="" style={{ width:80, height:80, objectFit:"cover", borderRadius:8 }} />
                    }
                    <button onClick={()=>removeMedia(i)} style={{ position:"absolute", top:-6, right:-6, width:18, height:18, borderRadius:"50%", backgroundColor:"#1a1a1a", color:"#fff", border:"none", cursor:"pointer", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom toolbar */}
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={()=>fileInputRef.current?.click()} title="Add photo/video" style={{ fontSize:18, background:"none", border:"none", cursor:"pointer", padding:4 }}>📷</button>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display:"none" }} onChange={handleFileSelect} />
              <span style={{ fontSize:11, color:"#b0ab8c", flex:1 }}>Photos & videos (up to 4)</span>
              <button onClick={()=>{ setOpen(false); setContent(""); setMediaFiles([]); setMediaPreviews([]); }} style={{ fontSize:12, color:"#839958", background:"none", border:"none", cursor:"pointer" }}>Cancel</button>
              <button onClick={handlePost} disabled={posting||!content.trim()} style={{ fontSize:12, fontWeight:700, backgroundColor:"#0A3323", color:"#F7F4D5", border:"none", borderRadius:8, padding:"8px 20px", cursor:"pointer", opacity:posting||!content.trim()?0.6:1 }}>
                {posting?"Posting…":"Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profile card (left sidebar) ──────────────────────────────────────────────

function ProfileCard({ displayName, role, targetRole, circlesCount, followersCount, followingCount }: {
  displayName:string; role:string|null; targetRole:string|null;
  circlesCount:number; followersCount:number; followingCount:number;
}) {
  const bg = avatarBg(displayName);
  const inits = initials(displayName);
  return (
    <div style={{ backgroundColor:"#fff", border:"1px solid #e8e4ce", borderRadius:14, overflow:"hidden", marginBottom:10 }}>
      <div style={{ height:52, background:"linear-gradient(135deg, #0A3323 0%, #105666 100%)" }} />
      <div style={{ padding:"0 16px 16px", position:"relative" }}>
        <div style={{ width:50, height:50, borderRadius:"50%", backgroundColor:bg, border:"3px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, fontWeight:800, position:"absolute", top:-25 }}>{inits}</div>
        <div style={{ paddingTop:28 }}>
          <p style={{ fontSize:14, fontWeight:800, color:"#1a1a1a", margin:"0 0 2px" }}>{displayName}</p>
          {role && <p style={{ fontSize:11, color:"#839958", margin:"0 0 2px" }}>{role}</p>}
          {targetRole && <p style={{ fontSize:11, color:"#105666", margin:0 }}>→ {targetRole}</p>}
        </div>
        <div style={{ borderTop:"1px solid #f5f0e8", marginTop:10, paddingTop:10, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", textAlign:"center", gap:4 }}>
          {[["circles", circlesCount], ["followers", followersCount], ["following", followingCount]].map(([label, val]) => (
            <div key={label as string}>
              <p style={{ fontSize:15, fontWeight:800, color:"#0A3323", margin:0 }}>{val}</p>
              <p style={{ fontSize:9, color:"#839958", margin:0, textTransform:"uppercase", letterSpacing:"0.3px" }}>{label}</p>
            </div>
          ))}
        </div>
        <Link href="/profile" style={{ display:"block", textAlign:"center", fontSize:11, fontWeight:700, color:"#839958", textDecoration:"none", marginTop:10 }}>Edit profile →</Link>
      </div>
    </div>
  );
}

// ─── Right sidebar ────────────────────────────────────────────────────────────

function RightSidebar({ communities, myCommIds, suggestedUsers, followingIds, onFollow }: {
  communities: Community[]; myCommIds: Set<string>;
  suggestedUsers: {id:string; full_name:string|null; current_job_role:string|null}[];
  followingIds: Set<string>; onFollow: (uid:string) => void;
}) {
  const myComms = communities.filter(c=>myCommIds.has(c.id)).slice(0,4);
  const suggestedComms = communities.filter(c=>!myCommIds.has(c.id)).slice(0,3);
  const PAL = ["#F7F4D5","#D3968C","#839958","#B5D5FF","#FFB5C8"];
  function commBg(id:string){ let h=0; for(const c of id) h=(h*31+c.charCodeAt(0))&0xfffff; return PAL[h%PAL.length]; }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {/* People to connect */}
      {suggestedUsers.length > 0 && (
        <div style={{ backgroundColor:"#fff", border:"1px solid #e8e4ce", borderRadius:14, padding:16 }}>
          <p style={{ fontSize:10, fontWeight:700, color:"#839958", textTransform:"uppercase", letterSpacing:"0.5px", margin:"0 0 12px" }}>People to connect</p>
          {suggestedUsers.slice(0,4).map(u => {
            const name = u.full_name ?? "Member";
            const bg = avatarBg(u.id);
            const isFollowing = followingIds.has(u.id);
            return (
              <div key={u.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:"1px solid #f5f0e8" }}>
                <Link href={`/profile/${u.id}`}>
                  <div style={{ width:32, height:32, borderRadius:"50%", backgroundColor:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0 }}>{initials(name)}</div>
                </Link>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:"#0A3323", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</p>
                  {u.current_job_role && <p style={{ fontSize:10, color:"#839958", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.current_job_role}</p>}
                </div>
                <button onClick={()=>!isFollowing&&onFollow(u.id)} style={{ fontSize:10, fontWeight:700, border:`1px solid ${isFollowing?"#e8e4ce":"#0A3323"}`, borderRadius:99, padding:"3px 10px", cursor:isFollowing?"default":"pointer", backgroundColor:"transparent", color:isFollowing?"#839958":"#0A3323", fontFamily:"inherit", flexShrink:0 }}>
                  {isFollowing?"Following":"+ Connect"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* My circles */}
      {myComms.length > 0 && (
        <div style={{ backgroundColor:"#fff", border:"1px solid #e8e4ce", borderRadius:14, padding:16 }}>
          <p style={{ fontSize:10, fontWeight:700, color:"#839958", textTransform:"uppercase", letterSpacing:"0.5px", margin:"0 0 12px" }}>My circles</p>
          {myComms.map(c => (
            <Link key={c.id} href={`/communities/${c.slug}`} style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none", padding:"7px 0", borderBottom:"1px solid #f5f0e8" }}>
              <div style={{ width:28, height:28, borderRadius:8, backgroundColor:commBg(c.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0 }}>{c.name[0]}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, fontWeight:700, color:"#0A3323", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</p>
                <p style={{ fontSize:10, color:"#839958", margin:0 }}>{c.posts_this_week} posts/week</p>
              </div>
            </Link>
          ))}
          <Link href="/communities" style={{ display:"block", fontSize:11, fontWeight:600, color:"#839958", textDecoration:"none", marginTop:10 }}>Browse all →</Link>
        </div>
      )}

      {/* Suggested circles */}
      {suggestedComms.length > 0 && (
        <div style={{ backgroundColor:"#fff", border:"1px solid #e8e4ce", borderRadius:14, padding:16 }}>
          <p style={{ fontSize:10, fontWeight:700, color:"#839958", textTransform:"uppercase", letterSpacing:"0.5px", margin:"0 0 12px" }}>Circles to join</p>
          {suggestedComms.map(c => (
            <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:"1px solid #f5f0e8" }}>
              <div style={{ width:28, height:28, borderRadius:8, backgroundColor:commBg(c.id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0 }}>{c.name[0]}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, fontWeight:700, color:"#0A3323", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</p>
                <p style={{ fontSize:10, color:"#839958", margin:0 }}>{c.member_count.toLocaleString("en-IN")} members</p>
              </div>
              <Link href={`/communities/${c.slug}`} style={{ fontSize:10, fontWeight:700, color:"#0A3323", textDecoration:"none", backgroundColor:"#F7F4D5", border:"1px solid #e8e4ce", borderRadius:6, padding:"3px 8px", whiteSpace:"nowrap" }}>Join</Link>
            </div>
          ))}
        </div>
      )}

      {/* Assistant promo */}
      <div style={{ backgroundColor:"#0A3323", borderRadius:14, padding:16 }}>
        <p style={{ fontSize:13, fontWeight:800, color:"#F7F4D5", margin:"0 0 6px" }}>✨ Career Assistant</p>
        <p style={{ fontSize:11, color:"rgba(247,244,213,0.6)", margin:"0 0 12px", lineHeight:1.5 }}>Salary intel · Interview prep · Offer evaluation</p>
        <Link href="/assistant" style={{ display:"block", textAlign:"center", fontSize:12, fontWeight:700, color:"#0A3323", backgroundColor:"#F7F4D5", borderRadius:8, padding:"8px 0", textDecoration:"none" }}>Open Assistant →</Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const supabase = createClient();
  const { session } = useSession();
  const { profile } = useProfile();

  const [posts, setPosts] = useState<Post[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommIds, setMyCommIds] = useState<Set<string>>(new Set());
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [suggestedUsers, setSuggestedUsers] = useState<{id:string; full_name:string|null; current_job_role:string|null}[]>([]);
  const [circlesCount, setCirclesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all"|"referrals"|"saved">("all");
  const [sharePost, setSharePost] = useState<Post|null>(null);

  const userId = session?.user?.id ?? "";

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [commsRes, memRes, likedRes, savedRes, followingRes, usersRes] = await Promise.all([
      supabase.from("communities").select("id,slug,name,member_count,posts_this_week,icon_color").order("member_count", { ascending: false }),
      supabase.from("community_members").select("community_id").eq("user_id", userId),
      supabase.from("post_likes").select("post_id").eq("user_id", userId),
      supabase.from("saved_posts").select("post_id").eq("user_id", userId),
      supabase.from("follows").select("following_id").eq("follower_id", userId),
      supabase.from("profiles").select("id,full_name,current_job_role").neq("id", userId).limit(8),
    ]);

    const allComms = (commsRes.data as Community[]) ?? [];
    setCommunities(allComms);

    const memberSet = new Set((memRes.data ?? []).map((m: {community_id:string}) => m.community_id));
    setMyCommIds(memberSet);
    setCirclesCount(memberSet.size);

    setLikedPostIds(new Set((likedRes.data ?? []).map((l: LikedPost) => l.post_id)));
    setSavedPostIds(new Set((savedRes.data ?? []).map((s: SavedPost) => s.post_id)));
    setFollowingIds(new Set((followingRes.data ?? []).map((f: { following_id: string }) => f.following_id)));
    setSuggestedUsers((usersRes.data ?? []) as {id:string; full_name:string|null; current_job_role:string|null}[]);

    // Load posts
    const myCommList = (memRes.data ?? []).map((m: {community_id:string}) => m.community_id);
    let allPosts: Post[] = [];

    if (myCommList.length > 0) {
      const { data } = await supabase
        .from("community_posts")
        .select("*, author:profiles(full_name,current_job_role), community:communities(name,slug)")
        .in("community_id", myCommList)
        .order("created_at", { ascending: false })
        .limit(30);
      allPosts = (data as Post[]) ?? [];
    }

    if (allPosts.length < 10) {
      const existingIds = new Set(allPosts.map(p => p.id));
      const { data } = await supabase
        .from("community_posts")
        .select("*, author:profiles(full_name,current_job_role), community:communities(name,slug)")
        .order("created_at", { ascending: false })
        .limit(20);
      const extras = ((data as Post[]) ?? []).filter(p => !existingIds.has(p.id));
      allPosts = [...allPosts, ...extras].slice(0, 30);
    }

    setPosts(allPosts);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => { load(); }, [load]);

  // ── Interaction handlers ──────────────────────────────────────────────────

  const handleLike = async (postId: string) => {
    if (!userId) return;
    const isLiked = likedPostIds.has(postId);
    // Optimistic
    setLikedPostIds(prev => { const s = new Set(prev); isLiked ? s.delete(postId) : s.add(postId); return s; });
    setPosts(prev => prev.map(p => p.id===postId ? { ...p, helpful_count: Math.max(0, p.helpful_count + (isLiked?-1:1)) } : p));
    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    } else {
      const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
      if (error) { // revert
        setLikedPostIds(prev => { const s = new Set(prev); s.delete(postId); return s; });
        setPosts(prev => prev.map(p => p.id===postId ? { ...p, helpful_count: Math.max(0, p.helpful_count-1) } : p));
      }
    }
  };

  const handleSave = async (postId: string) => {
    if (!userId) return;
    const isSaved = savedPostIds.has(postId);
    setSavedPostIds(prev => { const s = new Set(prev); isSaved ? s.delete(postId) : s.add(postId); return s; });
    if (isSaved) {
      await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", userId);
    } else {
      await supabase.from("saved_posts").insert({ post_id: postId, user_id: userId });
    }
  };

  const handleRepost = async (originalPost: Post) => {
    if (!userId) return;
    const myComms = communities.filter(c=>myCommIds.has(c.id));
    const targetCommunity = myComms[0] ?? communities[0];
    if (!targetCommunity) return;
    await supabase.from("community_posts").insert({
      community_id: targetCommunity.id, user_id: userId,
      type: "Repost", content: "", repost_of: originalPost.id,
    });
    load();
  };

  const handleFollow = async (targetUserId: string) => {
    if (!userId) return;
    setFollowingIds(prev => { const s = new Set(prev); s.add(targetUserId); return s; });
    await supabase.from("follows").insert({ follower_id: userId, following_id: targetUserId });
  };

  const displayName = profile?.full_name ?? (session?.user?.email ?? "").split("@")[0] ?? "You";
  const userBg = userId ? avatarBg(userId) : "#D3968C";
  const userInits = initials(displayName);
  const myMemberComms = communities.filter(c => myCommIds.has(c.id));

  const filteredPosts = filter === "referrals"
    ? posts.filter(p => p.type === "Job referral")
    : filter === "saved"
    ? posts.filter(p => savedPostIds.has(p.id))
    : posts;

  return (
    <>
      {sharePost && <ShareModal post={sharePost} currentUserId={userId} onClose={()=>setSharePost(null)} />}

      <div className="feed-grid">

        {/* Left */}
        <div className="feed-left-col">
          {userId && (
            <ProfileCard
              displayName={displayName}
              role={profile?.current_job_role ?? null}
              targetRole={profile?.target_role ?? null}
              circlesCount={circlesCount}
              followersCount={0}
              followingCount={0}
            />
          )}
          <div style={{ backgroundColor:"#fff", border:"1px solid #e8e4ce", borderRadius:14, padding:"12px 8px" }}>
            {[
              { href:"/communities", icon:"👥", label:"My circles" },
              { href:"/jobs",        icon:"💼", label:"Jobs for you" },
              { href:"/assistant",   icon:"✨", label:"Career assistant" },
              { href:"/messages",    icon:"💬", label:"Messages" },
              { href:"/bookings",    icon:"📅", label:"My sessions" },
            ].map(({ href, icon, label }) => (
              <Link key={href} href={href} style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none", padding:"8px 12px", borderRadius:8, color:"#555", fontSize:13 }}>
                <span>{icon}</span>{label}
              </Link>
            ))}
          </div>
        </div>

        {/* Center */}
        <div>
          {userId && (
            <PostComposer userId={userId} userInitials={userInits} userAvatarBg={userBg} communities={myMemberComms} onPosted={load} />
          )}

          {/* Filters */}
          <div style={{ display:"flex", gap:4, marginBottom:12 }}>
            {([["all","All posts"],["referrals","Referrals 🤝"],["saved","Saved 🔖"]] as const).map(([key,label]) => (
              <button key={key} onClick={()=>setFilter(key)} style={{ fontSize:12, fontWeight:filter===key?700:500, border:"none", cursor:"pointer", padding:"6px 14px", borderRadius:20, backgroundColor:filter===key?"#0A3323":"#e8e4ce", color:filter===key?"#F7F4D5":"#839958", fontFamily:"inherit" }}>
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ backgroundColor:"#fff", border:"1px solid #e8e4ce", borderRadius:14, padding:32, textAlign:"center" }}>
              <p style={{ color:"#839958", fontSize:13 }}>Loading your feed…</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div style={{ backgroundColor:"#fff", border:"1px solid #e8e4ce", borderRadius:14, padding:"48px 32px", textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>
                {filter==="saved" ? "🔖" : "💬"}
              </div>
              <p style={{ fontSize:14, fontWeight:700, color:"#1a1a1a", margin:"0 0 8px" }}>
                {filter==="saved" ? "No saved posts yet" : "Your feed is empty"}
              </p>
              <p style={{ fontSize:13, color:"#839958", margin:"0 0 20px" }}>
                {filter==="saved" ? "Save posts to read later by clicking 🔖" : "Join circles to see posts from people in your target companies."}
              </p>
              {filter!=="saved" && (
                <Link href="/communities" style={{ display:"inline-block", fontSize:13, fontWeight:700, backgroundColor:"#0A3323", color:"#F7F4D5", borderRadius:10, padding:"10px 24px", textDecoration:"none" }}>
                  Find your circles →
                </Link>
              )}
            </div>
          ) : (
            filteredPosts.map(post => (
              <PostCard
                key={post.id} post={post} currentUserId={userId}
                isLiked={likedPostIds.has(post.id)}
                isSaved={savedPostIds.has(post.id)}
                isFollowing={followingIds.has(post.user_id)}
                onLike={handleLike} onSave={handleSave}
                onRepost={handleRepost} onShare={setSharePost}
                onFollow={handleFollow}
              />
            ))
          )}
        </div>

        {/* Right */}
        <div className="feed-right-col">
          <RightSidebar
            communities={communities} myCommIds={myCommIds}
            suggestedUsers={suggestedUsers} followingIds={followingIds}
            onFollow={handleFollow}
          />
        </div>
      </div>
    </>
  );
}
