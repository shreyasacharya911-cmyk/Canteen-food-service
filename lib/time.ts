import type { SettingsRow } from './db';

export const IST_OFFSET_MIN = 330;
const MS_MIN = 60_000;
const pad = (n: number): string => String(n).padStart(2, '0');

export function toIso(value: string): string {
  return new Date(value).toISOString();
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * MS_MIN).toISOString();
}

export function computeStartBy(slotStart: string, maxPrepMinutes: number): string {
  return addMinutes(slotStart, -maxPrepMinutes);
}

export function computeCutoff(slotStart: string, maxPrepMinutes: number, minCancelMinutes = 10): string {
  return addMinutes(slotStart, -Math.max(minCancelMinutes, maxPrepMinutes));
}

export function istDayRange(nowIso: string): { startIso: string; endIso: string; dateKey: string } {
  const ist = new Date(new Date(nowIso).getTime() + IST_OFFSET_MIN * MS_MIN);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate();
  const startMs = Date.UTC(y, m, d) - IST_OFFSET_MIN * MS_MIN;
  return {
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(startMs + 24 * 60 * MS_MIN).toISOString(),
    dateKey: `${y}-${pad(m + 1)}-${pad(d)}`,
  };
}

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

export function generateSlots(
  nowIso: string,
  s: Pick<SettingsRow, 'open_time' | 'close_time' | 'slot_minutes'>
): string[] {
  const startMs = new Date(istDayRange(nowIso).startIso).getTime();
  const open = minutesOfDay(s.open_time);
  const close = minutesOfDay(s.close_time);
  const out: string[] = [];
  for (let t = open; t + s.slot_minutes <= close; t += s.slot_minutes) {
    out.push(new Date(startMs + t * MS_MIN).toISOString());
  }
  return out;
}

export function formatIst(iso: string, mode: 'time' | 'datetime' = 'time'): string {
  const opts: Intl.DateTimeFormatOptions =
    mode === 'time'
      ? { hour: 'numeric', minute: '2-digit', hour12: true }
      : { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true };
  return new Intl.DateTimeFormat('en-IN', { ...opts, timeZone: 'Asia/Kolkata' }).format(new Date(iso));
}

