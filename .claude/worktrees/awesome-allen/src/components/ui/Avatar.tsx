import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-xl",
  xl: "w-20 h-20 text-3xl",
};

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sizeClass = sizeMap[size];

  if (src) {
    return (
      <div className={cn("rounded-2xl overflow-hidden shrink-0 bg-cream", sizeClass, className)}>
        <Image src={src} alt={name} width={80} height={80} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl flex items-center justify-center shrink-0",
        "bg-gradient-to-br from-sage/20 to-sage/5 border border-sage/10",
        "font-display font-semibold text-sage",
        sizeClass,
        className
      )}
    >
      {initials}
    </div>
  );
}
