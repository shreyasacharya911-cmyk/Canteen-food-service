import { handle, ok } from '@/lib/api-server';
import { requireRole } from '@/lib/auth';
import { QUEUE_STATUSES } from '@/lib/db';
import { fetchStaffOrders } from '@/lib/orders';
import { KITCHEN_ROLES } from '@/lib/roles';
import { getNow } from '@/lib/settings';
import { istDayRange } from '@/lib/time';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  await requireRole(KITCHEN_ROLES);
  const nowIso = await getNow();
  const { startIso, endIso } = istDayRange(nowIso);
  const orders = await fetchStaffOrders({
    statuses: QUEUE_STATUSES,
    startIso,
    endIso,
    sortBy: 'start_by',
    ascending: true,
  });
  return ok({ orders });
});
