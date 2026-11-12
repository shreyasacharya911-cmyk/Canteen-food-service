import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getSessionProfile } from '@/lib/auth';
import { homeFor, KITCHEN_ROLES } from '@/lib/roles';
import { StaffShell } from '@/components/staff/StaffShell';

export const dynamic = 'force-dynamic';

export default async function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getSessionProfile();
  if (!profile) {
    redirect('/login');
  }
  if (!KITCHEN_ROLES.includes(profile.role)) {
    redirect(homeFor(profile.role));
  }

  return <StaffShell profile={profile}>{children}</StaffShell>;
}
