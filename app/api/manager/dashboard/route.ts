import { handle, ok, throwIfDb } from '@/lib/api-server';
import { requireRole } from '@/lib/auth';
import { ACTIVE_STATUSES, QUEUE_STATUSES, type TableRow } from '@/lib/db';
import { fetchStaffOrders } from '@/lib/orders';
import { getNowAndSettings } from '@/lib/settings';
import { createAdminClient } from '@/lib/supabase/admin';
import { addMinutes, generateSlots, istDayRange } from '@/lib/time';
import type { DashboardData, Kpis, TableAvailability } from '@/lib/types';

export const dynamic = 'force-dynamic';

function tableSortNum(label: string): number {
  const num = Number(label.replace(/\D+/g, ''));
  return Number.isFinite(num) && num > 0 ? num : Number.MAX_SAFE_INTEGER;
}

export const GET = handle(async () => {
  await requireRole(['manager']);
  const { nowIso, settings } = await getNowAndSettings();
  const { startIso, endIso } = istDayRange(nowIso);

  const [orders, { data: tableRows, error: tableErr }] = await Promise.all([
    fetchStaffOrders({
      startIso,
      endIso,
      sortBy: 'created_at',
      ascending: false,
    }),
    createAdminClient().from('canteen_tables').select('id,label,seats'),
  ]);
  throwIfDb(tableErr);

  const kpis: Kpis = {
    ordersToday: orders.length,
    activeOrders: orders.filter((o) => QUEUE_STATUSES.includes(o.status)).length,
    revenueInr: orders.reduce(
      (sum, o) => (o.paymentStatus === 'paid' || o.paymentStatus === 'forfeited' ? sum + o.totalInr : sum),
      0
    ),
    freeCancellations: orders.filter((o) => o.status === 'cancelled_free').length,
    lateCancellations: orders.filter((o) => o.status === 'cancelled_late').length,
  };

  const slots = generateSlots(nowIso, settings);
  const currentSlot =
    slots.find((s) => s <= nowIso && nowIso < addMinutes(s, settings.slot_minutes)) ?? null;

  const takenTableIds = new Set<string>();
  if (currentSlot) {
    for (const o of orders) {
      if (o.slotStart === currentSlot && ACTIVE_STATUSES.includes(o.status)) {
        takenTableIds.add(o.table.id);
      }
    }
  }

  const tables: TableAvailability[] = ((tableRows ?? []) as TableRow[])
    .sort((a, b) => tableSortNum(a.label) - tableSortNum(b.label) || a.label.localeCompare(b.label))
    .map((t) => ({
      id: t.id,
      label: t.label,
      seats: t.seats,
      isFree: currentSlot ? !takenTableIds.has(t.id) : true,
    }));

  const payload: DashboardData = {
    kpis,
    orders,
    occupancy: {
      slotStart: currentSlot,
      tables,
    },
    clock: {
      nowIso,
      demoClockOffsetMinutes: settings.demo_clock_offset_minutes,
    },
  };

  return ok(payload);
});
