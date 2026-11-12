import crypto from 'crypto';
import { getDb, saveDb, type MockData } from './mock-db';

type TableName = keyof MockData;

export class MockQueryBuilder {
  private tableName: TableName;
  private selectedFields: string[] | null = null;
  private isHead = false;
  private filters: Array<(row: Record<string, unknown>) => boolean> = [];
  private sorts: Array<{ col: string; ascending: boolean }> = [];
  private upsertPayload: Record<string, unknown> | null = null;
  private updatePayload: Record<string, unknown> | null = null;
  private insertPayload: Record<string, unknown> | Array<Record<string, unknown>> | null = null;

  constructor(tableName: TableName) {
    this.tableName = tableName;
  }

  select(fields?: string, options?: { count?: string; head?: boolean }) {
    if (fields && fields !== '*') {
      this.selectedFields = fields.split(',').map((f) => f.trim());
    }
    if (options?.head) {
      this.isHead = true;
    }
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push((row) => row[col] === val);
    return this;
  }

  in(col: string, vals: unknown[]) {
    this.filters.push((row) => vals.includes(row[col]));
    return this;
  }

  gte(col: string, val: string | number) {
    this.filters.push((row) => {
      const v = row[col];
      if (typeof v === 'string' && typeof val === 'string') return v >= val;
      if (typeof v === 'number' && typeof val === 'number') return v >= val;
      return false;
    });
    return this;
  }

  lt(col: string, val: string | number) {
    this.filters.push((row) => {
      const v = row[col];
      if (typeof v === 'string' && typeof val === 'string') return v < val;
      if (typeof v === 'number' && typeof val === 'number') return v < val;
      return false;
    });
    return this;
  }

  order(col: string, { ascending = true }: { ascending?: boolean } = {}) {
    this.sorts.push({ col, ascending });
    return this;
  }

  upsert(payload: Record<string, unknown>, _options?: { onConflict?: string }) {
    this.upsertPayload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.updatePayload = payload;
    return this;
  }

  insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    this.insertPayload = payload;
    return this;
  }

  private execute(): { data: unknown; count: number | null; error: { message: string } | null } {
    const db = getDb();
    const table = (db[this.tableName] as unknown as Array<Record<string, unknown>>) ?? [];

    if (this.upsertPayload) {
      const p = this.upsertPayload;
      const id = p.id;
      const email = p.email;
      const idx = table.findIndex(
        (r) => (id && r.id === id) || (email && r.email === email)
      );
      if (idx >= 0) {
        table[idx] = { ...table[idx], ...p };
        saveDb(db);
        return { data: table[idx], count: 1, error: null };
      } else {
        const newRow = { id: id ?? crypto.randomUUID(), ...p };
        table.push(newRow);
        saveDb(db);
        return { data: newRow, count: 1, error: null };
      }
    }

    if (this.insertPayload) {
      const items = Array.isArray(this.insertPayload) ? this.insertPayload : [this.insertPayload];
      const inserted: Array<Record<string, unknown>> = [];
      for (const item of items) {
        const row = { id: item.id ?? crypto.randomUUID(), ...item };
        table.push(row);
        inserted.push(row);
      }
      saveDb(db);
      return {
        data: Array.isArray(this.insertPayload) ? inserted : inserted[0],
        count: inserted.length,
        error: null,
      };
    }

    if (this.updatePayload) {
      let updatedCount = 0;
      let lastUpdated: Record<string, unknown> | null = null;
      for (let i = 0; i < table.length; i++) {
        const row = table[i];
        if (this.filters.every((f) => f(row))) {
          table[i] = { ...row, ...this.updatePayload };
          lastUpdated = table[i];
          updatedCount++;
        }
      }
      saveDb(db);
      return { data: lastUpdated, count: updatedCount, error: null };
    }

    // SELECT
    let rows = table.filter((row) => this.filters.every((f) => f(row)));
    const totalCount = rows.length;

    for (const sort of this.sorts) {
      rows.sort((a, b) => {
        const valA = a[sort.col];
        const valB = b[sort.col];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sort.ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sort.ascending
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      });
    }

    if (this.isHead) {
      return { data: null, count: totalCount, error: null };
    }

    if (this.selectedFields && this.selectedFields.length > 0) {
      rows = rows.map((r) => {
        const mapped: Record<string, unknown> = {};
        for (const f of this.selectedFields!) {
          mapped[f] = r[f];
        }
        return mapped;
      });
    }

    return { data: rows, count: totalCount, error: null };
  }

  async single() {
    const res = this.execute();
    if (res.error) return { data: null, error: res.error };
    const arr = Array.isArray(res.data) ? res.data : [res.data];
    if (!arr.length || arr[0] === null || arr[0] === undefined) {
      return { data: null, error: { message: 'Row not found' } };
    }
    return { data: arr[0], error: null };
  }

  async maybeSingle() {
    const res = this.execute();
    if (res.error) return { data: null, error: res.error };
    const arr = Array.isArray(res.data) ? res.data : [res.data];
    return { data: arr[0] ?? null, error: null };
  }

  // Promise interface
  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; count: number | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    try {
      const res = this.execute();
      return Promise.resolve(onfulfilled ? onfulfilled(res) : (res as unknown as TResult1));
    } catch (err) {
      return Promise.reject(onrejected ? onrejected(err) : err);
    }
  }
}

