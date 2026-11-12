import { Badge, type BadgeTone } from '@/components/ui/Badge';
import type { OrderStatus, PaymentStatus } from '@/lib/types';

const STATUS_META: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  confirmed: { label: 'Confirmed', tone: 'info' },
  preparing: { label: 'Preparing', tone: 'warning' },
  ready: { label: 'Ready', tone: 'success' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled_free: { label: 'Cancelled (Refunded)', tone: 'neutral' },
  cancelled_late: { label: 'Cancelled (Late)', tone: 'danger' },
  no_show: { label: 'No show', tone: 'danger' },
};

const PAYMENT_META: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  paid: { label: 'Paid', tone: 'success' },
  refunded: { label: 'Refunded', tone: 'neutral' },
  forfeited: { label: 'Forfeited', tone: 'danger' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

