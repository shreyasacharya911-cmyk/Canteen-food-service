'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Clock, Minus, Plus, ShoppingBag } from 'lucide-react';
import { ApiClientError, fetcher } from '@/lib/api-client';
import { useCart } from '@/lib/cart';
import type { MenuItem } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { CheckoutFlow } from '@/components/customer/CheckoutFlow';

const CATEGORIES = ['All', 'Meals', 'Snacks', 'Beverages', 'Desserts'] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

export default function MenuPage() {
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { items: cartItems, totalItems, totalInr, addItem, setQuantity, syncMenu } = useCart();

  const { data, error, isLoading, mutate } = useSWR<{ items: MenuItem[] }>(
    '/api/customer/menu',
    fetcher,
    { refreshInterval: 10_000 }
  );

  useEffect(() => {
    if (data?.items) {
      syncMenu(data.items);
    }
  }, [data?.items, syncMenu]);

  const filteredItems = useMemo(() => {
    const list = data?.items ?? [];
    if (category === 'All') return list;
    return list.filter((item) => item.category === category);
  }, [data?.items, category]);

  const qtyByItemId = useMemo(
    () => new Map(cartItems.map((entry) => [entry.item.id, entry.quantity])),
    [cartItems]
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text">Today&apos;s Menu</h1>
        <p className="mt-1 text-sm text-muted">
          Pick your food, then choose a 30-minute slot and table.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`min-h-[44px] shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-text hover:bg-bg'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorBanner
          message={
            error instanceof ApiClientError ? error.message : "Couldn't load menu"
          }
          onRetry={() => void mutate()}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No items in this category"
          description="Try another category tab above."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const soldOut = !item.isAvailable || item.stockRemaining <= 0;
            const lowStock = !soldOut && item.stockRemaining <= 5;
            const qtyInCart = qtyByItemId.get(item.id) ?? 0;

            return (
              <Card
                key={item.id}
                className={`flex flex-col justify-between gap-4 p-4 ${
                  soldOut ? 'opacity-65' : ''
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-3xl" aria-hidden="true">
                      {item.emoji || '🍽️'}
                    </span>
                    {soldOut ? (
                      <Badge tone="neutral">Sold out</Badge>
                    ) : lowStock ? (
                      <Badge tone="warning">Only {item.stockRemaining} left</Badge>
                    ) : (
                      <Badge tone="success">Available</Badge>
                    )}
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-text">{item.name}</h2>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted">
                      <span className="font-bold text-text">₹{item.priceInr}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {item.prepMinutes} min
                      </span>
                    </div>
                  </div>
                </div>

                {qtyInCart === 0 ? (
                  <Button
                    fullWidth
                    disabled={soldOut}
                    onClick={() => addItem(item)}
                  >
                    {soldOut ? 'Sold out' : 'Add to cart'}
                  </Button>
                ) : (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, qtyInCart - 1)}
                      aria-label={`Remove one ${item.name}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-surface text-text shadow-sm hover:bg-bg"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="text-sm font-bold text-text">{qtyInCart} in cart</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, qtyInCart + 1)}
                      aria-label={`Add one more ${item.name}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {totalItems > 0 && (
        <div className="sticky bottom-16 z-20 md:bottom-4">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-text">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'} · ₹{totalInr}
                </p>
                <p className="text-xs text-muted">Ready to pick slot &amp; table</p>
              </div>
            </div>
            <Button onClick={() => setCheckoutOpen(true)}>Checkout</Button>
          </div>
        </div>
      )}

      <CheckoutFlow
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onRefreshMenu={() => void mutate()}
      />
    </div>
  );
}