export function mockRpc(fnName: string, args: Record<string, unknown>) {
  const db = getDb();

  if (fnName === 'place_order') {
    const { p_user_id, p_table_id, p_slot_start, p_items, p_idempotency_key, p_now } = args as {
      p_user_id: string;
      p_table_id: string;
      p_slot_start: string;
      p_items: Array<{ menuItemId?: string; menu_item_id?: string; quantity: number }> | string;
      p_idempotency_key: string;
      p_now: string;
    };

    // 1. Idempotency check
    const existing = db.orders.find((o) => o.idempotency_key === p_idempotency_key);
    if (existing) {
      return { data: existing.id, error: null };
    }

    // 2. Parse items
    const parsedItems = (typeof p_items === 'string' ? JSON.parse(p_items) : p_items) as Array<{
      menuItemId?: string;
      menu_item_id?: string;
      quantity: number;
    }>;

    let totalItems = 0;
    let totalInr = 0;
    let maxPrep = 0;

    const lockedMenuItems: Array<{
      menuItem: (typeof db.menu_items)[0];
      quantity: number;
    }> = [];

    for (const item of parsedItems) {
      const mId = item.menuItemId || item.menu_item_id;
      const m = db.menu_items.find((x) => x.id === mId);
      if (!m || !m.is_available || m.stock_remaining < item.quantity) {
        return { data: null, error: { message: 'ITEM_UNAVAILABLE' } };
      }
      if (item.quantity < 1 || item.quantity > 5) {
        return { data: null, error: { message: 'VALIDATION_ERROR' } };
      }
      totalItems += item.quantity;
      totalInr += m.price_inr * item.quantity;
      if (m.prep_minutes > maxPrep) maxPrep = m.prep_minutes;
      lockedMenuItems.push({ menuItem: m, quantity: item.quantity });
    }

    if (totalItems > 10) {
      return { data: null, error: { message: 'VALIDATION_ERROR' } };
    }

    // Timing
    const slotStartMs = new Date(p_slot_start).getTime();
    const startByMs = slotStartMs - maxPrep * 60_000;
    const nowMs = new Date(p_now).getTime();

    if (nowMs >= startByMs) {
      return { data: null, error: { message: 'SLOT_TOO_SOON' } };
    }

    const cancelCutoffMs = slotStartMs - Math.max(10, maxPrep) * 60_000;
    const startBy = new Date(startByMs).toISOString();
    const cancelCutoff = new Date(cancelCutoffMs).toISOString();

    // Capacity checks
    const activeOrdersInSlot = db.orders.filter(
      (o) =>
        o.slot_start === p_slot_start &&
        ['confirmed', 'preparing', 'ready', 'completed'].includes(o.status)
    );

    const slotItemsSum = activeOrdersInSlot.reduce((acc, o) => acc + o.total_items, 0);
    if (slotItemsSum + totalItems > 20) {
      return { data: null, error: { message: 'KITCHEN_FULL' } };
    }

    if (activeOrdersInSlot.some((o) => o.table_id === p_table_id)) {
      return { data: null, error: { message: 'TABLE_TAKEN' } };
    }

    if (activeOrdersInSlot.some((o) => o.user_id === p_user_id)) {
      return { data: null, error: { message: 'ALREADY_BOOKED_SLOT' } };
    }

    // Decrement stock
    for (const { menuItem, quantity } of lockedMenuItems) {
      menuItem.stock_remaining -= quantity;
    }

    // Create order
    const orderId = crypto.randomUUID();
    db.orders.push({
      id: orderId,
      user_id: p_user_id,
      table_id: p_table_id,
      slot_start: p_slot_start,
      status: 'confirmed',
      payment_status: 'paid',
      total_inr: totalInr,
      total_items: totalItems,
      max_prep_minutes: maxPrep,
      start_by: startBy,
      cancel_cutoff: cancelCutoff,
      idempotency_key: p_idempotency_key,
      cancelled_at: null,
      created_at: p_now,
      updated_at: p_now,
    });

    for (const { menuItem, quantity } of lockedMenuItems) {
      db.order_items.push({
        id: crypto.randomUUID(),
        order_id: orderId,
        menu_item_id: menuItem.id,
        name: menuItem.name,
        unit_price_inr: menuItem.price_inr,
        prep_minutes: menuItem.prep_minutes,
        quantity,
      });
    }

    saveDb(db);
    return { data: orderId, error: null };
  }

  if (fnName === 'cancel_order') {
    const { p_order_id, p_user_id, p_now } = args as {
      p_order_id: string;
      p_user_id: string;
      p_now: string;
    };

    const order = db.orders.find((o) => o.id === p_order_id && o.user_id === p_user_id);
    if (!order) {
      return { data: null, error: { message: 'NOT_FOUND' } };
    }

    const nowMs = new Date(p_now).getTime();
    const slotStartMs = new Date(order.slot_start).getTime();
    const cancelCutoffMs = new Date(order.cancel_cutoff).getTime();

    if (order.status !== 'confirmed' || nowMs >= slotStartMs) {
      return { data: null, error: { message: 'CANNOT_CANCEL' } };
    }

    const willRefund = nowMs <= cancelCutoffMs;
    order.status = willRefund ? 'cancelled_free' : 'cancelled_late';
    order.payment_status = willRefund ? 'refunded' : 'forfeited';
    order.cancelled_at = p_now;
    order.updated_at = p_now;

    // Restore stock
    const items = db.order_items.filter((oi) => oi.order_id === order.id);
    for (const item of items) {
      const mi = db.menu_items.find((m) => m.id === item.menu_item_id);
      if (mi) {
        mi.stock_remaining += item.quantity;
      }
    }

    saveDb(db);
    return {
      data: {
        status: order.status,
        payment_status: order.payment_status,
        refundInr: willRefund ? order.total_inr : 0,
      },
      error: null,
    };
  }

  return { data: null, error: { message: `Unknown RPC function ${fnName}` } };
}

