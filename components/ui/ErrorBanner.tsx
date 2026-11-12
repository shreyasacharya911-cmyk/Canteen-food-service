'use client';

import { AlertCircle, RotateCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorBanner({ message, onRetry, retryLabel = 'Retry' }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
    >
      <div className="flex items-center gap-2.5 font-medium">
        <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="border-danger/30 text-danger">
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

