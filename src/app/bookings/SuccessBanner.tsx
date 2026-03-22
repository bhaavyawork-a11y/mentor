"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function BookingSuccessBanner() {
  const params = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (params.get("success") === "true") {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 6000);
      return () => clearTimeout(t);
    }
  }, [params]);

  if (!visible) return null;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "12px",
      backgroundColor: "#ffffff", border: "1px solid #e8e4ce",
      borderLeft: "3px solid #839958",
      borderRadius: "12px", padding: "14px 16px",
      animation: "fadeUp 0.3s ease forwards",
    }}>
      <CheckCircle2 style={{ width: "18px", height: "18px", color: "#839958", flexShrink: 0, marginTop: "1px" }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a", margin: 0 }}>Booking confirmed!</p>
        <p style={{ fontSize: "11px", color: "#839958", marginTop: "2px" }}>
          Your session has been booked and payment processed. Check your email for details.
        </p>
      </div>
      <button onClick={() => setVisible(false)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#b0ab8c", fontSize: "18px", lineHeight: 1, flexShrink: 0 }}>
        ×
      </button>
    </div>
  );
}
