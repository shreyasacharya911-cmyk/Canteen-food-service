'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ChefHat, ClipboardList, LayoutDashboard, LogOut, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';

export function StaffShell({
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

  const isQueue = pathname === '/staff';
  const isMenu = pathname.startsWith('/staff/menu');

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/staff"
              className="flex min-h-[48px] items-center gap-2 text-lg font-bold text-text"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                <ChefHat className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>CanteenNow Kitchen</span>
            </Link>

            <nav className="flex items-center gap-2" aria-label="Kitchen navigation">
              <Link
                href="/staff"
                className={`inline-flex min-h-[48px] items-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors ${
                  isQueue
                    ? 'bg-primary text-white'
                    : 'border border-border bg-surface text-text hover:bg-bg'
                }`}
              >
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                Queue
              </Link>
              <Link
                href="/staff/menu"
                className={`inline-flex min-h-[48px] items-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors ${
                  isMenu
                    ? 'bg-primary text-white'
                    : 'border border-border bg-surface text-text hover:bg-bg'
                }`}
              >
                <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
                Menu
              </Link>
              {profile.role === 'manager' && (
                <Link
                  href="/manager"
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-border bg-surface px-4 text-base font-semibold text-text hover:bg-bg"
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Manager
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm font-medium text-text">{profile.fullName}</span>
              <Badge tone="info" className="capitalize">
                {profile.role}
              </Badge>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text hover:bg-bg disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
