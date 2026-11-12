'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, Clock, Loader2, Minus, Plus, Trash2, Users } from 'lucide-react';
import { ApiClientError, fetcher, postJson } from '@/lib/api-client';
import { useCart } from '@/lib/cart';
import { computeCutoff, formatIst } from '@/lib/time';
import type { Order, Slot, SlotState, TableAvailability } from '@/lib/types';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

type Step = 1 | 2 | 3 | 4;

const SLOT_STATE_LABEL: Record<SlotState, { text: string; tone: BadgeTone }> = {
  bookable: { text: 'Available', tone: 'success' },
  too_soon: { text: 'Too soon', tone: 'warning' },
  full_tables: { text: 'Full', tone: 'neutral' },
  full_kitchen: { text: 'Kitchen full', tone: 'warning' },
  passed: { text: 'Passed', tone: 'neutral' },
};

export function CheckoutFlow({
  open,
  onClose,
  onRefreshMenu,
}: {
  open: boolean;
  onClose: () => void;
  onRefreshMenu: () => void;
}) {
  const router = useRouter();
  const {
    items,
    slotStart,
    tableId,
    totalItems,
    totalInr,
    maxPrepMinutes,
    setQuantity,
    removeItem,
    setSlotStart,
    setTableId,
    clearCart,
  } = useCart();

  const [step, setStep] = useState<Step>(1);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const attemptSignature = useMemo(
    () =>
      JSON.stringify({
        items: items.map((e) => [e.item.id, e.quantity]),
        slotStart,
        tableId,
      }),
    [items, slotStart, tableId]
  );

  const idempotencyRef = useRef<{ sig: string; key: string } | null>(null);
  function getIdempotencyKey(): string {
    if (!idempotencyRef.current || idempotencyRef.current.sig !== attemptSignature) {
      idempotencyRef.current = {
        sig: attemptSignature,
        key: crypto.randomUUID(),
      };
    }
    return idempotencyRef.current.key;
  }

  useEffect(() => {
    if (open && items.length === 0) {
      setStep(1);
    }
  }, [open, items.length]);

  const slotsKey =
    open && step >= 2 && totalItems > 0
      ? `/api/customer/slots?maxPrep=${Math.max(1, maxPrepMinutes)}&qty=${totalItems}`
      : null;

  const {
    data: slotsData,
    error: slotsError,
    isLoading: slotsLoading,
    mutate: mutateSlots,
  } = useSWR<{ now: string; slots: Slot[] }>(slotsKey, fetcher, {
    refreshInterval: 10_000,
  });

  const tablesKey =
    open && step >= 3 && slotStart
      ? `/api/customer/tables?slotStart=${encodeURIComponent(slotStart)}`
      : null;

  const {
    data: tablesData,
    error: tablesError,
    isLoading: tablesLoading,
    mutate: mutateTables,
  } = useSWR<{ tables: TableAvailability[] }>(tablesKey, fetcher, {
    refreshInterval: 10_000,
  });

  const selectedTable = useMemo(
    () => tablesData?.tables.find((t) => t.id === tableId) ?? null,
    [tablesData?.tables, tableId]
  );

  const cutoffPreview = useMemo(() => {
    if (!slotStart) return null;
    return computeCutoff(slotStart, Math.max(1, maxPrepMinutes));
  }, [slotStart, maxPrepMinutes]);

  async function handlePay() {
    if (!slotStart || !tableId || items.length === 0) return;
    setPayError(null);
    setPayModalOpen(true);
    setPaying(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const res = await postJson<{ order: Order }>('/api/customer/orders', {
        slotStart,
        tableId,
        items: items.map((entry) => ({
          menuItemId: entry.item.id,
          quantity: entry.quantity,
        })),
        idempotencyKey: getIdempotencyKey(),
      });

      clearCart();
      setPayModalOpen(false);
      onClose();
      toast.success('Order confirmed!');
      router.push(`/orders/${res.order.id}`);
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : 'INTERNAL';
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Could not place order. Please try again.';

      toast.error(message);

      if (code === 'TABLE_TAKEN') {
        setPayModalOpen(false);
        setTableId(null);
        setStep(3);
        void mutateTables();
      } else if (
        code === 'SLOT_TOO_SOON' ||
        code === 'KITCHEN_FULL' ||
        code === 'INVALID_SLOT'
      ) {
        setPayModalOpen(false);
        setSlotStart(null);
        setStep(2);
        void mutateSlots();
      } else if (code === 'ITEM_UNAVAILABLE') {
        setPayModalOpen(false);
        setStep(1);
        onRefreshMenu();
      } else {
        setPayError(message);
      }
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={paying ? undefined : onClose}
        closeDisabled={paying}
        title="Checkout"
      >
        <div className="mb-4 grid grid-cols-4 gap-1.5 text-center text-xs font-semibold">
          {(['1. Items', '2. Slot', '3. Table', '4. Review'] as const).map((label, idx) => {
            const s = (idx + 1) as Step;
            const active = step === s;
            const done = step > s;
            return (
              <div
                key={label}
                className={`rounded-lg border px-2 py-1.5 ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : done
                      ? 'border-success/30 bg-success/10 text-success'
                      : 'border-border bg-bg text-muted'
                }`}
              >
                {label}
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            {items.length === 0 ? (
              <EmptyState
                title="Your cart is empty"
                description="Add items from the menu to start an order."
                action={
                  <Button variant="secondary" onClick={onClose}>
                    Browse menu
                  </Button>
                }
              />
            ) : (
              <>
                <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                  {items.map((entry) => (
                    <div
                      key={entry.item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg/60 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-text">
                          {entry.item.emoji} {entry.item.name}
                        </p>
                        <p className="text-xs text-muted">
                          ₹{entry.item.priceInr} each · {entry.item.prepMinutes} min prep
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQuantity(entry.item.id, entry.quantity - 1)}
                          aria-label={`Decrease ${entry.item.name}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-text hover:bg-bg"
                        >
                          <Minus className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold">
                          {entry.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(entry.item.id, entry.quantity + 1)}
                          aria-label={`Increase ${entry.item.name}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-text hover:bg-bg"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(entry.item.id)}
                          aria-label={`Remove ${entry.item.name}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted">
                    {totalItems} items · max {maxPrepMinutes} min prep
                  </span>
                  <span className="text-lg font-bold text-text">₹{totalInr}</span>
                </div>

                <Button fullWidth onClick={() => setStep(2)}>
                  Choose 30-minute slot
                </Button>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {slotsLoading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : slotsError ? (
              <ErrorBanner
                message={
                  slotsError instanceof ApiClientError
                    ? slotsError.message
                    : "Couldn't load slots"
                }
                onRetry={() => void mutateSlots()}
              />
            ) : !slotsData || slotsData.slots.length === 0 ? (
              <EmptyState title="No slots left today" />
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {slotsData.slots.map((slot) => {
                  const disabled = slot.state !== 'bookable';
                  const selected = slotStart === slot.slotStart;
                  const meta = SLOT_STATE_LABEL[slot.state];

                  return (
                    <button
                      key={slot.slotStart}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSlotStart(slot.slotStart)}
                      className={`flex min-h-[56px] w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                        selected
                          ? 'border-primary bg-primary/10'
                          : disabled
                            ? 'cursor-not-allowed border-border bg-bg/50 opacity-60'
                            : 'border-border bg-surface hover:border-primary/60'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-text">
                          {formatIst(slot.slotStart, 'time')}
                        </p>
                        <p className="text-xs text-muted">
                          {slot.freeTables} free tables · {slot.kitchenRemaining} kitchen left
                        </p>
                      </div>
                      <Badge tone={meta.tone}>{meta.text}</Badge>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                fullWidth
                disabled={!slotStart}
                onClick={() => setStep(3)}
              >
                Pick a table
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {tablesLoading ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : tablesError ? (
              <ErrorBanner
                message={
                  tablesError instanceof ApiClientError
                    ? tablesError.message
                    : "Couldn't load tables"
                }
                onRetry={() => void mutateTables()}
              />
            ) : !tablesData || tablesData.tables.every((t) => !t.isFree) ? (
              <EmptyState
                title="No free tables"
                description="All tables are taken for this slot."
                action={
                  <Button variant="secondary" onClick={() => setStep(2)}>
                    Pick another slot
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {tablesData.tables.map((table) => {
                  const selected = tableId === table.id;
                  return (
                    <button
                      key={table.id}
                      type="button"
                      disabled={!table.isFree}
                      onClick={() => setTableId(table.id)}
                      className={`flex min-h-[68px] flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors ${
                        selected
                          ? 'border-primary bg-primary/10'
                          : !table.isFree
                            ? 'cursor-not-allowed border-border bg-bg/50 opacity-60'
                            : 'border-border bg-surface hover:border-primary/60'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-bold text-text">{table.label}</span>
                        <Badge tone={table.isFree ? 'success' : 'neutral'}>
                          {table.isFree ? 'Free' : 'Taken'}
                        </Badge>
                      </div>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        {table.seats} seats
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                fullWidth
                disabled={!tableId}
                onClick={() => setStep(4)}
              >
                Review order
              </Button>
            </div>
          </div>
        )}

        {step === 4 && slotStart && tableId && (
          <div className="space-y-4">
            <Card className="space-y-3 bg-bg/50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Ready by</span>
                <span className="font-semibold text-text">
                  {formatIst(slotStart, 'time')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Table</span>
                <span className="font-semibold text-text">
                  {selectedTable ? `${selectedTable.label} (${selectedTable.seats} seats)` : 'Selected'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Items ({totalItems})</span>
                <span className="font-bold text-text">₹{totalInr}</span>
              </div>
              {cutoffPreview && (
                <div className="flex items-center gap-2 rounded-lg border border-info/25 bg-info/10 px-3 py-2 text-xs font-medium text-info">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    Free cancellation until {formatIst(cutoffPreview, 'time')}
                  </span>
                </div>
              )}
            </Card>

            <p className="text-center text-xs text-muted">
              Test payment: no money is charged
            </p>

            <div className="flex gap-2">
              <Button variant="secondary" disabled={paying} onClick={() => setStep(3)}>
                Back
              </Button>
              <Button fullWidth loading={paying} onClick={handlePay}>
                Pay ₹{totalInr}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={payModalOpen}
        onClose={paying ? undefined : () => setPayModalOpen(false)}
        closeDisabled={paying}
        title="Processing test payment"
      >
        {paying ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
            <p className="font-semibold text-text">Confirming order and reserving table…</p>
            <p className="text-xs text-muted">Test payment: no money is charged</p>
          </div>
        ) : payError ? (
          <div className="space-y-4">
            <ErrorBanner message={payError} />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setPayModalOpen(false)}
              >
                Close
              </Button>
              <Button fullWidth onClick={handlePay}>
                Retry Pay ₹{totalInr}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Check className="h-8 w-8 text-success" aria-hidden="true" />
            <p className="font-semibold text-text">Confirmed</p>
          </div>
        )}
      </Modal>
    </>
  );
}

