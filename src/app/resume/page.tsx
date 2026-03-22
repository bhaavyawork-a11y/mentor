"use client";

import { useState, useRef, useCallback } from "react";
import { useProfile } from "@/hooks/useProfile";

/* ─── Types ─────────────────────────────────────── */
interface Analysis {
  atsScore: number;
  impactScore: number;
  gapScore: number;
  atsReason: string;
  impactReason: string;
  gapReason: string;
  criticalIssues: string[];
  quickWins: string[];
  improvements: string[];
  lineSuggestions: { original: string; improved: string; reason: string }[];
}

interface Experience {
  id: string;
  title: string;
  company: string;
  industry: string;
  duration: string;
  bullets: string[];
  description: string;
}

interface Education {
  id: string;
  degree: string;
  school: string;
  year: string;
  highlights: string;
}

interface GeneratedResume {
  summary: string;
  experience: { title: string; company: string; duration: string; bullets: string[] }[];
  education: { degree: string; school: string; year: string; highlights: string }[];
  skills: { technical: string[]; soft: string[] };
}

/* ─── Helpers ───────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2);

const scoreColor = (n: number) =>
  n >= 80 ? "#00C9A7" : n >= 60 ? "#FDE68A" : "#ff6b6b";

const scoreLabel = (n: number) =>
  n >= 80 ? "Great" : n >= 60 ? "Fair" : "Needs work";

/* ─── ScoreCard ─────────────────────────────────── */
function ScoreCard({ label, score, reason }: { label: string; score: number; reason: string }) {
  const color = scoreColor(score);
  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #eee",
      borderRadius: 16,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{label}</span>
        <span style={{
          fontSize: 11, fontWeight: 800, color,
          backgroundColor: color + "22", borderRadius: 99, padding: "2px 10px",
        }}>{scoreLabel(score)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 6, backgroundColor: "#eee", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ width: `${score}%`, height: "100%", backgroundColor: color, borderRadius: 99, transition: "width 0.6s ease" }} />
        </div>
        <span style={{ fontSize: 20, fontWeight: 800, color, minWidth: 40, textAlign: "right" }}>{score}</span>
      </div>
      <p style={{ fontSize: 12, color: "#888", margin: 0, lineHeight: 1.5 }}>{reason}</p>
    </div>
  );
}

