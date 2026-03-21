import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "raspberry" | "lemon" | "lilac" | "blueberry" | "red";

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default:    { background: "#f0f0f0",  color: "#0f0f0f99" },
  raspberry:  { background: "#F2619C",  color: "#ffffff"   },
  lemon:      { background: "#EDE986",  color: "#0f0f0f"   },
  lilac:      { background: "#E7BEF8",  color: "#0f0f0f"   },
  blueberry:  { background: "#93ABD9",  color: "#0f0f0f"   },
  red:        { background: "#fee2e2",  color: "#dc2626"   },
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium", className)}
      style={variantStyles[variant]}
    >
      {children}
    </span>
  );
}
