import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { ApiError, handle, ok, throwIfDb } from '@/lib/api-server';
import { emailDomain, homeFor } from '@/lib/roles';
import type { ProfileRow } from '@/lib/db';
import type { Profile, Role } from '@/lib/types';

export const dynamic = 'force-dynamic';

function deriveName(email: string, metadata: Record<string, unknown> | undefined): string {
  const fromMeta =
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata?.name === 'string' && metadata.name.trim()) ||
    '';
  if (fromMeta) return fromMeta;
  const local = email.split('@')[0] ?? 'User';
  const words = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
  return words.join(' ') || 'User';
}

export const POST = handle(async () => {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    throw new ApiError('UNAUTHENTICATED');
  }

  const email = user.email.trim().toLowerCase();
  const admin = createAdminClient();
  const { data: allowedRow, error: allowErr } = await admin
    .from('allowed_emails')
    .select('role')
    .eq('email', email)
    .maybeSingle();
  throwIfDb(allowErr);

  const collegeDomain = (process.env.COLLEGE_EMAIL_DOMAIN ?? 'mite.ac.in').trim().toLowerCase();
  let role: Role;
  if (allowedRow && typeof allowedRow.role === 'string') {
    role = allowedRow.role as Role;
  } else if (emailDomain(email) === collegeDomain) {
    role = 'student';
  } else {
    await supabase.auth.signOut();
    throw new ApiError('EMAIL_NOT_ALLOWED');
  }

  const fullName = deriveName(email, user.user_metadata);
  const { data: saved, error: upsertErr } = await admin
    .from('profiles')
    .upsert(
      { id: user.id, email, full_name: fullName, role },
      { onConflict: 'id' }
    )
    .select('id,email,full_name,role')
    .single();
  throwIfDb(upsertErr);

  const row = saved as ProfileRow;
  const profile: Profile = {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
  };

  return ok({ profile, home: homeFor(profile.role) });
});

