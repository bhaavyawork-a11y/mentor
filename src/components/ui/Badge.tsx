import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "mint" | "yellow" | "lavender" | "forest" | "red";

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default:  { backgroundColor: "#F9F7EC", color: "#5B8AFF" },
  mint:     { backgroundColor: "#5B8AFF", color: "#080B14" },
  yellow:   { backgroundColor: "#F7F4D5", color: "#1a1a1a" },
  lavender: { backgroundColor: "#D3968C", color: "#1a1a1a" },
  forest:   { backgroundColor: "#080B14", color: "#5B8AFF" },
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
