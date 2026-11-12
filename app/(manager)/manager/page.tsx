'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ReceiptText, Users } from 'lucide-react';
import { ApiClientError, fetcher } from '@/lib/api-client';
import { formatIst } from '@/lib/time';
import type { DashboardData, OrderStatus } from '@/lib/types';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/customer/OrderBadges';
import { CameraPanel } from '@/components/manager/CameraPanel';
import { DemoClockPanel } from '@/components/manager/DemoClockPanel';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Skeleton } from '@/components/ui/Skeleton';

const STATUS_FILTERS: Array<{ value: 'all' | OrderStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled_free', label: 'Cancelled (Free)' },
  { value: 'cancelled_late', label: 'Cancelled (Late)' },
];

export default function ManagerDashboardPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const { data, error, isLoading, mutate } = useSWR<DashboardData>(
    '/api/manager/dashboard',
    fetcher,
    { refreshInterval: 10000 }
  );

  const filteredOrders =
    data?.orders.filter((o) => (statusFilter === 'all' ? true : o.status === statusFilter)) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Manager Dashboard</h1>
          <p className="text-sm text-muted">
            Live overview of today&apos;s orders, table occupancy, and canteen floor. Auto-refreshes every 10s.
          </p>
        </div>
      </div>

      {error && (
        <ErrorBanner
          message={
            error instanceof ApiClientError
              ? error.message
              : 'Could not load manager dashboard.'
          }
          onRetry={() => void mutate()}
        />
      )}

      {/* KPI Row */}
      {isLoading && !data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <section className="grid grid-cols-2 gap-4 md:grid-cols-5" aria-label="Key metrics">
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Orders today</p>
            <p className="mt-1 text-2xl font-bold text-text">{data.kpis.ordersToday}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Active orders</p>
            <p className="mt-1 text-2xl font-bold text-info">{data.kpis.activeOrders}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Revenue</p>
            <p className="mt-1 text-2xl font-bold text-success">&#8377;{data.kpis.revenueInr}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Free cancels</p>
            <p className="mt-1 text-2xl font-bold text-text">{data.kpis.freeCancellations}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Late cancels</p>
            <p className="mt-1 text-2xl font-bold text-danger">{data.kpis.lateCancellations}</p>
          </Card>
        </section>
      ) : null}

      {/* Two-column main area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Orders Table */}
        <div className="lg:col-span-7">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-text">Today&apos;s Orders</h2>
              <div className="flex items-center gap-2">
                <label htmlFor="status-filter" className="text-sm font-medium text-muted">
                  Status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)}
                  className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-sm font-medium text-text"
                >
                  {STATUS_FILTERS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isLoading && !data ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <EmptyState
                icon={<ReceiptText className="h-8 w-8" aria-hidden="true" />}
                title="No orders yet today"
                description={
                  statusFilter === 'all'
                    ? 'Orders placed today will appear here.'
                    : 'No orders match this status filter.'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted">
                      <th className="py-2.5 pr-3">Code</th>
                      <th className="py-2.5 pr-3">Customer</th>
                      <th className="py-2.5 pr-3">Slot &amp; Table</th>
                      <th className="py-2.5 pr-3">Status</th>
                      <th className="py-2.5 pr-3">Payment</th>
                      <th className="py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-bg/60">
                        <td className="py-3 pr-3 font-bold text-text">#{order.shortCode}</td>
                        <td className="py-3 pr-3">
                          <div className="font-medium text-text">{order.customerName}</div>
                          <div className="text-xs text-muted">
                            {order.totalItems} {order.totalItems === 1 ? 'item' : 'items'}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="font-medium text-text">{formatIst(order.slotStart)}</div>
                          <div className="text-xs text-muted">{order.table.label}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-wrap items-center gap-1">
                            <OrderStatusBadge status={order.status} />
                            {order.isOverdue && <Badge tone="danger">Overdue</Badge>}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <PaymentStatusBadge status={order.paymentStatus} />
                        </td>
                        <td className="py-3 text-right font-semibold text-text">
                          &#8377;{order.totalInr}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Occupancy Grid, Demo Clock, Camera */}
        <div className="space-y-6 lg:col-span-5">
          {/* Occupancy Grid */}
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold text-text">Current Slot Occupancy</h2>
                <p className="text-xs text-muted">
                  {data?.occupancy.slotStart
                    ? `Active slot: ${formatIst(data.occupancy.slotStart)}`
                    : 'Outside canteen open hours (09:00 – 16:00)'}
                </p>
              </div>
              <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>

            {isLoading && !data ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : data ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                {data.occupancy.tables.map((table) => (
                  <div
                    key={table.id}
                    className={`rounded-xl border p-2.5 text-center ${
                      table.isFree
                        ? 'border-success/30 bg-success/10 text-success'
                        : 'border-neutral/30 bg-neutral/15 text-[#495057]'
                    }`}
                  >
                    <p className="text-sm font-bold">{table.label}</p>
                    <p className="text-xs">{table.seats} seats</p>
                    <p className="mt-1 text-xs font-semibold">
                      {table.isFree ? 'Free' : 'Taken'}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          {/* Demo Clock */}
          {data && (
            <DemoClockPanel
              nowIso={data.clock.nowIso}
              offsetMinutes={data.clock.demoClockOffsetMinutes}
              onUpdated={mutate}
            />
          )}

          {/* Camera Panel */}
          <CameraPanel />
        </div>
      </div>
    </div>
  );
}
