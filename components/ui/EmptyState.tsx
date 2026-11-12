import type { ReactNode } from 'react';
import { Card } from './Card';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <h2 className="text-base font-semibold text-text">{title}</h2>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </Card>
  );
}

