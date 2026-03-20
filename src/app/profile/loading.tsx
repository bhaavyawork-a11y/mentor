import { Skeleton } from "@/components/ui/Skeleton";

function SectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-2 pb-1 border-b border-cream-soft">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[...Array(rows * 2)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfileLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-56" />
      </div>
      <SectionSkeleton rows={2} />
      <SectionSkeleton rows={2} />
      <SectionSkeleton rows={1} />
      <div className="space-y-2">
        <Skeleton className="h-3 w-12" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
        <div className="flex gap-2 mt-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-lg" />
          ))}
        </div>
      </div>
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>
  );
}
