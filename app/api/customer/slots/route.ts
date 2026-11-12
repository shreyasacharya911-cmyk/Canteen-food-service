import { handle, ok, parseQuery, throwIfDb } from '@/lib/api-server';
import { requireRole } from '@/lib/auth';
import { ACTIVE_STATUSES } from '@/lib/db';
import { CUSTOMER_ROLES } from '@/lib/roles';
import { slotsQuerySchema } from '@/lib/schemas';
import { getNowAndSettings } from '@/lib/settings';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeStartBy, generateSlots, istDayRange, toIso } from '@/lib/time';
import type { Slot, SlotState } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface ActiveSlotOrderRow {
  slot_start: string;
  total_items: number;
}

export const GET = handle(async (req) => {
  await requireRole(CUSTOMER_ROLES);
  const { maxPrep, qty } = parseQuery(req, slotsQuerySchema);
  const { nowIso, settings } = await getNowAndSettings();

  const slotStarts = generateSlots(nowIso, settings);
  const { startIso, endIso } = istDayRange(nowIso);
  const admin = createAdminClient();

  const [{ count: tableCount, error: tableErr }, { data: orderRows, error: orderErr }] =
    await Promise.all([
      admin.from('canteen_tables').select('id', { count: 'exact', head: true }),
      admin
        .from('orders')
        .select('slot_start,total_items')
        .gte('slot_start', startIso)
        .lt('slot_start', endIso)
        .in('status', ACTIVE_STATUSES),
    ]);
  throwIfDb(tableErr);
  throwIfDb(orderErr);

  const totalTables = tableCount ?? 0;
  const usageBySlot = new Map<string, { tables: number; items: number }>();

  for (const row of (orderRows ?? []) as ActiveSlotOrderRow[]) {
    const key = toIso(row.slot_start);
    const prev = usageBySlot.get(key) ?? { tables: 0, items: 0 };
    usageBySlot.set(key, {
      tables: prev.tables + 1,
      items: prev.items + row.total_items,
    });
  }

  const slots: Slot[] = slotStarts.map((slotStart) => {
    const usage = usageBySlot.get(slotStart) ?? { tables: 0, items: 0 };
    const freeTables = Math.max(0, totalTables - usage.tables);
    const kitchenRemaining = Math.max(0, settings.kitchen_capacity_per_slot - usage.items);
    const startBy = computeStartBy(slotStart, maxPrep);

    let state: SlotState = 'bookable';
    if (slotStart <= nowIso) {
      state = 'passed';
    } else if (nowIso >= startBy) {
      state = 'too_soon';
    } else if (freeTables <= 0) {
      state = 'full_tables';
    } else if (kitchenRemaining < qty) {
      state = 'full_kitchen';
    }

    return { slotStart, state, freeTables, kitchenRemaining };
  });

  return ok({ now: nowIso, slots });
});