/* ─── Tab: Analyse ──────────────────────────────── */
function AnalyseTab() {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("application/pdf");
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    setFileName(file.name);
    setMimeType(file.type || "application/pdf");
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const b64 = result.split(",")[1];
      setFileBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  }, []);

  const handleAnalyse = async () => {
    if (!fileBase64 && !resumeText.trim()) {
      setError("Please upload a resume or paste the text.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/resume-analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, mimeType, resumeText, targetRole }),
      });
      if (!res.ok) throw new Error("Analysis request failed");
      const data = await res.json();
      setAnalysis(data as Analysis);
    } catch {
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#00C9A7" : "#ddd"}`,
          borderRadius: 16,
          padding: "40px 24px",
          textAlign: "center",
          cursor: "pointer",
          backgroundColor: dragging ? "#00C9A711" : "#fafafa",
          transition: "all 0.2s",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }}
        />
        <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
        {fileName ? (
          <p style={{ fontSize: 14, fontWeight: 700, color: "#00C9A7", margin: 0 }}>✓ {fileName}</p>
        ) : (
          <>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Drop your resume here</p>
            <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>PDF or Word — or paste text below</p>
          </>
        )}
      </div>

      {/* Paste fallback */}
      {!fileBase64 && (
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#888", display: "block", marginBottom: 6 }}>OR PASTE RESUME TEXT</label>
          <textarea
            className="input"
            rows={6}
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume content here…"
            style={{ resize: "vertical", width: "100%", boxSizing: "border-box" }}
          />
        </div>
      )}

      {/* Target role */}
      <div>
        <label className="label">Target role (optional)</label>
        <input
          className="input"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          placeholder="e.g. Senior Product Manager at a fintech startup"
          style={{ width: "100%", boxSizing: "border-box" }}
        />
      </div>

      {error && <p style={{ color: "#ff6b6b", fontSize: 13, margin: 0 }}>{error}</p>}

      <button
        className="btn-primary"
        onClick={handleAnalyse}
        disabled={loading}
        style={{ opacity: loading ? 0.6 : 1, alignSelf: "flex-start" }}
      >
        {loading ? "Analysing…" : "Analyse Resume →"}
      </button>

      {/* Results */}
      {analysis && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 8 }}>
          {/* Score cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <ScoreCard label="ATS Score" score={analysis.atsScore} reason={analysis.atsReason} />
            <ScoreCard label="Impact Score" score={analysis.impactScore} reason={analysis.impactReason} />
            <ScoreCard label="Gap Score" score={analysis.gapScore} reason={analysis.gapReason} />
          </div>

          {/* Issues & Wins */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "0 0 12px" }}>🚨 Critical Issues</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {(analysis.criticalIssues || []).map((issue, i) => (
                  <li key={i} style={{ fontSize: 13, color: "#555", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#ff6b6b", flexShrink: 0 }}>✕</span> {issue}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "0 0 12px" }}>⚡ Quick Wins</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {(analysis.quickWins || []).map((win, i) => (
                  <li key={i} style={{ fontSize: 13, color: "#555", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#00C9A7", flexShrink: 0 }}>✓</span> {win}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Improvements */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "0 0 12px" }}>💡 Improvements</h3>
            <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {(analysis.improvements || []).map((imp, i) => (
                <li key={i} style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>{imp}</li>
              ))}
            </ol>
          </div>

          {/* Line suggestions */}
          {(analysis.lineSuggestions || []).length > 0 && (
            <div style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "0 0 16px" }}>✏️ Line-by-line Suggestions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {analysis.lineSuggestions.map((s, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 12, color: "#888", textDecoration: "line-through", backgroundColor: "#fff5f5", padding: "6px 10px", borderRadius: 8 }}>{s.original}</div>
                    <div style={{ fontSize: 12, color: "#1a1a1a", backgroundColor: "#f0fdf9", padding: "6px 10px", borderRadius: 8, borderLeft: "3px solid #00C9A7" }}>{s.improved}</div>
                    <p style={{ fontSize: 11, color: "#888", margin: 0 }}>{s.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Tab: Build ────────────────────────────────── */
function BuildTab({ onGenerated }: { onGenerated: (r: GeneratedResume, pi: PersonalInfo) => void }) {
  const { profile } = useProfile();
  const [step, setStep] = useState(0);

  interface PersonalInfo {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    targetRole: string;
  }

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    name: profile?.full_name ?? "",
    email: "",
    phone: "",
    location: profile?.location ?? "",
    linkedin: profile?.linkedin_url ?? "",
    targetRole: profile?.target_role ?? "",
  });

  const [experiences, setExperiences] = useState<Experience[]>([
    { id: uid(), title: "", company: "", industry: "", duration: "", bullets: [], description: "" },
  ]);
  const [education, setEducation] = useState<Education[]>([
    { id: uid(), degree: "", school: "", year: "", highlights: "" },
  ]);
  const [skills, setSkills] = useState<string[]>((profile?.skills ?? []).slice());
  const [skillInput, setSkillInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [bulletsLoading, setBulletsLoading] = useState<string | null>(null);

  const steps = ["Personal Info", "Experience", "Education", "Skills", "Generate"];

  const generateBullets = async (expId: string) => {
    const exp = experiences.find((e) => e.id === expId);
    if (!exp) return;
    setBulletsLoading(expId);
    try {
      const res = await fetch("/api/ai/resume-bullets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: exp.title, company: exp.company, industry: exp.industry, description: exp.description }),
      });
      const data = await res.json() as { bullets?: string[] };
      setExperiences((prev) => prev.map((e) => e.id === expId ? { ...e, bullets: data.bullets ?? [] } : e));
    } finally {
      setBulletsLoading(null);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/resume-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalInfo, experience: experiences, education, skills, targetRole: personalInfo.targetRole }),
      });
      const data = await res.json() as { resume: GeneratedResume };
      onGenerated(data.resume, personalInfo);
    } finally {
      setGenerating(false);
    }
  };

  const fieldStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Step indicator */}
      <div style={{ display: "flex", gap: 0 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <button
              onClick={() => setStep(i)}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                backgroundColor: i === step ? "#1B3A35" : i < step ? "#00C9A7" : "#eee",
                color: i <= step ? "#fff" : "#888",
                fontSize: 11, fontWeight: 800, border: "none", cursor: "pointer", flexShrink: 0,
              }}
            >{i + 1}</button>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, backgroundColor: i < step ? "#00C9A7" : "#eee" }} />
            )}
          </div>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#888" }}>Step {step + 1} of {steps.length}: {steps[step]}</p>

      {/* Step 0: Personal Info */}
      {step === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><label className="label">Full name</label><input className="input" value={personalInfo.name} onChange={(e) => setPersonalInfo((p) => ({ ...p, name: e.target.value }))} style={fieldStyle} placeholder="Ada Lovelace" /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={personalInfo.email} onChange={(e) => setPersonalInfo((p) => ({ ...p, email: e.target.value }))} style={fieldStyle} placeholder="ada@example.com" /></div>
            <div><label className="label">Phone</label><input className="input" value={personalInfo.phone} onChange={(e) => setPersonalInfo((p) => ({ ...p, phone: e.target.value }))} style={fieldStyle} placeholder="+1 (555) 000-0000" /></div>
            <div><label className="label">Location</label><input className="input" value={personalInfo.location} onChange={(e) => setPersonalInfo((p) => ({ ...p, location: e.target.value }))} style={fieldStyle} placeholder="San Francisco, CA" /></div>
            <div><label className="label">LinkedIn URL</label><input className="input" value={personalInfo.linkedin} onChange={(e) => setPersonalInfo((p) => ({ ...p, linkedin: e.target.value }))} style={fieldStyle} placeholder="linkedin.com/in/handle" /></div>
            <div><label className="label">Target role</label><input className="input" value={personalInfo.targetRole} onChange={(e) => setPersonalInfo((p) => ({ ...p, targetRole: e.target.value }))} style={fieldStyle} placeholder="Senior Engineer" /></div>
          </div>
        </div>
      )}

      {/* Step 1: Experience */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {experiences.map((exp, idx) => (
            <div key={exp.id} style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Position {idx + 1}</h4>
                {experiences.length > 1 && (
                  <button onClick={() => setExperiences((prev) => prev.filter((e) => e.id !== exp.id))} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 12 }}>Remove</button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label className="label">Job title</label><input className="input" value={exp.title} onChange={(e) => setExperiences((prev) => prev.map((x) => x.id === exp.id ? { ...x, title: e.target.value } : x))} style={fieldStyle} placeholder="Senior Engineer" /></div>
                <div><label className="label">Company</label><input className="input" value={exp.company} onChange={(e) => setExperiences((prev) => prev.map((x) => x.id === exp.id ? { ...x, company: e.target.value } : x))} style={fieldStyle} placeholder="Acme Corp" /></div>
                <div><label className="label">Industry</label><input className="input" value={exp.industry} onChange={(e) => setExperiences((prev) => prev.map((x) => x.id === exp.id ? { ...x, industry: e.target.value } : x))} style={fieldStyle} placeholder="Technology" /></div>
                <div><label className="label">Duration</label><input className="input" value={exp.duration} onChange={(e) => setExperiences((prev) => prev.map((x) => x.id === exp.id ? { ...x, duration: e.target.value } : x))} style={fieldStyle} placeholder="Jan 2022 – Present" /></div>
              </div>
              <div><label className="label">Key responsibilities (optional — helps AI)</label><textarea className="input" rows={2} value={exp.description} onChange={(e) => setExperiences((prev) => prev.map((x) => x.id === exp.id ? { ...x, description: e.target.value } : x))} style={{ ...fieldStyle, resize: "none" }} placeholder="Briefly describe your main responsibilities…" /></div>
              <button
                className="btn-outline"
                onClick={() => generateBullets(exp.id)}
                disabled={bulletsLoading === exp.id || !exp.title}
                style={{ alignSelf: "flex-start", opacity: !exp.title ? 0.5 : 1 }}
              >
                {bulletsLoading === exp.id ? "Generating…" : "✨ AI Generate Bullets"}
              </button>
              {exp.bullets.length > 0 && (
                <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {exp.bullets.map((b, bi) => (
                    <li key={bi}>
                      <input
                        className="input"
                        value={b}
                        onChange={(e) => setExperiences((prev) => prev.map((x) => x.id === exp.id ? { ...x, bullets: x.bullets.map((bb, bj) => bj === bi ? e.target.value : bb) } : x))}
                        style={fieldStyle}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <button className="btn-outline" onClick={() => setExperiences((prev) => [...prev, { id: uid(), title: "", company: "", industry: "", duration: "", bullets: [], description: "" }])} style={{ alignSelf: "flex-start" }}>
            + Add Position
          </button>
        </div>
      )}

      {/* Step 2: Education */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {education.map((edu, idx) => (
            <div key={edu.id} style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Education {idx + 1}</h4>
                {education.length > 1 && (
                  <button onClick={() => setEducation((prev) => prev.filter((e) => e.id !== edu.id))} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 12 }}>Remove</button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label className="label">Degree</label><input className="input" value={edu.degree} onChange={(e) => setEducation((prev) => prev.map((x) => x.id === edu.id ? { ...x, degree: e.target.value } : x))} style={fieldStyle} placeholder="B.Sc. Computer Science" /></div>
                <div><label className="label">School</label><input className="input" value={edu.school} onChange={(e) => setEducation((prev) => prev.map((x) => x.id === edu.id ? { ...x, school: e.target.value } : x))} style={fieldStyle} placeholder="MIT" /></div>
                <div><label className="label">Year</label><input className="input" value={edu.year} onChange={(e) => setEducation((prev) => prev.map((x) => x.id === edu.id ? { ...x, year: e.target.value } : x))} style={fieldStyle} placeholder="2020" /></div>
                <div><label className="label">Highlights</label><input className="input" value={edu.highlights} onChange={(e) => setEducation((prev) => prev.map((x) => x.id === edu.id ? { ...x, highlights: e.target.value } : x))} style={fieldStyle} placeholder="First class honours, Dean's list" /></div>
              </div>
            </div>
          ))}
          <button className="btn-outline" onClick={() => setEducation((prev) => [...prev, { id: uid(), degree: "", school: "", year: "", highlights: "" }])} style={{ alignSelf: "flex-start" }}>
            + Add Education
          </button>
        </div>
      )}

      {/* Step 3: Skills */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              style={{ flex: 1 }}
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const t = skillInput.trim();
                  if (t && !skills.includes(t)) { setSkills((prev) => [...prev, t]); setSkillInput(""); }
                }
              }}
              placeholder="Type a skill and press Enter"
            />
            <button
              className="btn-outline"
              onClick={() => {
                const t = skillInput.trim();
                if (t && !skills.includes(t)) { setSkills((prev) => [...prev, t]); setSkillInput(""); }
              }}
            >Add</button>
          </div>
          {skills.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {skills.map((s) => (
                <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: "#FDE68A", color: "#1a1a1a", fontSize: 11, fontWeight: 600, borderRadius: 99, padding: "4px 10px" }}>
                  {s}
                  <button onClick={() => setSkills((prev) => prev.filter((x) => x !== s))} style={{ background: "none", border: "none", cursor: "pointer", color: "#1a1a1a88", padding: 0, fontSize: 12, lineHeight: 1 }}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Generate */}
      {step === 4 && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", margin: "0 0 8px" }}>Ready to build your resume?</h3>
          <p style={{ fontSize: 14, color: "#888", marginBottom: 32 }}>Claude will craft a polished, ATS-optimised resume from your details.</p>
          <button className="btn-primary" onClick={handleGenerate} disabled={generating} style={{ opacity: generating ? 0.6 : 1 }}>
            {generating ? "Building your resume…" : "✨ Generate Resume"}
          </button>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <button className="btn-outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0} style={{ opacity: step === 0 ? 0.3 : 1 }}>← Back</button>
        {step < 4 && <button className="btn-primary" onClick={() => setStep((s) => s + 1)}>Next →</button>}
      </div>
    </div>
  );
}

/* ─── Tab: Export ───────────────────────────────── */
function ExportTab({ resume, personalInfo }: { resume: GeneratedResume | null; personalInfo: { name: string; email: string; phone: string; location: string; linkedin: string } | null }) {
  if (!resume) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <p style={{ fontSize: 14, color: "#888" }}>Go to the Build tab and generate your resume first.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn-primary" onClick={() => window.print()}>⬇ Export PDF</button>
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #resume-preview { display: block !important; position: fixed; inset: 0; background: white; }
          #resume-preview * { -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div id="resume-preview" style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 16, padding: "40px 48px", fontFamily: "Georgia, serif", lineHeight: 1.6 }}>
        {/* Header */}
        <div style={{ borderBottom: "2px solid #1B3A35", paddingBottom: 16, marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1B3A35", margin: "0 0 4px" }}>{personalInfo?.name || "Your Name"}</h1>
          <p style={{ fontSize: 13, color: "#555", margin: 0 }}>
            {[personalInfo?.email, personalInfo?.phone, personalInfo?.location, personalInfo?.linkedin].filter(Boolean).join(" · ")}
          </p>
        </div>

        {/* Summary */}
        {resume.summary && (
          <Section title="Professional Summary">
            <p style={{ fontSize: 13, color: "#333", margin: 0 }}>{resume.summary}</p>
          </Section>
        )}

        {/* Experience */}
        {resume.experience?.length > 0 && (
          <Section title="Experience">
            {resume.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 14, color: "#1a1a1a" }}>{exp.title}</strong>
                  <span style={{ fontSize: 12, color: "#888" }}>{exp.duration}</span>
                </div>
                <p style={{ fontSize: 13, color: "#555", margin: "2px 0 8px", fontStyle: "italic" }}>{exp.company}</p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {exp.bullets.map((b, j) => <li key={j} style={{ fontSize: 13, color: "#333", marginBottom: 4 }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </Section>
        )}

        {/* Education */}
        {resume.education?.length > 0 && (
          <Section title="Education">
            {resume.education.map((edu, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <strong style={{ fontSize: 13, color: "#1a1a1a" }}>{edu.degree}</strong>
                  <p style={{ fontSize: 12, color: "#555", margin: 0 }}>{edu.school}{edu.highlights ? ` · ${edu.highlights}` : ""}</p>
                </div>
                <span style={{ fontSize: 12, color: "#888" }}>{edu.year}</span>
              </div>
            ))}
          </Section>
        )}

        {/* Skills */}
        {resume.skills && (
          <Section title="Skills">
            {resume.skills.technical?.length > 0 && (
              <p style={{ fontSize: 13, color: "#333", margin: "0 0 4px" }}><strong>Technical:</strong> {resume.skills.technical.join(", ")}</p>
            )}
            {resume.skills.soft?.length > 0 && (
              <p style={{ fontSize: 13, color: "#333", margin: 0 }}><strong>Soft Skills:</strong> {resume.skills.soft.join(", ")}</p>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 800, color: "#1B3A35", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", borderBottom: "1px solid #eee", paddingBottom: 4 }}>{title}</h2>
      {children}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────── */
type Tab = "analyse" | "build" | "export";

interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  targetRole: string;
}

export default function ResumePage() {
  const [tab, setTab] = useState<Tab>("analyse");
  const [generatedResume, setGeneratedResume] = useState<GeneratedResume | null>(null);
  const [generatedPersonalInfo, setGeneratedPersonalInfo] = useState<PersonalInfo | null>(null);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "analyse", label: "Analyse", icon: "🔍" },
    { id: "build",   label: "Build",   icon: "🛠" },
    { id: "export",  label: "Export",  icon: "📄" },
  ];

  const handleGenerated = (resume: GeneratedResume, pi: PersonalInfo) => {
    setGeneratedResume(resume);
    setGeneratedPersonalInfo(pi);
    setTab("export");
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>AI Resume Builder</h1>
        <p style={{ fontSize: 14, color: "#888", margin: 0 }}>Analyse, build, and export a standout resume with Claude.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 32, backgroundColor: "#f5f5f5", padding: 4, borderRadius: 12, width: "fit-content" }}>
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              fontSize: 13, fontWeight: tab === id ? 700 : 500,
              color: tab === id ? "#1a1a1a" : "#888",
              backgroundColor: tab === id ? "#fff" : "transparent",
              border: "none", borderRadius: 10, padding: "8px 20px",
              cursor: "pointer", boxShadow: tab === id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "analyse" && <AnalyseTab />}
      {tab === "build" && <BuildTab onGenerated={handleGenerated} />}
      {tab === "export" && <ExportTab resume={generatedResume} personalInfo={generatedPersonalInfo} />}
    </div>
  );
}
