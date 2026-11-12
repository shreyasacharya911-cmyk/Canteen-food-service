import { z } from 'zod';
import { ApiError, handle, ok, throwIfDb } from '@/lib/api-server';
import { requireRole } from '@/lib/auth';
import type { OrderItemRow, OrderRow, TableRow } from '@/lib/db';
import { CUSTOMER_ROLES } from '@/lib/roles';
import { getNow } from '@/lib/settings';
import { createAdminClient } from '@/lib/supabase/admin';
import { toIso } from '@/lib/time';
import type { Order } from '@/lib/types';

export const dynamic = 'force-dynamic';

const uuidSchema = z.string().uuid();

export const GET = handle<{ id: string }>(async (_req, ctx) => {
  const profile = await requireRole(CUSTOMER_ROLES);
  const parsedId = uuidSchema.safeParse(ctx.params.id);
  if (!parsedId.success) {
    throw new ApiError('NOT_FOUND');
  }

  const admin = createAdminClient();
  const { data: orderData, error: orderErr } = await admin
    .from('orders')
    .select(
      'id,user_id,table_id,slot_start,status,payment_status,total_inr,total_items,max_prep_minutes,start_by,cancel_cutoff,idempotency_key,cancelled_at,created_at,updated_at'
    )
    .eq('id', parsedId.data)
    .eq('user_id', profile.id)
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

  const table = tableData as TableRow;
  const slotStart = toIso(row.slot_start);
  const startBy = toIso(row.start_by);
  const cancelCutoff = toIso(row.cancel_cutoff);
  const createdAt = toIso(row.created_at);

  const order: Order = {
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
    items: ((itemRows ?? []) as OrderItemRow[]).map((item) => ({
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

  return ok({ order });
});
