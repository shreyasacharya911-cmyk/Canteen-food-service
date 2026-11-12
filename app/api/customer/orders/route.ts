import { handle, ok, parseJson, throwIfDb } from '@/lib/api-server';
import { requireRole } from '@/lib/auth';
import { fetchCustomerOrders, fetchOrderById } from '@/lib/orders';
import { CUSTOMER_ROLES } from '@/lib/roles';
import { placeOrderSchema } from '@/lib/schemas';
import { getNow } from '@/lib/settings';
import { createAdminClient } from '@/lib/supabase/admin';
import { toIso } from '@/lib/time';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  const profile = await requireRole(CUSTOMER_ROLES);
  const orders = await fetchCustomerOrders(profile.id);
  return ok({ orders });
});

export const POST = handle(async (req) => {
  const profile = await requireRole(CUSTOMER_ROLES);
  const body = await parseJson(req, placeOrderSchema);
  const nowIso = await getNow();

  const admin = createAdminClient();
  const { data: orderId, error } = await admin.rpc('place_order', {
    p_user_id: profile.id,
    p_table_id: body.tableId,
    p_slot_start: toIso(body.slotStart),
    p_items: body.items,
    p_idempotency_key: body.idempotencyKey,
    p_now: nowIso,
  });
  throwIfDb(error);

  const order = await fetchOrderById(orderId as string, profile.id);
  return ok({ order }, 201);
});
