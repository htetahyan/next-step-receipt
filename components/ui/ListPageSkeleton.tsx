export default function ListPageSkeleton() {
  return (
    <div className="space-y-4 pb-8 animate-pulse">
      <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-[var(--card-border)] rounded" />
          <div className="h-3 w-32 bg-[var(--card-border)]/60 rounded" />
        </div>
        <div className="h-8 w-28 bg-[var(--card-border)] rounded-lg" />
      </div>
      <div className="h-9 w-full max-w-md bg-[var(--card-border)] rounded-lg" />
      <div className="card-anthropic overflow-hidden">
        <div className="space-y-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-11 border-b border-[var(--card-border)]/60 bg-[var(--card-border)]/20" />
          ))}
        </div>
      </div>
    </div>
  );
}
