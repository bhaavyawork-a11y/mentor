import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-cream-soft animate-pulse",
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-6 space-y-3">
      <div className="flex gap-4">
        <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-16 rounded-lg" />
        <Skeleton className="h-6 w-20 rounded-lg" />
        <Skeleton className="h-6 w-14 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-full rounded-xl" />
    </div>
  );
}

export function GoalSkeleton() {
  return (
    <div className="card p-5 space-y-2">
      <div className="flex items-center gap-3">
        <Skeleton className="w-4 h-4 rounded-full shrink-0" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-5 w-16 rounded-lg" />
      </div>
      <Skeleton className="h-3 w-2/3 ml-7" />
    </div>
  );
}
