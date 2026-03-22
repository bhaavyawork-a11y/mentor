import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-lg animate-pulse", className)} style={{ backgroundColor: "#eeeeee" }} />;
}

export function CardSkeleton() {
  return (
    <div style={{ backgroundColor: "#ffffff", border: "1px solid #eeeeee", borderRadius: "16px", padding: "20px" }}>
      <div style={{ display: "flex", gap: "14px" }}>
        <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg mt-3" />
    </div>
  );
}

export function GoalSkeleton() {
  return (
    <div style={{ backgroundColor: "#ffffff", border: "1px solid #eeeeee", borderRadius: "14px", padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Skeleton className="w-4 h-4 rounded-full shrink-0" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-2/3 ml-6 mt-2" />
    </div>
  );
}
