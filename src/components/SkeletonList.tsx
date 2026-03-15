import { memo } from "react";

const SkeletonRow = memo(function SkeletonRow({ opacity }: { opacity: number }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
      style={{ opacity }}
    >
      {/* drag handle */}
      <div className="h-4 w-3 shrink-0 rounded bg-gray-100 dark:bg-gray-800" />
      {/* thumbnail */}
      <div className="h-12 w-12 shrink-0 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
      {/* content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 w-3/5 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="flex gap-1">
          <div className="h-3 w-12 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="h-3 w-16 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="h-3 w-10 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
      </div>
      {/* meta */}
      <div className="shrink-0 space-y-1.5">
        <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="h-3 w-10 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>
      {/* checkbox */}
      <div className="h-4 w-4 shrink-0 rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
});

export const SkeletonList = memo(function SkeletonList() {
  return (
    <div className="flex flex-col gap-1">
      <SkeletonRow opacity={1} />
      <SkeletonRow opacity={0.6} />
      <SkeletonRow opacity={0.3} />
    </div>
  );
});
