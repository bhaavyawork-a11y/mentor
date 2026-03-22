"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

/* ─── Types ─────────────────────────────────────── */
interface Referral {
  id: string;
  referee_email: string;
  status: "Invited" | "Signed up" | "Booked";
  credits_earned: number;
  created_at: string;
}

/* ─── Status badge ──────────────────────────────── */
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Invited:    { bg: "#e8e4ce",   color: "#839958" },
  "Signed up": { bg: "#F7F4D522", color: "#8a7200" },
  Booked:     { bg: "#83995822", color: "#0A3323" },
};

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

/* ─── Metric Card ───────────────────────────────── */
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: "18px 20px", textAlign: "center" }}>
      <p style={{ fontSize: 26, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px" }}>{value}</p>
      <p style={{ fontSize: 12, color: "#839958", margin: 0 }}>{label}</p>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────── */
export default function ReferPage() {
  const supabase = createClient();
  const { session } = useSession();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const userId = session?.user.id ?? "";
  const referralLink = userId ? `https://mentor-flax.vercel.app/join?ref=${userId}` : "";

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from("referrals").select("*").eq("referrer_id", userId).order("created_at", { ascending: false });
    setReferrals((data as Referral[]) ?? []);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => { load(); }, [load]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const signedUp = referrals.filter((r) => r.status === "Signed up" || r.status === "Booked").length;
  const totalCredits = referrals.reduce((sum, r) => sum + r.credits_earned, 0);

  const STEPS = [
    { icon: "🔗", title: "Share your link", body: "Send it to anyone figuring out their career" },
    { icon: "✅", title: "They sign up", body: "They join Mentor using your link" },
    { icon: "💰", title: "You both earn", body: "You get ₹200 credit, they get ₹200 off their first session" },
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>Invite friends, earn credits</h1>
        <p style={{ fontSize: 14, color: "#839958", margin: 0 }}>Share Mentor with people you care about. Everyone wins.</p>
      </div>

      {/* Referral link */}
      <div style={{ backgroundColor: "#0A3323", borderRadius: 16, padding: 24, marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>Your referral link</p>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, backgroundColor: "#ffffff18", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {referralLink || "Log in to get your referral link"}
          </div>
          {referralLink && (
            <button onClick={handleCopy} style={{ flexShrink: 0, backgroundColor: "#839958", color: "#0A3323", fontSize: 12, fontWeight: 800, border: "none", borderRadius: 10, padding: "12px 20px", cursor: "pointer" }}>
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
      </div>

      {/* How it works */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 16, padding: 24, marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 20px" }}>How it works</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{step.icon}</div>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px" }}>{step.title}</p>
              <p style={{ fontSize: 12, color: "#839958", margin: 0, lineHeight: 1.5 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 32 }}>
        <Metric value={String(referrals.length)} label="Friends invited" />
        <Metric value={String(signedUp)} label="Signed up" />
        <Metric value={`₹${totalCredits}`} label="Credits earned" />
      </div>

      {/* Referral history */}
      {!loading && referrals.length > 0 && (
        <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e8e4ce" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Referral history</p>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#fafafa" }}>
                {["Email", "Status", "Credits", "Date"].map((h) => (
                  <th key={h} style={{ fontSize: 11, fontWeight: 700, color: "#839958", textAlign: "left", padding: "10px 16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {referrals.map((r, i) => (
                <tr key={r.id} style={{ borderTop: i === 0 ? "none" : "1px solid #e8e4ce" }}>
                  <td style={{ fontSize: 13, color: "#333", padding: "12px 16px" }}>{maskEmail(r.referee_email)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: (STATUS_STYLE[r.status] ?? STATUS_STYLE["Invited"]).bg, color: (STATUS_STYLE[r.status] ?? STATUS_STYLE["Invited"]).color, borderRadius: 99, padding: "3px 10px" }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: "#333", padding: "12px 16px" }}>{r.credits_earned > 0 ? `₹${r.credits_earned}` : "—"}</td>
                  <td style={{ fontSize: 12, color: "#839958", padding: "12px 16px" }}>{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && referrals.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <p style={{ fontSize: 14, color: "#839958" }}>No referrals yet. Share your link to get started!</p>
        </div>
      )}
    </div>
  );
}
