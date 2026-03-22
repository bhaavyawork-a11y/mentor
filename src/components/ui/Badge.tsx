import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "mint" | "yellow" | "lavender" | "forest" | "red";

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default:  { backgroundColor: "#FAF7F2", color: "#888888" },
  mint:     { backgroundColor: "#00C9A7", color: "#1B3A35" },
  yellow:   { backgroundColor: "#FDE68A", color: "#1a1a1a" },
  lavender: { backgroundColor: "#C4B5FD", color: "#1a1a1a" },
  forest:   { backgroundColor: "#1B3A35", color: "#00C9A7" },
  red:      { backgroundColor: "#fee2e2", color: "#dc2626" },
};

export function Badge({ children, variant = "default", className }: {
  children: React.ReactNode; variant?: BadgeVariant; className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold", className)}
      style={variantStyles[variant]}
    >
      {children}
    </span>
  );
}
