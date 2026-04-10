"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function formatINR(cents: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(cents / 100);
}

interface Payout {
  id: string; amount_cents: number; status: string; method: string;
  upi_id: string | null; requested_at: string; processed_at: string | null;
}
interface Expert {
  id: string; total_earned_cents: number; pending_payout_cents: number;
  upi_id: string | null; bank_account_number: string | null;
  bank_ifsc: string | null; bank_account_name: string | null;
}
interface CompletedBooking {
  id: string; amount_cents: number; scheduled_at: string;
  service: { title: string } | null;
}

const PAYOUT_STATUS: Record<string, { bg: string; color: string }> = {
  pending:    { bg: "#FFF3CC", color: "#8a6200" },
  processing: { bg: "#dbeafe", color: "#1e40af" },
  paid:       { bg: "#e8f5e9", color: "#1b5e20" },
  rejected:   { bg: "#fee2e2", color: "#dc2626" },
};

export default function ExpertEarningsPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [expert, setExpert]     = useState<Expert | null>(null);
  const [payouts, setPayouts]   = useState<Payout[]>([]);
  const [completedBookings, setCompletedBookings] = useState<CompletedBooking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<"overview" | "payout">("overview");

  // Payout form state
  const [method, setMethod]     = useState<"upi" | "bank_transfer">("upi");
  const [upiId, setUpiId]       = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAcc, setBankAcc]   = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [payoutAmt, setPayoutAmt] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [reqError, setReqError]   = useState<string | null>(null);
  const [reqSuccess, setReqSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: expertData } = await supabase
        .from("experts")
        .select("id, total_earned_cents, pending_payout_cents, upi_id, bank_account_number, bank_ifsc, bank_account_name")
        .eq("user_id", session.user.id)
        .single();

      if (!expertData) { router.push("/expert-dashboard/profile"); return; }
      setExpert(expertData as Expert);

      // Pre-fill payout fields from stored info
      if (expertData.upi_id)            setUpiId(expertData.upi_id);
      if (expertData.bank_account_name) setBankName(expertData.bank_account_name);
      if (expertData.bank_account_number) setBankAcc(expertData.bank_account_number);
      if (expertData.bank_ifsc)         setBankIfsc(expertData.bank_ifsc);

      // Completed bookings for earnings breakdown
      const { data: bookingData } = await supabase
        .from("bookings")
        .select("id, amount_cents, scheduled_at, service:services(title)")
        .eq("expert_id", expertData.id)
        .eq("status", "completed")
        .order("scheduled_at", { ascending: false });

      const raw = (bookingData ?? []) as Array<Omit<CompletedBooking, "service"> & {
        service: CompletedBooking["service"] | CompletedBooking["service"][];
      }>;
      setCompletedBookings(raw.map(b => ({
        ...b,
        service: Array.isArray(b.service) ? b.service[0] : b.service,
      })));

      // Payouts
      const { data: payoutData } = await supabase
        .from("expert_payouts")
        .select("*")
        .eq("expert_id", expertData.id)
        .order("requested_at", { ascending: false });
      setPayouts((payoutData ?? []) as Payout[]);

      setLoading(false);
    })();
  }, [supabase, router]);

  const requestPayout = async () => {
    if (!expert) return;
    setRequesting(true); setReqError(null);
    try {
      const amountCents = Math.round(parseFloat(payoutAmt) * 100);
      if (!amountCents || amountCents <= 0) throw new Error("Enter a valid amount");
      if (amountCents > (expert.pending_payout_cents ?? 0)) throw new Error("Amount exceeds available balance");

      const res = await fetch("/api/expert/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_cents: amountCents,
          method,
          upi_id:      method === "upi" ? upiId : null,
          bank_account: method === "bank_transfer" ? bankAcc : null,
          bank_ifsc:   method === "bank_transfer" ? bankIfsc : null,
          bank_name:   method === "bank_transfer" ? bankName : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");

      setPayouts(p => [json, ...p]);
      setExpert(e => e ? { ...e, pending_payout_cents: (e.pending_payout_cents ?? 0) - amountCents } : e);
      setReqSuccess(true);
      setPayoutAmt("");
      setTimeout(() => setReqSuccess(false), 4000);
    } catch (e: unknown) {
      setReqError(e instanceof Error ? e.message : "Error");
    } finally {
      setRequesting(false);
    }
  };

  const totalEarned    = expert?.total_earned_cents ?? 0;
  const availablePayout = expert?.pending_payout_cents ?? 0;
  const totalPaidOut   = payouts.filter(p => p.status === "paid").reduce((s, p) => s + p.amount_cents, 0);

  // Monthly breakdown
  const monthly: Record<string, number> = {};
  completedBookings.forEach(b => {
    if (!b.scheduled_at || !b.amount_cents) return;
    const key = new Date(b.scheduled_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    monthly[key] = (monthly[key] ?? 0) + b.amount_cents;
  });

  if (loading) return <div style={{ padding: 40 }}><p style={{ color: "#6B7280" }}>Loading…</p></div>;

  return (
    <div style={{ padding: 32, maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#F9FAFB", margin: "0 0 4px" }}>Earnings & Payouts</h1>
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Track your income and request withdrawals.</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Earned",     value: formatINR(totalEarned),    icon: "💰", note: "Lifetime" },
          { label: "Available Balance",value: formatINR(availablePayout), icon: "🏦", note: "Ready to withdraw" },
          { label: "Total Paid Out",   value: formatINR(totalPaidOut),   icon: "✅", note: "Withdrawn so far" },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#F9FAFB", marginBottom: 2 }}>{card.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#F9FAFB", marginBottom: 2 }}>{card.label}</div>
            <div style={{ fontSize: 10, color: "#6B7280" }}>{card.note}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {(["overview", "payout"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "7px 18px", borderRadius: 99, fontSize: 12, fontWeight: tab === t ? 700 : 500,
            backgroundColor: tab === t ? "#0A3323" : "#f5f5f0",
            color: tab === t ? "#839958" : "#666",
            border: "none", cursor: "pointer", fontFamily: "inherit",
          }}>
            {t === "overview" ? "Earnings history" : "Request payout"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {/* Monthly breakdown */}
          {Object.keys(monthly).length > 0 && (
            <div style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #1F2937" }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#F9FAFB", margin: 0 }}>Monthly breakdown</p>
              </div>
              <div style={{ padding: "0 20px" }}>
                {Object.entries(monthly).map(([month, cents], i, arr) => (
                  <div key={month} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 0", borderBottom: i < arr.length - 1 ? "1px solid #f5f5f0" : "none",
                  }}>
                    <span style={{ fontSize: 13, color: "#F9FAFB" }}>{month}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB" }}>{formatINR(cents)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session log */}
          <div style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #1F2937" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#F9FAFB", margin: 0 }}>Completed sessions</p>
            </div>
            {completedBookings.length === 0 ? (
              <div style={{ padding: "28px 20px", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#6B7280" }}>No completed sessions yet.</p>
              </div>
            ) : (
              completedBookings.map((b, i) => (
                <div key={b.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 20px", borderBottom: i < completedBookings.length - 1 ? "1px solid #f5f5f0" : "none",
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#F9FAFB", margin: "0 0 2px" }}>{b.service?.title ?? "Session"}</p>
                    <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>
                      {b.scheduled_at ? new Date(b.scheduled_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                    </p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB" }}>{formatINR(b.amount_cents)}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === "payout" && (
        <div style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 16, padding: 28 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#F9FAFB", marginBottom: 4 }}>Request a withdrawal</p>
          <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 24 }}>
            Available balance: <strong style={{ color: "#F9FAFB" }}>{formatINR(availablePayout)}</strong> · Payouts processed within 3–5 business days
          </p>

          {/* Method toggle */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {(["upi", "bank_transfer"] as const).map(m => (
              <button key={m} onClick={() => setMethod(m)} style={{
                padding: "8px 16px", borderRadius: 99, fontSize: 12, fontWeight: method === m ? 700 : 500,
                backgroundColor: method === m ? "#0A3323" : "#f5f5f0",
                color: method === m ? "#839958" : "#666",
                border: "none", cursor: "pointer", fontFamily: "inherit",
              }}>
                {m === "upi" ? "UPI" : "Bank Transfer"}
              </button>
            ))}
          </div>

          {method === "upi" ? (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9FAFB", marginBottom: 6 }}>UPI ID</label>
              <input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi"
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid #1F2937", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "inherit", outline: "none", color: "#F9FAFB" }} />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              {[
                { label: "Account holder name", value: bankName, set: setBankName, ph: "Name on account" },
                { label: "Account number",      value: bankAcc,  set: setBankAcc,  ph: "1234567890" },
                { label: "IFSC code",           value: bankIfsc, set: setBankIfsc, ph: "SBIN0001234" },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9FAFB", marginBottom: 6 }}>{f.label}</label>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                    style={{ width: "100%", boxSizing: "border-box", border: "1px solid #1F2937", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "inherit", outline: "none", color: "#F9FAFB" }} />
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9FAFB", marginBottom: 6 }}>Amount (₹)</label>
            <input type="number" min={1} value={payoutAmt} onChange={e => setPayoutAmt(e.target.value)}
              placeholder={`Max ₹${(availablePayout / 100).toLocaleString("en-IN")}`}
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #1F2937", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "inherit", outline: "none", color: "#F9FAFB" }} />
          </div>

          {reqError   && <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 14, backgroundColor: "#fee2e2", padding: "8px 12px", borderRadius: 8 }}>{reqError}</p>}
          {reqSuccess && <p style={{ fontSize: 12, color: "#1b5e20", marginBottom: 14, backgroundColor: "#e8f5e9", padding: "8px 12px", borderRadius: 8 }}>✓ Payout request submitted! We'll process it within 3–5 business days.</p>}

          <button onClick={requestPayout} disabled={requesting || !payoutAmt || availablePayout === 0} style={{
            backgroundColor: "#064E3B", color: "#F9FAFB", border: "none",
            borderRadius: 12, padding: "12px 24px", fontSize: 13, fontWeight: 800,
            cursor: requesting || !payoutAmt || availablePayout === 0 ? "default" : "pointer",
            opacity: !payoutAmt || availablePayout === 0 ? 0.6 : 1,
          }}>
            {requesting ? "Submitting…" : "Request payout"}
          </button>

          {/* Payout history */}
          {payouts.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#F9FAFB", marginBottom: 12 }}>Payout history</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {payouts.map(p => {
                  const chip = PAYOUT_STATUS[p.status] ?? PAYOUT_STATUS.pending;
                  return (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      backgroundColor: "#fafaf8", border: "1px solid #f0efe8",
                      borderRadius: 10, padding: "12px 14px",
                    }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB", margin: "0 0 2px" }}>{formatINR(p.amount_cents)}</p>
                        <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>
                          {p.method === "upi" ? `UPI · ${p.upi_id}` : "Bank transfer"} · {new Date(p.requested_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "3px 10px", ...chip, textTransform: "capitalize" }}>
                        {p.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
