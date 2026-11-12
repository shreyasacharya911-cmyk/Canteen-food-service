import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvLocal();

const DEMO_USERS = [
  { email: 'student.demo@mite.ac.in', fullName: 'Student Demo', role: 'student', inProfiles: true },
  { email: 'student2.demo@mite.ac.in', fullName: 'Student 2 Demo', role: 'student', inProfiles: true },
  { email: 'faculty.demo@mite.ac.in', fullName: 'Faculty Demo', role: 'faculty', inProfiles: true },
  { email: 'staff.demo@mite.ac.in', fullName: 'Staff Demo', role: 'staff', inProfiles: true },
  { email: 'manager.demo@mite.ac.in', fullName: 'Manager Demo', role: 'manager', inProfiles: true },
  { email: 'outsider.demo@example.com', fullName: 'Outsider Demo', role: 'student', inProfiles: false },
] as const;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.DEMO_PASSWORD;

  if (!url || !serviceKey || url.includes('placeholder')) {
    console.error('Missing real NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }
  if (!password) {
    console.error('Missing DEMO_PASSWORD environment variable.');
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw listErr;

  for (const spec of DEMO_USERS) {
    const existing = listData.users.find(
      (u) => u.email?.toLowerCase() === spec.email.toLowerCase()
    );

    let userId: string;
    if (existing) {
      const { data: updated, error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: spec.fullName },
      });
      if (updErr) throw updErr;
      userId = updated.user.id;
      console.log(`Updated auth user: ${spec.email}`);
    } else {
      const { data: created, error: crtErr } = await admin.auth.admin.createUser({
        email: spec.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: spec.fullName },
      });
      if (crtErr) throw crtErr;
      userId = created.user.id;
      console.log(`Created auth user: ${spec.email}`);
    }

    if (spec.inProfiles) {
      const { error: profErr } = await admin.from('profiles').upsert(
        {
          id: userId,
          email: spec.email,
          full_name: spec.fullName,
          role: spec.role,
        },
        { onConflict: 'id' }
      );
      if (profErr) throw profErr;
      console.log(`Upserted profile: ${spec.email} (${spec.role})`);
    }
  }

  console.log('Demo users seeded successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
