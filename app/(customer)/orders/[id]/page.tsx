'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { ApiClientError, fetcher, postJson } from '@/lib/api-client';
import { formatIst } from '@/lib/time';
import type { Order, OrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/customer/OrderBadges';

const STEPS: Array<{ key: OrderStatus; label: string }> = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Completed' },
];

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<{ order: Order }>(
    `/api/customer/orders/${params.id}`,
    fetcher,
    { refreshInterval: 5_000 }
  );

  async function handleConfirmCancel() {
    if (!data?.order) return;
    setCancelling(true);
    try {
      const res = await postJson<{
        order: Order;
        outcome: { refunded: boolean; refundInr: number };
      }>(`/api/customer/orders/${data.order.id}/cancel`);

      await mutate({ order: res.order }, false);
      setCancelModalOpen(false);
      if (res.outcome.refunded) {
        toast.success(`Refund of ₹${res.outcome.refundInr} initiated (mock)`);
      } else {
        toast.info('Order cancelled (no refund)');
      }
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Unable to cancel order.';
      toast.error(message);
      void mutate();
    } finally {
      setCancelling(false);
    }
  }

  const order = data?.order;
  const activeStepIndex = order
    ? STEPS.findIndex((s) => s.key === order.status)
    : -1;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/orders"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to orders
      </Link>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <ErrorBanner
          message={
            error instanceof ApiClientError ? error.message : "Couldn't load order"
          }
          onRetry={() => void mutate()}
        />
      ) : !order ? null : (
        <>
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-bold text-text">Order #{order.shortCode}</h1>
                <p className="text-sm text-muted">
                  Placed {formatIst(order.createdAt, 'datetime')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>

            {activeStepIndex >= 0 && (
              <div className="grid grid-cols-4 gap-2 pt-2">
                {STEPS.map((step, idx) => {
                  const reached = idx <= activeStepIndex;
                  return (
                    <div
                      key={step.key}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center text-xs font-semibold ${
                        reached
                          ? 'border-success/30 bg-success/10 text-success'
                          : 'border-border bg-bg text-muted'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      <span>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted">Slot time</p>
                <p className="font-semibold text-text">
                  {formatIst(order.slotStart, 'datetime')}
                </p>
              </div>
              <div>
                <p className="text-muted">Table reserved</p>
                <p className="font-semibold text-text">
                  {order.table.label} ({order.table.seats} seats)
                </p>
              </div>
              <div>
                <p className="text-muted">Kitchen start by</p>
                <p className="font-semibold text-text">
                  {formatIst(order.startBy, 'time')}
                </p>
              </div>
              <div>
                <p className="text-muted">Free cancellation until</p>
                <p className="font-semibold text-text">
                  {formatIst(order.cancelCutoff, 'time')}
                </p>
              </div>
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="text-lg font-semibold text-text">Items</h2>
            <div className="divide-y divide-border">
              {order.items.map((item) => (
                <div
                  key={item.menuItemId}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-text">
                      {item.quantity} × {item.name}
                    </p>
                    <p className="text-xs text-muted">
                      ₹{item.unitPriceInr} each · {item.prepMinutes} min prep
                    </p>
                  </div>
                  <span className="font-semibold text-text">
                    ₹{item.unitPriceInr * item.quantity}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-semibold text-text">Total</span>
              <span className="text-xl font-bold text-text">₹{order.totalInr}</span>
            </div>
          </Card>

          {order.canCancel && (
            <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5 text-sm">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <p className="text-muted">
                  {order.willRefund
                    ? `Free cancellation available until ${formatIst(order.cancelCutoff, 'time')}.`
                    : 'Free cancellation window has passed. Cancelling now will forfeit payment.'}
                </p>
              </div>
              <Button variant="danger" onClick={() => setCancelModalOpen(true)}>
                Cancel order
              </Button>
            </Card>
          )}

          <Modal
            open={cancelModalOpen}
            onClose={cancelling ? undefined : () => setCancelModalOpen(false)}
            closeDisabled={cancelling}
            title="Cancel this order?"
          >
            <div className="space-y-4">
              {order.willRefund ? (
                <p className="rounded-xl border border-success/30 bg-success/10 p-3.5 text-sm font-medium text-success">
                  Refund of ₹{order.totalInr} (mock) — you are cancelling before the cutoff.
                </p>
              ) : (
                <p className="rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-sm font-medium text-danger">
                  No refund: the free-cancellation window has passed. ₹{order.totalInr} will be
                  forfeited.
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  fullWidth
                  disabled={cancelling}
                  onClick={() => setCancelModalOpen(false)}
                >
                  Keep order
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  loading={cancelling}
                  onClick={handleConfirmCancel}
                >
                  Confirm cancel
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}

