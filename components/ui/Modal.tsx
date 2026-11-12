'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title: string;
  children: ReactNode;
  closeDisabled?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  closeDisabled = false,
}: ModalProps) {
  useEffect(() => {
    if (!open || closeDisabled || !onClose) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, closeDisabled, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => {
        if (!closeDisabled && onClose) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl border border-border bg-surface p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          {onClose && !closeDisabled && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-bg hover:text-text"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

