'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ChefHat, LayoutDashboard, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';

export function ManagerShell({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
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

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/manager"
              className="flex min-h-[44px] items-center gap-2 text-lg font-bold text-text"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
                <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>CanteenNow Manager</span>
            </Link>

            <nav className="flex items-center gap-2" aria-label="Manager navigation">
              <Link
                href="/manager"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-semibold text-white"
              >
                Dashboard
              </Link>
              <Link
                href="/staff"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-text hover:bg-bg"
              >
                <ChefHat className="h-4 w-4" aria-hidden="true" />
                Kitchen View
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm font-medium text-text">{profile.fullName}</span>
              <Badge tone="primary" className="capitalize">
                {profile.role}
              </Badge>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-text hover:bg-bg disabled:opacity-50"
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
