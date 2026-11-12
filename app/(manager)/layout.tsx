import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getSessionProfile } from '@/lib/auth';
import { homeFor } from '@/lib/roles';
import { ManagerShell } from '@/components/manager/ManagerShell';

export const dynamic = 'force-dynamic';

export default async function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getSessionProfile();
  if (!profile) {
    redirect('/login');
  }
  if (profile.role !== 'manager') {
    redirect(homeFor(profile.role));
  }

  return <ManagerShell profile={profile}>{children}</ManagerShell>;
}
