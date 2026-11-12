export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-xl bg-border/60 ${className}`} aria-hidden="true" />;
}

