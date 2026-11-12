import { z } from 'zod';
import { ApiError, handle, ok, parseJson, throwIfDb } from '@/lib/api-server';
import { requireRole } from '@/lib/auth';
import { mapMenuItem, type MenuItemRow } from '@/lib/db';
import { KITCHEN_ROLES } from '@/lib/roles';
import { menuPatchSchema } from '@/lib/schemas';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const uuidSchema = z.string().uuid();

export const PATCH = handle<{ id: string }>(async (req, ctx) => {
  await requireRole(KITCHEN_ROLES);
  const parsedId = uuidSchema.safeParse(ctx.params.id);
  if (!parsedId.success) {
    throw new ApiError('NOT_FOUND');
  }

  const body = await parseJson(req, menuPatchSchema);
  const { data, error } = await createAdminClient()
    .from('menu_items')
    .update({ is_available: body.isAvailable })
    .eq('id', parsedId.data)
    .select('id,name,category,price_inr,prep_minutes,stock_remaining,is_available,emoji')
    .maybeSingle();
  throwIfDb(error);

  if (!data) {
    throw new ApiError('NOT_FOUND');
  }

  return ok({ item: mapMenuItem(data as MenuItemRow) });
});
