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
    <div
      className="card flex items-start gap-3 animate-fade-up"
      style={{
        animationFillMode: "forwards",
        borderLeft: "4px solid #F2619C",
        background: "#F2619C0d",
      }}
    >
      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#F2619C" }} />
      <div>
        <p className="font-medium text-[13px]" style={{ color: "#0f0f0f" }}>Booking confirmed!</p>
        <p className="text-[11px] mt-0.5" style={{ color: "#0f0f0f66" }}>
          Your session has been booked and payment processed. Check your email for details.
        </p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="ml-auto text-lg leading-none shrink-0 transition-opacity hover:opacity-60"
        style={{ color: "#0f0f0f66" }}
      >
        ×
      </button>
    </div>
  );
}
