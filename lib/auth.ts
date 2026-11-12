import 'server-only';
import { createServerSupabase } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import { ApiError } from './api-server';
import type { ProfileRow } from './db';
import type { Profile, Role } from './types';

export async function getSessionProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await createServerSupabase().auth.getUser();
  if (!user) return null;
  const { data } = await createAdminClient()
    .from('profiles')
    .select('id,email,full_name,role')
    .eq('id', user.id)
    .maybeSingle();
  if (!data) return null;
  const row = data as ProfileRow;
  return { id: row.id, email: row.email, fullName: row.full_name, role: row.role };
}

export async function requireRole(roles: Role[]): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) throw new ApiError('UNAUTHENTICATED');
  if (!roles.includes(profile.role)) throw new ApiError('FORBIDDEN');
  return profile;
}

