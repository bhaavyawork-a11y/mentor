import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "sage" | "amber" | "red" | "blue" | "purple";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-cream text-ink/50",
  sage: "bg-sage/10 text-sage",
  amber: "bg-amber-mentor/10 text-amber-mentor",
  red: "bg-red-50 text-red-500",
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
