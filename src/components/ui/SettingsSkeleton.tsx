import { Skeleton } from "@/components/ui/skeleton";

export function SettingsSkeleton() {
  return (
    <div className="pb-4 max-w-2xl mx-auto animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4 py-4 mb-6">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-6 w-24" />
      </div>

      {/* Account Section Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-4 w-20 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-5" />
            </div>
          ))}
        </div>
      </div>

      {/* Notifications Section Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-4 w-28 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-52" />
              </div>
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Appearance Section Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
