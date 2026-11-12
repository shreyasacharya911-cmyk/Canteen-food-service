import { handle, ok, throwIfDb } from '@/lib/api-server';
import { requireRole } from '@/lib/auth';
import { mapMenuItem, type MenuItemRow } from '@/lib/db';
import { CUSTOMER_ROLES } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  await requireRole(CUSTOMER_ROLES);

  const { data, error } = await createAdminClient()
    .from('menu_items')
    .select('id,name,category,price_inr,prep_minutes,stock_remaining,is_available,emoji')
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  throwIfDb(error);

  const items = ((data ?? []) as MenuItemRow[]).map(mapMenuItem);
  return ok({ items });
});

