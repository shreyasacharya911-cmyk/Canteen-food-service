import 'server-only';
import { ApiError, throwIfDb } from './api-server';
import type { OrderItemRow, OrderRow, ProfileRow, TableRow } from './db';
import { getNow } from './settings';
import { createAdminClient } from './supabase/admin';
import { toIso } from './time';
import type { Order, OrderStatus, StaffOrder } from './types';

function mapOrderRow(
  row: OrderRow,
  table: TableRow,
  items: OrderItemRow[],
  nowIso: string
): Order {
  const slotStart = toIso(row.slot_start);
  const startBy = toIso(row.start_by);
  const cancelCutoff = toIso(row.cancel_cutoff);
  const createdAt = toIso(row.created_at);

  return {
    id: row.id,
    shortCode: row.id.slice(-4).toUpperCase(),
    slotStart,
    startBy,
    cancelCutoff,
    status: row.status,
    paymentStatus: row.payment_status,
    totalInr: row.total_inr,
    totalItems: row.total_items,
    table: { id: table.id, label: table.label, seats: table.seats },
    items: items.map((item) => ({
      menuItemId: item.menu_item_id,
      name: item.name,
      unitPriceInr: item.unit_price_inr,
      prepMinutes: item.prep_minutes,
      quantity: item.quantity,
    })),
    canCancel: row.status === 'confirmed' && nowIso < slotStart,
    willRefund: nowIso <= cancelCutoff,
    createdAt,
  };
}

export async function fetchOrderById(orderId: string, userId: string): Promise<Order> {
  const admin = createAdminClient();
  const { data: orderData, error: orderErr } = await admin
    .from('orders')
    .select(
      'id,user_id,table_id,slot_start,status,payment_status,total_inr,total_items,max_prep_minutes,start_by,cancel_cutoff,idempotency_key,cancelled_at,created_at,updated_at'
    )
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle();
  throwIfDb(orderErr);

  if (!orderData) {
    throw new ApiError('NOT_FOUND');
  }

  const row = orderData as OrderRow;
  const [{ data: tableData, error: tableErr }, { data: itemRows, error: itemErr }, nowIso] =
    await Promise.all([
      admin.from('canteen_tables').select('id,label,seats').eq('id', row.table_id).single(),
      admin
        .from('order_items')
        .select('id,order_id,menu_item_id,name,unit_price_inr,prep_minutes,quantity')
        .eq('order_id', row.id),
      getNow(),
    ]);
  throwIfDb(tableErr);
  throwIfDb(itemErr);

  return mapOrderRow(
    row,
    tableData as TableRow,
    (itemRows ?? []) as OrderItemRow[],
    nowIso
  );
}

export async function fetchCustomerOrders(userId: string): Promise<Order[]> {
  const admin = createAdminClient();
  const [{ data: orderRows, error: orderErr }, { data: tableRows, error: tableErr }, nowIso] =
    await Promise.all([
      admin
        .from('orders')
        .select(
          'id,user_id,table_id,slot_start,status,payment_status,total_inr,total_items,max_prep_minutes,start_by,cancel_cutoff,idempotency_key,cancelled_at,created_at,updated_at'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      admin.from('canteen_tables').select('id,label,seats'),
      getNow(),
    ]);
  throwIfDb(orderErr);
  throwIfDb(tableErr);

  const orders = (orderRows ?? []) as OrderRow[];
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: allItems, error: itemsErr } = await admin
    .from('order_items')
    .select('id,order_id,menu_item_id,name,unit_price_inr,prep_minutes,quantity')
    .in('order_id', orderIds);
  throwIfDb(itemsErr);

  const tableMap = new Map<string, TableRow>(
    ((tableRows ?? []) as TableRow[]).map((t) => [t.id, t])
  );
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of (allItems ?? []) as OrderItemRow[]) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return orders.map((row) => {
    const table = tableMap.get(row.table_id) ?? { id: row.table_id, label: 'T?', seats: 2 };
    return mapOrderRow(row, table, itemsByOrder.get(row.id) ?? [], nowIso);
  });
}

export async function fetchStaffOrders(options: {
  statuses?: OrderStatus[];
  startIso?: string;
  endIso?: string;
  sortBy?: 'start_by' | 'created_at';
  ascending?: boolean;
}): Promise<StaffOrder[]> {
  const admin = createAdminClient();
  let query = admin
    .from('orders')
    .select(
      'id,user_id,table_id,slot_start,status,payment_status,total_inr,total_items,max_prep_minutes,start_by,cancel_cutoff,idempotency_key,cancelled_at,created_at,updated_at'
    );

  if (options.startIso) {
    query = query.gte('slot_start', options.startIso);
  }
  if (options.endIso) {
    query = query.lt('slot_start', options.endIso);
  }
  if (options.statuses && options.statuses.length > 0) {
    query = query.in('status', options.statuses);
  }

  const sortCol = options.sortBy ?? 'start_by';
  const asc = options.ascending ?? true;
  query = query.order(sortCol, { ascending: asc });

  const [{ data: orderRows, error: orderErr }, { data: tableRows, error: tableErr }, nowIso] =
    await Promise.all([
      query,
      admin.from('canteen_tables').select('id,label,seats'),
      getNow(),
    ]);
  throwIfDb(orderErr);
  throwIfDb(tableErr);

  const orders = (orderRows ?? []) as OrderRow[];
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const userIds = Array.from(new Set(orders.map((o) => o.user_id)));

  const [{ data: allItems, error: itemsErr }, { data: profileRows, error: profErr }] =
    await Promise.all([
      admin
        .from('order_items')
        .select('id,order_id,menu_item_id,name,unit_price_inr,prep_minutes,quantity')
        .in('order_id', orderIds),
      admin.from('profiles').select('id,email,full_name,role').in('id', userIds),
    ]);
  throwIfDb(itemsErr);
  throwIfDb(profErr);

  const tableMap = new Map<string, TableRow>(
    ((tableRows ?? []) as TableRow[]).map((t) => [t.id, t])
  );
  const profileMap = new Map<string, ProfileRow>(
    ((profileRows ?? []) as ProfileRow[]).map((p) => [p.id, p])
  );
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of (allItems ?? []) as OrderItemRow[]) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return orders.map((row) => {
    const table = tableMap.get(row.table_id) ?? { id: row.table_id, label: 'T?', seats: 2 };
    const base = mapOrderRow(row, table, itemsByOrder.get(row.id) ?? [], nowIso);
    const prof = profileMap.get(row.user_id);
    return {
      ...base,
      customerName: prof?.full_name ?? prof?.email ?? 'Customer',
      isOverdue: row.status === 'confirmed' && nowIso >= base.startBy,
    };
  });
}
