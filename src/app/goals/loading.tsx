import { GoalSkeleton } from "@/components/ui/Skeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function GoalsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-56 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <GoalSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
