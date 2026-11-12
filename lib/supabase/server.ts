import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isMockMode } from '../mock-db';

export function createServerSupabase() {
  const store = cookies();

  if (isMockMode()) {
    return {
      auth: {
        async getUser() {
          const cookie = store.get('sb-mock-auth');
          if (!cookie?.value) {
            return { data: { user: null }, error: null };
          }
          try {
            const user = JSON.parse(decodeURIComponent(cookie.value));
            return { data: { user }, error: null };
          } catch {
            return { data: { user: null }, error: null };
          }
        },
        async signOut() {
          try {
            store.delete('sb-mock-auth');
          } catch {}
          return { error: null };
        },
      },
    } as unknown as ReturnType<typeof createServerClient>;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(list: { name: string; value: string; options: CookieOptions }[]) {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {}
        },
      },
    }
  );
}
