"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Community {
  id: string;
  slug: string;
  name: string;
  role_type: string | null;
  icon_color: string;
  member_count: number;
}

const ROLE_TYPES = [
  "Product", "Engineering", "Marketing", "Design", "Sales",
  "Operations", "Finance", "Data & Analytics", "Founders Office", "VC / Investing",
];

const INDUSTRIES = [
  "Technology", "D2C / Consumer", "Fintech", "Healthcare", "FMCG",
  "Media & Entertainment", "Edtech", "SaaS / B2B", "Consulting", "Other",
];

const SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

const EMPLOYER_TITLES = [
  "HR Manager", "HR Business Partner", "Talent Acquisition", "Recruiter",
  "Technical Recruiter", "Head of HR", "VP of People", "Chief People Officer",
  "People Operations", "Hiring Manager", "Founder / CEO", "Co-founder",
  "Engineering Manager", "Team Lead", "Other",
];

// ─── Dark palette styles ──────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  backgroundColor: "#181C24",
  border: "1.5px solid #1F2937",
  borderRadius: 16,
  padding: "28px 28px",
  marginBottom: 0,
};

const INPUT: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 14px",
  fontSize: 14,
  border: "1.5px solid #374151",
  borderRadius: 10,
  fontFamily: "inherit",
  outline: "none",
  backgroundColor: "#0F1117",
  color: "#F9FAFB",
};

const LABEL: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#9CA3AF",
  marginBottom: 6,
};

const BTN_PRIMARY: React.CSSProperties = {
  padding: "12px 28px",
  borderRadius: 10,
  border: "none",
  backgroundColor: "#1A3A8F",
  color: "#F9FAFB",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const BTN_GHOST: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "1.5px solid #374151",
  backgroundColor: "transparent",
  color: "#9CA3AF",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

// ─── Group emoji ──────────────────────────────────────────────────────────────
function groupEmoji(slug: string) {
  const map: Record<string, string> = {
    "product-managers": "📦", "early-engineers": "⚙️", "founders-office": "🚀",
    "vc-investing": "💹", "growth-marketing": "📈", "data-ai": "🤖",
    "ops-strategy": "🔧", "sales-bd": "🤝",
  };
  return map[slug] ?? "👥";
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function Steps({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 4, borderRadius: 99,
          backgroundColor: i < current ? "#1A3A8F" : "#1F2937",
        }} />
      ))}
    </div>
  );
}

// ─── Employer registration wall ───────────────────────────────────────────────
function EmployerWall({ onVerified }: { onVerified: () => void }) {
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!company.trim() || !title) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/employer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: company,
          employer_title: title,
          linkedin_url: linkedin || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onVerified();
      } else {
        setError(data.error ?? "Registration failed. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 0 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>🏢</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#F9FAFB", margin: "0 0 10px" }}>
          Employer verification
        </h1>
        <p style={{ fontSize: 14, color: "#9CA3AF", margin: 0, lineHeight: 1.7 }}>
          Job posting is reserved for verified HR professionals and hiring managers.
          Tell us about yourself and you&apos;ll have access instantly.
        </p>
      </div>

      <div style={CARD}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#F9FAFB", margin: "0 0 20px" }}>
          Your hiring details
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Company */}
          <div>
            <label style={LABEL}>Company name *</label>
            <input
              style={INPUT}
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="e.g. Zepto, Razorpay, Meesho…"
              autoFocus
            />
          </div>

          {/* Title */}
          <div>
            <label style={LABEL}>Your role in hiring *</label>
            <select
              style={{ ...INPUT, appearance: "none" }}
              value={title}
              onChange={e => setTitle(e.target.value)}
            >
              <option value="">Select your role…</option>
              {EMPLOYER_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* LinkedIn (optional but helps) */}
          <div>
            <label style={LABEL}>
              LinkedIn profile <span style={{ fontWeight: 400, color: "#6B7280" }}>(optional, speeds up verification)</span>
            </label>
            <input
              style={INPUT}
              value={linkedin}
              onChange={e => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/yourname"
            />
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 16, padding: "10px 14px",
            backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10, fontSize: 13, color: "#FCA5A5",
          }}>
            {error}
          </div>
        )}

        {/* Trust callout */}
        <div style={{
          marginTop: 20, padding: "12px 14px",
          backgroundColor: "rgba(26,58,143,0.15)", border: "1px solid rgba(26,58,143,0.4)",
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 12, color: "#6EE7B7", fontWeight: 700, marginBottom: 4 }}>
            Why we do this
          </div>
          <div style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.6 }}>
            Mentor groups are verified-professional communities. Only genuine employers
            can post jobs, so members get roles that match their level — not spam.
          </div>
        </div>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <button
            style={{
              ...BTN_PRIMARY,
              opacity: (company.trim() && title) ? 1 : 0.45,
              display: "flex", alignItems: "center", gap: 8,
            }}
            disabled={!company.trim() || !title || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Verifying…</>
            ) : "Get verified →"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Inner component (uses useSearchParams) ───────────────────────────────────
function PostJobInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const { session } = useSession();
  const { profile, loading: profileLoading } = useProfile();

  const preselectedGroupId = searchParams.get("group") ?? "";

  const [step, setStep] = useState(1);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [postedSlug, setPostedSlug] = useState("");
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  // Form state
  const [company, setCompany] = useState({
    name: "", website: "", industry: "", size: "" as typeof SIZES[number] | "",
  });
  const [role, setRole] = useState({
    title: "", role_type: "", description: "",
    experience_min: "", experience_max: "",
    location: "", remote_ok: false,
    compensation_min: "", compensation_max: "",
  });
  const [targetGroupId, setTargetGroupId] = useState(preselectedGroupId);
  const [appMethod, setAppMethod] = useState<"platform" | "email" | "url">("platform");
  const [appEmail, setAppEmail] = useState("");
  const [appUrl, setAppUrl] = useState("");

  // Check employer verification status
  useEffect(() => {
    if (!profileLoading) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = profile as any;
      const verified: boolean = p?.is_employer_verified ?? false;
      setIsVerified(verified);
      // Pre-fill company name if they've registered before
      const existingCompany: string | undefined = p?.employer_company;
      if (existingCompany) {
        setCompany(c => ({ ...c, name: existingCompany }));
      }
    }
  }, [profile, profileLoading]);

  // Load communities
  useEffect(() => {
    supabase
      .from("communities")
      .select("id, slug, name, role_type, icon_color, member_count")
      .order("member_count", { ascending: false })
      .then(({ data }) => setCommunities((data as Community[]) ?? []));
  }, [supabase]);

  // Auth guard
  if (!session) {
    return (
      <div style={{ maxWidth: 560, margin: "60px auto", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "#9CA3AF" }}>Please sign in to post a job.</p>
        <Link href="/auth/login" style={{ ...BTN_PRIMARY, display: "inline-block", marginTop: 16, textDecoration: "none" }}>
          Sign in
        </Link>
      </div>
    );
  }

  // Loading state
  if (profileLoading || isVerified === null) {
    return (
      <div style={{ maxWidth: 560, margin: "60px auto", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "#6B7280" }}>Loading…</p>
      </div>
    );
  }

  // ─── Employer verification wall ──────────────────────────────────────────────
  if (!isVerified) {
    return <EmployerWall onVerified={() => setIsVerified(true)} />;
  }

  const selectedGroup = communities.find(c => c.id === targetGroupId);

  // Recommended groups based on role_type match
  const recommended = communities.filter(c =>
    role.role_type && c.role_type?.toLowerCase().includes(role.role_type.split(" ")[0].toLowerCase())
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/jobs/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community_id: targetGroupId,
          title: role.title,
          description: role.description,
          role_type: role.role_type,
          experience_min: role.experience_min ? Number(role.experience_min) : null,
          experience_max: role.experience_max ? Number(role.experience_max) : null,
          location: role.location || null,
          remote_ok: role.remote_ok,
          compensation_min: role.compensation_min ? Number(role.compensation_min) : null,
          compensation_max: role.compensation_max ? Number(role.compensation_max) : null,
          application_email: appMethod === "email" ? appEmail : null,
          application_url: appMethod === "url" ? appUrl : null,
          company_name: company.name,
          company_website: company.website || null,
          company_industry: company.industry || null,
          company_size: company.size || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPostedSlug(selectedGroup?.slug ?? "");
        setStep(6);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success ────────────────────────────────────────────────────────────────
  if (step === 6) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 0 80px" }}>
        <div style={{ ...CARD, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#F9FAFB", margin: "0 0 10px" }}>Job posted</h2>
          <p style={{ fontSize: 14, color: "#9CA3AF", margin: "0 0 6px", lineHeight: 1.6 }}>
            <strong style={{ color: "#F9FAFB" }}>{role.title}</strong> at{" "}
            <strong style={{ color: "#F9FAFB" }}>{company.name}</strong> is now live in the{" "}
            <strong style={{ color: "#6EE7B7" }}>{selectedGroup?.name}</strong> group.
          </p>
          <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 24px" }}>
            Members will see it in Open Roles. Verified professionals only — no unscreened applicant pile.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href={`/communities/${postedSlug}`} style={{ ...BTN_PRIMARY, textDecoration: "none" }}>
              View group →
            </Link>
            <button style={BTN_GHOST} onClick={() => { setStep(1); setPostedSlug(""); }}>
              Post another job
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 0 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#F9FAFB", margin: "0 0 6px" }}>Post a Job</h1>
        <p style={{ fontSize: 14, color: "#9CA3AF", margin: 0 }}>
          Reach verified professionals directly — no unscreened pile.
        </p>
      </div>

      <Steps current={step} total={5} />

      {/* ── Step 1: Company ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div style={CARD}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#F9FAFB", margin: "0 0 20px" }}>Your company</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={LABEL}>Company name *</label>
              <input
                style={INPUT} value={company.name}
                onChange={e => setCompany({ ...company, name: e.target.value })}
                placeholder="e.g. Souled Store"
              />
            </div>
            <div>
              <label style={LABEL}>Website</label>
              <input
                style={INPUT} value={company.website}
                onChange={e => setCompany({ ...company, website: e.target.value })}
                placeholder="https://thesouledstore.com"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LABEL}>Industry</label>
                <select
                  style={{ ...INPUT, appearance: "none" }}
                  value={company.industry}
                  onChange={e => setCompany({ ...company, industry: e.target.value })}
                >
                  <option value="">Select…</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL}>Company size</label>
                <select
                  style={{ ...INPUT, appearance: "none" }}
                  value={company.size}
                  onChange={e => setCompany({ ...company, size: e.target.value as typeof SIZES[number] })}
                >
                  <option value="">Select…</option>
                  {SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
                </select>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <button
              style={{ ...BTN_PRIMARY, opacity: company.name.trim() ? 1 : 0.5 }}
              disabled={!company.name.trim()}
              onClick={() => setStep(2)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: The Role ─────────────────────────────────────────────────── */}
      {step === 2 && (
        <div style={CARD}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#F9FAFB", margin: "0 0 20px" }}>The role</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={LABEL}>Job title *</label>
              <input
                style={INPUT} value={role.title}
                onChange={e => setRole({ ...role, title: e.target.value })}
                placeholder="e.g. Senior Product Manager"
              />
            </div>
            <div>
              <label style={LABEL}>Function *</label>
              <select
                style={{ ...INPUT, appearance: "none" }}
                value={role.role_type}
                onChange={e => setRole({ ...role, role_type: e.target.value })}
              >
                <option value="">Select function…</option>
                {ROLE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>Description * <span style={{ fontWeight: 400, color: "#6B7280" }}>(min 200 characters)</span></label>
              <textarea
                style={{ ...INPUT, minHeight: 120, resize: "vertical" }}
                value={role.description}
                onChange={e => setRole({ ...role, description: e.target.value })}
                placeholder="Describe the role, responsibilities, and what makes it exciting…"
              />
              <div style={{ fontSize: 11, color: role.description.length >= 200 ? "#6EE7B7" : "#6B7280", textAlign: "right", marginTop: 4 }}>
                {role.description.length}/200
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LABEL}>Min experience (yrs)</label>
                <input style={INPUT} type="number" min={0} max={30} value={role.experience_min}
                  onChange={e => setRole({ ...role, experience_min: e.target.value })} placeholder="2" />
              </div>
              <div>
                <label style={LABEL}>Max experience (yrs)</label>
                <input style={INPUT} type="number" min={0} max={30} value={role.experience_max}
                  onChange={e => setRole({ ...role, experience_max: e.target.value })} placeholder="6" />
              </div>
            </div>
            <div>
              <label style={LABEL}>Location</label>
              <input style={INPUT} value={role.location}
                onChange={e => setRole({ ...role, location: e.target.value })}
                placeholder="Bangalore / Mumbai / Delhi" />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "#F9FAFB" }}>
              <input
                type="checkbox" checked={role.remote_ok}
                onChange={e => setRole({ ...role, remote_ok: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: "#1A3A8F" }}
              />
              Remote OK
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LABEL}>Min CTC (₹ LPA)</label>
                <input style={INPUT} type="number" min={0} value={role.compensation_min}
                  onChange={e => setRole({ ...role, compensation_min: e.target.value })} placeholder="12" />
              </div>
              <div>
                <label style={LABEL}>Max CTC (₹ LPA)</label>
                <input style={INPUT} type="number" min={0} value={role.compensation_max}
                  onChange={e => setRole({ ...role, compensation_max: e.target.value })} placeholder="20" />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
            <button style={BTN_GHOST} onClick={() => setStep(1)}>← Back</button>
            <button
              style={{ ...BTN_PRIMARY, opacity: (role.title.trim() && role.role_type && role.description.length >= 200) ? 1 : 0.5 }}
              disabled={!role.title.trim() || !role.role_type || role.description.length < 200}
              onClick={() => setStep(3)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Target Group ─────────────────────────────────────────────── */}
      {step === 3 && (
        <div style={CARD}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#F9FAFB", margin: "0 0 6px" }}>Target group</h2>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 20px" }}>
            Choose one group. Your job posts directly to their Open Roles channel.
          </p>

          {recommended.length > 0 && recommended[0].id !== targetGroupId && (
            <div style={{
              backgroundColor: "rgba(26,58,143,0.15)", border: "1px solid rgba(26,58,143,0.4)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 16,
              fontSize: 12, color: "#6EE7B7",
            }}>
              💡 Recommended: <strong>{recommended[0].name}</strong> — best match for {role.role_type} roles
              <button
                style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: "#6EE7B7", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                onClick={() => setTargetGroupId(recommended[0].id)}
              >
                Select
              </button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {communities.map(c => {
              const selected = targetGroupId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setTargetGroupId(c.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                    border: `1.5px solid ${selected ? "#1A3A8F" : "#1F2937"}`,
                    backgroundColor: selected ? "rgba(26,58,143,0.2)" : "#0F1117",
                    fontFamily: "inherit", textAlign: "left", width: "100%",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    backgroundColor: c.icon_color ?? "#FDE68A",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                  }}>
                    {groupEmoji(c.slug)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                      {c.member_count.toLocaleString()} verified {c.role_type ?? ""} professionals
                    </div>
                  </div>
                  {selected && <span style={{ color: "#6EE7B7", fontSize: 18 }}>✓</span>}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
            <button style={BTN_GHOST} onClick={() => setStep(2)}>← Back</button>
            <button
              style={{ ...BTN_PRIMARY, opacity: targetGroupId ? 1 : 0.5 }}
              disabled={!targetGroupId}
              onClick={() => setStep(4)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Application method ───────────────────────────────────────── */}
      {step === 4 && (
        <div style={CARD}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#F9FAFB", margin: "0 0 6px" }}>How to apply</h2>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 20px" }}>Choose how interested members reach you.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { id: "platform" as const, label: "Track applications on Mentor", desc: "Members apply with a cover note — you review in one place." },
              { id: "email"    as const, label: "Apply via email",  desc: "Interested members email you directly." },
              { id: "url"      as const, label: "Apply via link",   desc: "Send members to your own application form or ATS." },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setAppMethod(opt.id)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                  border: `1.5px solid ${appMethod === opt.id ? "#1A3A8F" : "#1F2937"}`,
                  backgroundColor: appMethod === opt.id ? "rgba(26,58,143,0.2)" : "#0F1117",
                  fontFamily: "inherit", textAlign: "left", width: "100%",
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 99, flexShrink: 0, marginTop: 1,
                  border: `2px solid ${appMethod === opt.id ? "#1A3A8F" : "#374151"}`,
                  backgroundColor: appMethod === opt.id ? "#1A3A8F" : "transparent",
                }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB" }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
          {appMethod === "email" && (
            <div style={{ marginTop: 16 }}>
              <label style={LABEL}>Email address *</label>
              <input style={INPUT} type="email" value={appEmail}
                onChange={e => setAppEmail(e.target.value)} placeholder="hiring@yourcompany.com" />
            </div>
          )}
          {appMethod === "url" && (
            <div style={{ marginTop: 16 }}>
              <label style={LABEL}>Application URL *</label>
              <input style={INPUT} type="url" value={appUrl}
                onChange={e => setAppUrl(e.target.value)} placeholder="https://jobs.yourcompany.com/pm-role" />
            </div>
          )}
          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
            <button style={BTN_GHOST} onClick={() => setStep(3)}>← Back</button>
            <button
              style={{
                ...BTN_PRIMARY,
                opacity: (appMethod === "platform" || (appMethod === "email" && appEmail) || (appMethod === "url" && appUrl)) ? 1 : 0.5,
              }}
              disabled={appMethod === "email" ? !appEmail : appMethod === "url" ? !appUrl : false}
              onClick={() => setStep(5)}
            >
              Review →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Review ───────────────────────────────────────────────────── */}
      {step === 5 && (
        <div style={CARD}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#F9FAFB", margin: "0 0 20px" }}>Review & post</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Company summary */}
            <div style={{ backgroundColor: "#0F1117", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Company</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB" }}>{company.name}</div>
              {company.industry && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{company.industry}{company.size ? ` · ${company.size} employees` : ""}</div>}
            </div>

            {/* Role summary */}
            <div style={{ backgroundColor: "#0F1117", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Role</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB" }}>{role.title}</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                {role.role_type}
                {role.location ? ` · ${role.location}` : ""}
                {role.remote_ok ? " · Remote OK" : ""}
                {role.compensation_min ? ` · ₹${role.compensation_min}–${role.compensation_max}L` : ""}
                {role.experience_min ? ` · ${role.experience_min}–${role.experience_max}yr exp` : ""}
              </div>
            </div>

            {/* Target group */}
            {selectedGroup && (
              <div style={{ backgroundColor: "rgba(26,58,143,0.15)", border: "1px solid rgba(26,58,143,0.4)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6EE7B7", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Posting to</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB" }}>
                  {groupEmoji(selectedGroup.slug)} {selectedGroup.name}
                </div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                  {selectedGroup.member_count.toLocaleString()} verified professionals · Open Roles channel
                </div>
              </div>
            )}

            {/* Application method */}
            <div style={{ backgroundColor: "#0F1117", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Applications</div>
              <div style={{ fontSize: 13, color: "#F9FAFB" }}>
                {appMethod === "platform" && "Tracked on Mentor"}
                {appMethod === "email" && `Email: ${appEmail}`}
                {appMethod === "url" && `Link: ${appUrl}`}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button style={BTN_GHOST} onClick={() => setStep(4)}>← Back</button>
            <button
              style={{ ...BTN_PRIMARY, display: "flex", alignItems: "center", gap: 8, opacity: submitting ? 0.7 : 1 }}
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Posting…</>
              ) : "Post job →"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Page export (wraps inner in Suspense for useSearchParams) ────────────────
export default function PostJobPage() {
  return (
    <Suspense fallback={
      <div style={{ maxWidth: 560, margin: "60px auto", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "#6B7280" }}>Loading…</p>
      </div>
    }>
      <PostJobInner />
    </Suspense>
  );
}
