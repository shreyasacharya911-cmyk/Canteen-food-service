import { ApiError, handle, ok, parseQuery, throwIfDb } from '@/lib/api-server';
import { requireRole } from '@/lib/auth';
import { ACTIVE_STATUSES, type TableRow } from '@/lib/db';
import { CUSTOMER_ROLES } from '@/lib/roles';
import { tablesQuerySchema } from '@/lib/schemas';
import { getNowAndSettings } from '@/lib/settings';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateSlots, toIso } from '@/lib/time';
import type { TableAvailability } from '@/lib/types';

export const dynamic = 'force-dynamic';

function tableSortNum(label: string): number {
  const num = Number(label.replace(/\D+/g, ''));
  return Number.isFinite(num) && num > 0 ? num : Number.MAX_SAFE_INTEGER;
}

export const GET = handle(async (req) => {
  await requireRole(CUSTOMER_ROLES);
  const { slotStart: rawSlotStart } = parseQuery(req, tablesQuerySchema);
  const slotStart = toIso(rawSlotStart);

  const { nowIso, settings } = await getNowAndSettings();
  const validSlots = generateSlots(nowIso, settings);
  if (!validSlots.includes(slotStart)) {
    throw new ApiError('INVALID_SLOT');
  }

  const admin = createAdminClient();
  const [{ data: tableRows, error: tableErr }, { data: bookedRows, error: orderErr }] =
    await Promise.all([
      admin.from('canteen_tables').select('id,label,seats'),
      admin
        .from('orders')
        .select('table_id')
        .eq('slot_start', slotStart)
        .in('status', ACTIVE_STATUSES),
    ]);
  throwIfDb(tableErr);
  throwIfDb(orderErr);

  const takenIds = new Set(
    ((bookedRows ?? []) as Array<{ table_id: string }>).map((row) => row.table_id)
  );

  const tables: TableAvailability[] = ((tableRows ?? []) as TableRow[])
    .sort((a, b) => tableSortNum(a.label) - tableSortNum(b.label) || a.label.localeCompare(b.label))
    .map((table) => ({
      id: table.id,
      label: table.label,
      seats: table.seats,
      isFree: !takenIds.has(table.id),
    }));

  return ok({ tables });
});

