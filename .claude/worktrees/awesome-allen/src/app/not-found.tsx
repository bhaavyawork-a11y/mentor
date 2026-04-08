import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-8">
      <div className="text-center max-w-sm">
        <p className="font-display text-8xl font-semibold text-ink/10 mb-6 select-none">
          404
        </p>
        <h1 className="font-display text-2xl font-semibold text-ink mb-2">
          Page not found
        </h1>
        <p className="text-ink/50 text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/dashboard" className="btn-primary">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}
