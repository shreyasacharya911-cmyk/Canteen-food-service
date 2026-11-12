import 'server-only';
import { createAdminClient } from './supabase/admin';
import type { SettingsRow } from './db';

export async function getSettings(): Promise<SettingsRow> {
  const { data, error } = await createAdminClient()
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .single();
  if (error || !data) throw new Error('app_settings row missing: run supabase/seed.sql');
  return data as SettingsRow;
}

export async function getNowAndSettings(): Promise<{ nowIso: string; settings: SettingsRow }> {
  const settings = await getSettings();
  return {
    nowIso: new Date(Date.now() + settings.demo_clock_offset_minutes * 60_000).toISOString(),
    settings,
  };
}

export async function getNow(): Promise<string> {
  return (await getNowAndSettings()).nowIso;
}

