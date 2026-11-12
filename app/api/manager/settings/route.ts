import { handle, ok, parseJson, throwIfDb } from '@/lib/api-server';
import { requireRole } from '@/lib/auth';
import { settingsPatchSchema } from '@/lib/schemas';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export const PATCH = handle(async (req) => {
  await requireRole(['manager']);
  const body = await parseJson(req, settingsPatchSchema);

  const { error } = await createAdminClient()
    .from('app_settings')
    .update({ demo_clock_offset_minutes: body.demoClockOffsetMinutes })
    .eq('id', 1);
  throwIfDb(error);

  return ok({ demoClockOffsetMinutes: body.demoClockOffsetMinutes });
});
