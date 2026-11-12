import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getSessionProfile } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';
import { CUSTOMER_ROLES, homeFor } from '@/lib/roles';
import { CustomerShell } from '@/components/customer/CustomerShell';

export const dynamic = 'force-dynamic';

export default async function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getSessionProfile();
  if (!profile) {
    redirect('/login');
  }
  if (!CUSTOMER_ROLES.includes(profile.role)) {
    redirect(homeFor(profile.role));
  }

  return (
    <CartProvider>
      <CustomerShell profile={profile}>{children}</CustomerShell>
    </CartProvider>
  );
}

