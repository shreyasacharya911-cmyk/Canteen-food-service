'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ClipboardList, LogOut, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';

export function CustomerShell({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
      router.replace('/login');
      router.refresh();
    } catch {
      toast.error('Failed to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  const isMenu = pathname.startsWith('/menu');
  const isOrders = pathname.startsWith('/orders');

  return (
    <div className="min-h-screen bg-bg pb-24 md:pb-8">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/menu"
              className="flex min-h-[44px] items-center gap-2 text-lg font-bold text-text"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
                <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>CanteenNow</span>
            </Link>

            <nav className="hidden items-center gap-2 md:flex" aria-label="Main">
              <Link
                href="/menu"
                className={`inline-flex min-h-[44px] items-center rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                  isMenu ? 'bg-primary text-white' : 'text-muted hover:bg-bg hover:text-text'
                }`}
              >
                Menu
              </Link>
              <Link
                href="/orders"
                className={`inline-flex min-h-[44px] items-center rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                  isOrders ? 'bg-primary text-white' : 'text-muted hover:bg-bg hover:text-text'
                }`}
              >
                My Orders
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-text">{profile.fullName}</p>
            </div>
            <Badge tone="info" className="capitalize">
              {profile.role}
            </Badge>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              aria-label="Log out"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:bg-bg disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-2">
          <Link
            href="/menu"
            className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs font-semibold ${
              isMenu ? 'text-primary' : 'text-muted'
            }`}
          >
            <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
            <span>Menu</span>
          </Link>
          <Link
            href="/orders"
            className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs font-semibold ${
              isOrders ? 'text-primary' : 'text-muted'
            }`}
          >
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
            <span>Orders</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

