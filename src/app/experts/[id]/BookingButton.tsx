"use client";

import { useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";

export default function BookingButton({
  expertId, serviceId, label = "Book now", size = "default",
}: {
  expertId: string; serviceId: string; userId?: string;
  label?: string; size?: "default" | "small";
}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceId, expertId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const pad = size === "small" ? "5px 12px" : "8px 16px";
  const fz  = size === "small" ? "11px" : "13px";

  return (
    <div>
      <button onClick={handleCheckout} disabled={loading}
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          backgroundColor: "#1A3A8F", color: "#6B7280",
          fontSize: fz, fontWeight: 700,
          borderRadius: "8px", padding: pad,
          border: "none", cursor: "pointer", opacity: loading ? 0.7 : 1,
          transition: "opacity 0.15s",
        }}>
        {loading ? <Loader2 style={{ width: "13px", height: "13px" }} /> : <ExternalLink style={{ width: "13px", height: "13px" }} />}
        {loading ? "Redirecting…" : label}
      </button>
      {error && <p style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>{error}</p>}
    </div>
  );
}
