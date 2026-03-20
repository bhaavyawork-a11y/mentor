import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "card p-16 text-center flex flex-col items-center",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-ink/5 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-ink/20" />
      </div>
      <p className="font-display font-semibold text-ink/40 text-sm mb-1">{title}</p>
      {description && (
        <p className="text-xs text-ink/30 mb-6 max-w-xs">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
