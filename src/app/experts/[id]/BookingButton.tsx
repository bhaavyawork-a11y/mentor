"use client";

import { useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";

export default function BookingButton({
  expertId,
  serviceId,
  label = "Book now",
  size = "default",
}: {
  expertId: string;
  serviceId: string;
  userId?: string;
  label?: string;
  size?: "default" | "small";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, expertId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const sizeStyle = size === "small"
    ? { fontSize: "11px", padding: "6px 12px" }
    : { fontSize: "13px", padding: "8px 16px" };

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
        style={{ ...sizeStyle, background: "#F2619C", color: "#ffffff" }}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ExternalLink className="w-3.5 h-3.5" />
        )}
        {loading ? "Redirecting…" : label}
      </button>
      {error && (
        <p className="text-[11px] text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
