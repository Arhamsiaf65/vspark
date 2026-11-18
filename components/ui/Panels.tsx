"use client";

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card text-center">
      <h2 className="font-display text-lg font-bold">Something went wrong</h2>
      <p className="mt-1 text-sm text-muted">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn btn-dark mt-4">
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card h-40 animate-pulse bg-brand-soft/50" />
      ))}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="card border-dashed text-center">
      <h3 className="font-display font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}
