import { z } from 'zod';
import { ApiError, handle, ok, throwIfDb } from '@/lib/api-server';
import { requireRole } from '@/lib/auth';
import { fetchOrderById } from '@/lib/orders';
import { CUSTOMER_ROLES } from '@/lib/roles';
import { getNow } from '@/lib/settings';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const uuidSchema = z.string().uuid();

export const POST = handle<{ id: string }>(async (_req, ctx) => {
  const profile = await requireRole(CUSTOMER_ROLES);
  const parsedId = uuidSchema.safeParse(ctx.params.id);
  if (!parsedId.success) {
    throw new ApiError('NOT_FOUND');
  }

  const nowIso = await getNow();
  const admin = createAdminClient();
  const { data: result, error } = await admin.rpc('cancel_order', {
    p_order_id: parsedId.data,
    p_user_id: profile.id,
    p_now: nowIso,
  });
  throwIfDb(error);

  const outcomeData = result as {
    status?: string;
    payment_status?: string;
    refundInr?: number;
  } | null;

  const refundInr = Number(outcomeData?.refundInr ?? 0);
  const refunded = outcomeData?.payment_status === 'refunded';

  const order = await fetchOrderById(parsedId.data, profile.id);
  return ok({
    order,
    outcome: {
      refunded,
      refundInr,
    },
  });
});
