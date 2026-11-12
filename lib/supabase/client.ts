import { createBrowserClient } from '@supabase/ssr';

const DEMO_USER_IDS: Record<string, { id: string; name: string }> = {
  'student.demo@mite.ac.in': { id: '11111111-1111-4111-a111-111111111111', name: 'Student Demo' },
  'student2.demo@mite.ac.in': { id: '22222222-2222-4222-a222-222222222222', name: 'Student 2 Demo' },
  'faculty.demo@mite.ac.in': { id: '33333333-3333-4333-a333-333333333333', name: 'Faculty Demo' },
  'staff.demo@mite.ac.in': { id: '44444444-4444-4444-a444-444444444444', name: 'Staff Demo' },
  'manager.demo@mite.ac.in': { id: '55555555-5555-4555-a555-555555555555', name: 'Manager Demo' },
  'outsider.demo@example.com': { id: '99999999-9999-4999-a999-999999999999', name: 'Outsider Demo' },
};

function isMock(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes('placeholder') || url === 'mock';
}

export function createClient() {
  if (isMock()) {
    return {
      auth: {
        async signInWithPassword({ email }: { email: string; password?: string }) {
          const normalized = email.trim().toLowerCase();
          const preset = DEMO_USER_IDS[normalized];
          const user = {
            id: preset?.id ?? crypto.randomUUID(),
            email: normalized,
            user_metadata: { full_name: preset?.name ?? normalized.split('@')[0] },
          };
          if (typeof document !== 'undefined') {
            document.cookie = `sb-mock-auth=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`;
          }
          return { data: { user, session: { access_token: 'mock-token', user } }, error: null };
        },
        async signOut() {
          if (typeof document !== 'undefined') {
            document.cookie = 'sb-mock-auth=; path=/; max-age=0; SameSite=Lax';
          }
          return { error: null };
        },
        async getUser() {
          if (typeof document !== 'undefined') {
            const match = document.cookie.match(/(?:^|; )sb-mock-auth=([^;]*)/);
            if (match?.[1]) {
              try {
                return { data: { user: JSON.parse(decodeURIComponent(match[1])) }, error: null };
              } catch {}
            }
          }
          return { data: { user: null }, error: null };
        },
      },
    } as unknown as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
