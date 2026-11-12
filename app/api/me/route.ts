import { handle, ok } from '@/lib/api-server';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  const profile = await requireRole(['student', 'faculty', 'staff', 'manager']);
  return ok({ profile });
});

