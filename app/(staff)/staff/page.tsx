'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, Clock, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClientError, fetcher, patchJson } from '@/lib/api-client';
import { formatIst } from '@/lib/time';
import type { OrderStatus, StaffOrder } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Skeleton } from '@/components/ui/Skeleton';

type QueueTab = 'confirmed' | 'preparing' | 'ready';

const COLUMNS: Array<{
  status: QueueTab;
  title: string;
  nextStatus: 'preparing' | 'ready' | 'completed';
  actionLabel: string;
  tone: 'info' | 'warning' | 'success';
}> = [
  {
    status: 'confirmed',
    title: 'Upcoming',
    nextStatus: 'preparing',
    actionLabel: 'Start preparing',
    tone: 'info',
  },
  {
    status: 'preparing',
    title: 'Preparing',
    nextStatus: 'ready',
    actionLabel: 'Mark ready',
    tone: 'warning',
  },
  {
    status: 'ready',
    title: 'Ready',
    nextStatus: 'completed',
    actionLabel: 'Complete',
    tone: 'success',
  },
];

export default function StaffQueuePage() {
  const [activeTab, setActiveTab] = useState<QueueTab>('confirmed');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<{ orders: StaffOrder[] }>(
    '/api/staff/orders',
    fetcher,
    { refreshInterval: 5000 }
  );

  const orders = data?.orders ?? [];

  async function handleAdvance(
    order: StaffOrder,
    nextStatus: 'preparing' | 'ready' | 'completed'
  ) {
    setUpdatingId(order.id);
    try {
      await patchJson<{ order: StaffOrder }>(`/api/staff/orders/${order.id}/status`, {
        status: nextStatus,
      });
      toast.success(`Order #${order.shortCode} moved to ${nextStatus}`);
      await mutate();
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : 'Could not update order status.';
      toast.error(msg);
      await mutate();
    } finally {
      setUpdatingId(null);
    }
  }

  function renderColumn(col: (typeof COLUMNS)[number]) {
    const colOrders = orders.filter((o) => o.status === col.status);

    return (
      <section key={col.status} className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-xl font-semibold text-text">{col.title}</h2>
          <Badge tone={col.tone}>{colOrders.length}</Badge>
        </div>

        {colOrders.length === 0 ? (
          <EmptyState
            icon={<Utensils className="h-8 w-8" aria-hidden="true" />}
            title="No orders in this column"
          />
        ) : (
          <div className="flex flex-col gap-4">
            {colOrders.map((order) => (
              <Card key={order.id} className="p-5 text-lg">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-text">#{order.shortCode}</span>
                      {order.isOverdue && (
                        <Badge tone="danger" className="text-xs">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-base font-medium text-muted">
                      {order.customerName}
                    </p>
                  </div>

                  <div className="text-right">
                    <Badge tone="neutral" className="text-sm">
                      {order.table.label}
                    </Badge>
                    <p className="mt-1 text-sm text-muted">
                      Slot {formatIst(order.slotStart)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-lg bg-bg px-3 py-2 text-base font-medium text-text">
                  <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>Start by {formatIst(order.startBy)}</span>
                </div>

                <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-lg">
                  {order.items.map((item) => (
                    <li
                      key={`${order.id}-${item.menuItemId}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="font-medium text-text">
                        {item.quantity} &times; {item.name}
                      </span>
                      <span className="text-sm text-muted">{item.prepMinutes}m</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5">
                  <Button
                    fullWidth
                    className="min-h-[48px] text-base"
                    loading={updatingId === order.id}
                    onClick={() => handleAdvance(order, col.nextStatus)}
                  >
                    {col.actionLabel}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Kitchen Queue</h1>
          <p className="text-sm text-muted">Sorted by start-by time. Auto-refreshes every 5s.</p>
        </div>
      </div>

      {error && (
        <ErrorBanner
          message={
            error instanceof ApiClientError
              ? error.message
              : 'Could not load kitchen queue.'
          }
          onRetry={() => void mutate()}
        />
      )}

      {/* Mobile / tablet tabs */}
      <div className="grid grid-cols-3 gap-2 lg:hidden">
        {COLUMNS.map((col) => {
          const count = orders.filter((o) => o.status === col.status).length;
          const active = activeTab === col.status;
          return (
            <button
              key={col.status}
              type="button"
              onClick={() => setActiveTab(col.status)}
              className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-3 text-base font-semibold transition-colors ${
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-text'
              }`}
            >
              <span>{col.title}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  active ? 'bg-white/20 text-white' : 'bg-bg text-muted'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading && !data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-52 w-full rounded-xl" />
              <Skeleton className="h-52 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="lg:hidden">
            {renderColumn(COLUMNS.find((c) => c.status === activeTab) ?? COLUMNS[0])}
          </div>
          <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
            {COLUMNS.map((col) => renderColumn(col))}
          </div>
        </>
      )}
    </div>
  );
}
