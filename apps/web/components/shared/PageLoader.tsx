'use client';

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex gap-4 px-4 py-3 border-b animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-4 bg-muted rounded flex-1" />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-card border rounded-xl p-4 animate-pulse space-y-2">
          <div className="h-3 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-4 animate-pulse space-y-3">
      <div className="h-3 bg-muted rounded w-1/3" />
      <div className="h-7 bg-muted rounded w-2/3" />
    </div>
  );
}
