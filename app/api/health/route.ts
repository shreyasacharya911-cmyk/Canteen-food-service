import { ok } from '@/lib/api-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return ok({ ok: true });
}
