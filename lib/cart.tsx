'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import type { MenuItem } from '@/lib/types';

export interface CartEntry {
  item: MenuItem;
  quantity: number;
}

interface CartContextValue {
  items: CartEntry[];
  slotStart: string | null;
  tableId: string | null;
  totalItems: number;
  totalInr: number;
  maxPrepMinutes: number;
  addItem: (item: MenuItem) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  syncMenu: (latestItems: MenuItem[]) => void;
  setSlotStart: (slotStart: string | null) => void;
  setTableId: (tableId: string | null) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const MAX_PER_ITEM = 5;
const MAX_TOTAL_ITEMS = 10;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartEntry[]>([]);
  const [slotStart, setSlotStartState] = useState<string | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);

  const addItem = useCallback((item: MenuItem) => {
    if (!item.isAvailable || item.stockRemaining <= 0) {
      toast.error(`${item.name} is sold out.`);
      return;
    }

    setItems((prev) => {
      const total = prev.reduce((sum, entry) => sum + entry.quantity, 0);
      if (total >= MAX_TOTAL_ITEMS) {
        toast.error(`Maximum ${MAX_TOTAL_ITEMS} items per order.`);
        return prev;
      }

      const existing = prev.find((entry) => entry.item.id === item.id);
      if (!existing) {
        return [...prev, { item, quantity: 1 }];
      }

      const maxAllowed = Math.min(MAX_PER_ITEM, item.stockRemaining);
      if (existing.quantity >= maxAllowed) {
        toast.error(
          existing.quantity >= MAX_PER_ITEM
            ? `Maximum ${MAX_PER_ITEM} of any single item.`
            : `Only ${item.stockRemaining} left in stock.`
        );
        return prev;
      }

      return prev.map((entry) =>
        entry.item.id === item.id
          ? { item, quantity: entry.quantity + 1 }
          : entry
      );
    });
  }, []);

  const setQuantity = useCallback((menuItemId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((entry) => entry.item.id !== menuItemId);
      }

      const target = prev.find((entry) => entry.item.id === menuItemId);
      if (!target) return prev;

      const otherTotal = prev
        .filter((entry) => entry.item.id !== menuItemId)
        .reduce((sum, entry) => sum + entry.quantity, 0);

      const maxForItem = Math.min(MAX_PER_ITEM, target.item.stockRemaining);
      const maxByOrder = MAX_TOTAL_ITEMS - otherTotal;
      const clamped = Math.min(quantity, maxForItem, maxByOrder);

      if (clamped < quantity) {
        if (otherTotal + quantity > MAX_TOTAL_ITEMS) {
          toast.error(`Maximum ${MAX_TOTAL_ITEMS} items per order.`);
        } else if (quantity > MAX_PER_ITEM) {
          toast.error(`Maximum ${MAX_PER_ITEM} of any single item.`);
        } else {
          toast.error(`Only ${target.item.stockRemaining} left in stock.`);
        }
      }

      if (clamped <= 0) {
        return prev.filter((entry) => entry.item.id !== menuItemId);
      }

      return prev.map((entry) =>
        entry.item.id === menuItemId ? { ...entry, quantity: clamped } : entry
      );
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setItems((prev) => prev.filter((entry) => entry.item.id !== menuItemId));
  }, []);

  const syncMenu = useCallback((latestItems: MenuItem[]) => {
    const byId = new Map(latestItems.map((item) => [item.id, item]));
    setItems((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next: CartEntry[] = [];

      for (const entry of prev) {
        const fresh = byId.get(entry.item.id);
        if (!fresh || !fresh.isAvailable || fresh.stockRemaining <= 0) {
          changed = true;
          toast.warning(`${entry.item.name} is sold out and was removed from your cart.`);
          continue;
        }
        const maxAllowed = Math.min(MAX_PER_ITEM, fresh.stockRemaining);
        const nextQty = Math.min(entry.quantity, maxAllowed);
        if (nextQty !== entry.quantity) {
          changed = true;
          toast.warning(`Adjusted ${fresh.name} quantity to ${nextQty} (available stock).`);
        } else if (
          fresh.priceInr !== entry.item.priceInr ||
          fresh.stockRemaining !== entry.item.stockRemaining ||
          fresh.prepMinutes !== entry.item.prepMinutes
        ) {
          changed = true;
        }
        next.push({ item: fresh, quantity: nextQty });
      }

      return changed ? next : prev;
    });
  }, []);

  const setSlotStart = useCallback((nextSlot: string | null) => {
    setSlotStartState(nextSlot);
    setTableId(null);
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setSlotStartState(null);
    setTableId(null);
  }, []);

  const totalItems = useMemo(
    () => items.reduce((sum, entry) => sum + entry.quantity, 0),
    [items]
  );

  const totalInr = useMemo(
    () => items.reduce((sum, entry) => sum + entry.item.priceInr * entry.quantity, 0),
    [items]
  );

  const maxPrepMinutes = useMemo(
    () =>
      items.reduce(
        (max, entry) => Math.max(max, entry.item.prepMinutes),
        0
      ),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      slotStart,
      tableId,
      totalItems,
      totalInr,
      maxPrepMinutes,
      addItem,
      setQuantity,
      removeItem,
      syncMenu,
      setSlotStart,
      setTableId,
      clearCart,
    }),
    [
      items,
      slotStart,
      tableId,
      totalItems,
      totalInr,
      maxPrepMinutes,
      addItem,
      setQuantity,
      removeItem,
      syncMenu,
      setSlotStart,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}

