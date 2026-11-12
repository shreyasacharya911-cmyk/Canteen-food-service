'use client';

import { useState, type FormEvent } from 'react';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClientError, patchJson } from '@/lib/api-client';
import { formatIst } from '@/lib/time';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function DemoClockPanel({
  nowIso,
  offsetMinutes,
  onUpdated,
}: {
  nowIso: string;
  offsetMinutes: number;
  onUpdated: () => Promise<unknown>;
}) {
  const [customOffset, setCustomOffset] = useState(String(offsetMinutes));
  const [saving, setSaving] = useState(false);

  async function applyOffset(nextOffset: number) {
    setSaving(true);
    try {
      await patchJson<{ demoClockOffsetMinutes: number }>('/api/manager/settings', {
        demoClockOffsetMinutes: nextOffset,
      });
      setCustomOffset(String(nextOffset));
      toast.success(`Demo clock offset set to ${nextOffset >= 0 ? `+${nextOffset}` : nextOffset} min`);
      await onUpdated();
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : 'Failed to update demo clock.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleCustomSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = Number(customOffset);
    if (!Number.isInteger(parsed) || parsed < -720 || parsed > 720) {
      toast.error('Offset must be a whole number between -720 and +720 minutes.');
      return;
    }
    void applyOffset(parsed);
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-text">Demo Clock</h2>
          <p className="text-xs text-muted">
            Shift server time to demonstrate slot cutoffs &amp; overdue states.
          </p>
        </div>
        <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>

      <div className="mt-3 rounded-xl border border-border bg-bg p-3">
        <p className="text-xs font-medium text-muted">Current server time (IST)</p>
        <p className="mt-0.5 text-lg font-bold text-text">{formatIst(nowIso, 'datetime')}</p>
        <p className="mt-0.5 text-xs text-muted">
          Offset: {offsetMinutes >= 0 ? `+${offsetMinutes}` : offsetMinutes} minutes
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={saving}
          onClick={() => void applyOffset(Math.min(720, offsetMinutes + 15))}
        >
          +15m
        </Button>
        <Button
          variant="secondary"
          disabled={saving}
          onClick={() => void applyOffset(Math.min(720, offsetMinutes + 30))}
        >
          +30m
        </Button>
        <Button
          variant="secondary"
          disabled={saving || offsetMinutes === 0}
          onClick={() => void applyOffset(0)}
        >
          Reset
        </Button>
      </div>

      <form onSubmit={handleCustomSubmit} className="mt-3 flex items-center gap-2">
        <label htmlFor="demo-clock-offset" className="sr-only">
          Custom offset minutes
        </label>
        <input
          id="demo-clock-offset"
          type="number"
          min={-720}
          max={720}
          value={customOffset}
          onChange={(e) => setCustomOffset(e.target.value)}
          className="min-h-[44px] w-full rounded-xl border border-border bg-surface px-3 text-sm text-text"
          placeholder="-720 to 720"
        />
        <Button type="submit" loading={saving}>
          Apply
        </Button>
      </form>
    </Card>
  );
}
