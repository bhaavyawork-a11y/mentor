"use client";

import Link from "next/link";
import { RefreshCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-8">
      <div className="text-center max-w-sm">
        <p className="font-display text-8xl font-semibold text-ink/10 mb-6 select-none">
          :(
        </p>
        <h1 className="font-display text-2xl font-semibold text-ink mb-2">
          Something went wrong
        </h1>
        <p className="text-ink/50 text-sm mb-8">
          {error.message ?? "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary">
            <RefreshCcw className="w-4 h-4" /> Try again
          </button>
          <Link href="/dashboard" className="btn-secondary">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
