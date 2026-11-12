import { z } from 'zod';
import { ApiError, handle, ok, parseJson, throwIfDb } from '@/lib/api-server';
import { requireRole } from '@/lib/auth';
import type { OrderItemRow, OrderRow, ProfileRow, TableRow } from '@/lib/db';
import { KITCHEN_ROLES } from '@/lib/roles';
import { statusUpdateSchema } from '@/lib/schemas';
import { getNow } from '@/lib/settings';
import { createAdminClient } from '@/lib/supabase/admin';
import { toIso } from '@/lib/time';
import type { OrderStatus, StaffOrder } from '@/lib/types';

export const dynamic = 'force-dynamic';

const uuidSchema = z.string().uuid();

const PREV_STATUS: Record<'preparing' | 'ready' | 'completed', OrderStatus> = {
  preparing: 'confirmed',
  ready: 'preparing',
  completed: 'ready',
};

export const PATCH = handle<{ id: string }>(async (req, ctx) => {
  await requireRole(KITCHEN_ROLES);
  const parsedId = uuidSchema.safeParse(ctx.params.id);
  if (!parsedId.success) {
    throw new ApiError('NOT_FOUND');
  }

  const body = await parseJson(req, statusUpdateSchema);
  const expectedPrev = PREV_STATUS[body.status];
  const nowIso = await getNow();
  const admin = createAdminClient();

  const { data: updated, error: updErr } = await admin
    .from('orders')
    .update({ status: body.status, updated_at: nowIso })
    .eq('id', parsedId.data)
    .eq('status', expectedPrev)
    .select(
      'id,user_id,table_id,slot_start,status,payment_status,total_inr,total_items,max_prep_minutes,start_by,cancel_cutoff,idempotency_key,cancelled_at,created_at,updated_at'
    )
    .maybeSingle();
  throwIfDb(updErr);

  if (!updated) {
    const { data: existing, error: existErr } = await admin
      .from('orders')
      .select('id')
      .eq('id', parsedId.data)
      .maybeSingle();
    throwIfDb(existErr);
    if (!existing) {
      throw new ApiError('NOT_FOUND');
    }
    throw new ApiError('INVALID_TRANSITION');
  }

  const row = updated as OrderRow;
  const [
    { data: tableData, error: tableErr },
    { data: itemRows, error: itemErr },
    { data: profData, error: profErr },
  ] = await Promise.all([
    admin.from('canteen_tables').select('id,label,seats').eq('id', row.table_id).single(),
    admin
      .from('order_items')
      .select('id,order_id,menu_item_id,name,unit_price_inr,prep_minutes,quantity')
      .eq('order_id', row.id),
    admin.from('profiles').select('id,email,full_name,role').eq('id', row.user_id).maybeSingle(),
  ]);
  throwIfDb(tableErr);
  throwIfDb(itemErr);
  throwIfDb(profErr);

  const table = tableData as TableRow;
  const prof = profData as ProfileRow | null;
  const slotStart = toIso(row.slot_start);
  const startBy = toIso(row.start_by);
  const cancelCutoff = toIso(row.cancel_cutoff);

  const order: StaffOrder = {
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
    createdAt: toIso(row.created_at),
    customerName: prof?.full_name ?? prof?.email ?? 'Customer',
    isOverdue: row.status === 'confirmed' && nowIso >= startBy,
  };

  return ok({ order });
});
