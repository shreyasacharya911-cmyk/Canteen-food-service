'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UtensilsCrossed } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ApiClientError, postJson } from '@/lib/api-client';
import type { Profile } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

const DEMO_ACCOUNTS = [
  { label: 'Student 1', email: 'student.demo@mite.ac.in' },
  { label: 'Student 2', email: 'student2.demo@mite.ac.in' },
  { label: 'Faculty', email: 'faculty.demo@mite.ac.in' },
  { label: 'Staff', email: 'staff.demo@mite.ac.in' },
  { label: 'Manager', email: 'manager.demo@mite.ac.in' },
  { label: 'Outsider (reject)', email: 'outsider.demo@example.com' },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setErrorMsg('Enter both your email and password.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInErr) {
        setErrorMsg(signInErr.message);
        toast.error(signInErr.message);
        return;
      }

      const data = await postJson<{ profile: Profile; home: string }>('/api/auth/bootstrap');
      toast.success(`Welcome, ${data.profile.fullName}`);
      router.replace(data.home);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Unable to sign in. Please try again.';
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
          <UtensilsCrossed className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-text">CanteenNow</h1>
        <p className="mt-1 text-sm text-muted">Preorder food &amp; reserve your table for break</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-text">Demo login</h2>
        <p className="mt-1 text-sm text-muted">
          Use your <span className="font-medium text-text">@mite.ac.in</span> college account or an
          approved demo account.
        </p>

        {errorMsg && (
          <div className="mt-4">
            <ErrorBanner message={errorMsg} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@mite.ac.in"
              className="min-h-[44px] w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text placeholder:text-muted/70"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="min-h-[44px] w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text placeholder:text-muted/70"
            />
          </div>

          <Button type="submit" fullWidth loading={loading}>
            Log in
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Quick-fill demo email
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((acct) => (
              <button
                key={acct.email}
                type="button"
                onClick={() => {
                  setEmail(acct.email);
                  setErrorMsg(null);
                }}
                className="min-h-[44px] rounded-xl border border-border bg-bg px-3 py-2 text-xs font-medium text-text transition-colors hover:border-primary hover:text-primary"
              >
                {acct.label}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </main>
  );
}

