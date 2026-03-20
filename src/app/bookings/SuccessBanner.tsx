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
      // Auto-dismiss after 6 seconds
      const t = setTimeout(() => setVisible(false), 6000);
      return () => clearTimeout(t);
    }
  }, [params]);

  if (!visible) return null;

  return (
    <div className="card p-4 border-l-4 border-l-sage bg-sage/5 flex items-start gap-3 animate-fade-up" style={{ animationFillMode: "forwards" }}>
      <CheckCircle2 className="w-5 h-5 text-sage shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-ink text-sm">Booking confirmed!</p>
        <p className="text-ink/50 text-xs mt-0.5">
          Your session has been booked and payment processed. Check your email for details.
        </p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="ml-auto text-ink/30 hover:text-ink text-lg leading-none shrink-0"
      >
        ×
      </button>
    </div>
  );
}
