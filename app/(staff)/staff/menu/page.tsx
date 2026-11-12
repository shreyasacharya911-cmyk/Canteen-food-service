'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClientError, fetcher, patchJson } from '@/lib/api-client';
import type { MenuItem } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Skeleton } from '@/components/ui/Skeleton';

export default function StaffMenuPage() {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR<{ items: MenuItem[] }>(
    '/api/staff/menu',
    fetcher,
    { refreshInterval: 10000 }
  );

  const items = data?.items ?? [];

  async function handleToggle(item: MenuItem) {
    const nextState = !item.isAvailable;
    setTogglingId(item.id);
    try {
      await patchJson<{ item: MenuItem }>(`/api/staff/menu/${item.id}`, {
        isAvailable: nextState,
      });
      toast.success(
        `${item.name} marked ${nextState ? 'Available' : 'Sold out'}`
      );
      await mutate();
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : 'Failed to update availability.';
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Menu Availability</h1>
        <p className="text-sm text-muted">
          Toggle items sold out or available. Changes apply to customer menus within 10s.
        </p>
      </div>

      {error && (
        <ErrorBanner
          message={
            error instanceof ApiClientError ? error.message : 'Could not load menu items.'
          }
          onRetry={() => void mutate()}
        />
      )}

      {isLoading && !data ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-8 w-8" aria-hidden="true" />}
          title="No menu items found"
        />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {items.map((item) => {
            const busy = togglingId === item.id;
            return (
              <div
                key={item.id}
                className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {item.emoji || '🍽️'}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-semibold text-text">{item.name}</span>
                      <Badge tone="neutral">{item.category}</Badge>
                      {item.isAvailable && item.stockRemaining > 0 ? (
                        <Badge tone="success">Available</Badge>
                      ) : (
                        <Badge tone="danger">Sold out</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted">
                      &#8377;{item.priceInr} &middot; {item.prepMinutes} min prep &middot; Stock:{' '}
                      {item.stockRemaining}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={item.isAvailable}
                  aria-label={`Toggle availability for ${item.name}`}
                  disabled={busy}
                  onClick={() => handleToggle(item)}
                  className={`inline-flex min-h-[48px] min-w-[130px] items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    item.isAvailable
                      ? 'bg-success text-white hover:bg-success/90'
                      : 'border border-border bg-bg text-text hover:bg-border/40'
                  }`}
                >
                  {busy
                    ? 'Updating...'
                    : item.isAvailable
                    ? 'On (Available)'
                    : 'Off (Sold out)'}
                </button>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
