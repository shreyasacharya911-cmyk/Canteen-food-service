import type { ReactNode } from 'react';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  primary: 'bg-primary/10 text-primary border-primary/25',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/15 text-[#9A6700] border-warning/30',
  danger: 'bg-danger/10 text-danger border-danger/25',
  info: 'bg-info/10 text-info border-info/25',
  neutral: 'bg-neutral/15 text-[#495057] border-neutral/30',
};

export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

