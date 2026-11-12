'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { ApiClientError, fetcher } from '@/lib/api-client';
import { formatIst } from '@/lib/time';
import type { Order } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { OrderStatusBadge } from '@/components/customer/OrderBadges';

export default function OrdersPage() {
  const { data, error, isLoading, mutate } = useSWR<{ orders: Order[] }>(
    '/api/customer/orders',
    fetcher,
    { refreshInterval: 5_000 }
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text">My Orders</h1>
        <p className="mt-1 text-sm text-muted">Live status updates every 5 seconds.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorBanner
          message={
            error instanceof ApiClientError ? error.message : "Couldn't load orders"
          }
          onRetry={() => void mutate()}
        />
      ) : !data || data.orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" aria-hidden="true" />}
          title="No orders yet"
          description="Browse today's menu to book food and a table."
          action={
            <Link href="/menu">
              <Button>Go to menu</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {data.orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`} className="block">
              <Card className="flex min-h-[76px] items-center justify-between gap-3 p-4 transition-colors hover:border-primary/60">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-text">#{order.shortCode}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-muted">
                    {formatIst(order.slotStart, 'datetime')} · Table {order.table.label} ·{' '}
                    {order.totalItems} {order.totalItems === 1 ? 'item' : 'items'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-text">₹{order.totalInr}</span>
                  <ChevronRight className="h-5 w-5 text-muted" aria-hidden="true" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

