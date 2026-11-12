import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { homeFor } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const profile = await getSessionProfile();
  redirect(profile ? homeFor(profile.role) : '/login');
}
