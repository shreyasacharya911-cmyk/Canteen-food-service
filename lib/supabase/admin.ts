import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { isMockMode, type MockData } from '../mock-db';
import { MockQueryBuilder, mockRpc } from '../mock-client';

export function createAdminClient() {
  if (isMockMode()) {
    return {
      from(table: keyof MockData) {
        return new MockQueryBuilder(table);
      },
      async rpc(fnName: string, args: Record<string, unknown>) {
        return mockRpc(fnName, args);
      },
    } as unknown as ReturnType<typeof createClient>;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
