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

  const sizeClasses =
    size === "small"
      ? "text-xs px-3 py-1.5"
      : "text-sm px-4 py-2";

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={`btn-sage ${sizeClasses} disabled:opacity-60 gap-1.5`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ExternalLink className="w-3.5 h-3.5" />
        )}
        {loading ? "Redirecting…" : label}
      </button>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
