/** Sueño: registro manual de acostada/despertada (todos los equipos). */

export interface SleepEntry {
  userId: number;
  date: string; // día al despertar
  bed: string;  // HH:MM
  wake: string; // HH:MM
  hours: number;
}

const KEY = 'kalory-sleep-v1';

function loadAll(): SleepEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as SleepEntry[];
  } catch { /* ignore */ }
  return [];
}

export function listSleep(userId: number): SleepEntry[] {
  return loadAll().filter((s) => s.userId === userId).sort((a, b) => (a.date < b.date ? 1 : -1));
}

function diffHours(bed: string, wake: string): number {
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let h = wh + wm / 60 - (bh + bm / 60);
  if (h <= 0) h += 24;
  return Math.round(h * 10) / 10;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function saveSleep(userId: number, bed: string, wake: string, date = todayStr()): SleepEntry {
  const entry: SleepEntry = { userId, date, bed, wake, hours: diffHours(bed, wake) };
  const all = loadAll().filter((s) => !(s.userId === userId && s.date === date));
  all.push(entry);
  try {
    localStorage.setItem(KEY, JSON.stringify(all.slice(-120)));
  } catch { /* ignore */ }
  return entry;
}

export function avgSleep(userId: number, days = 7): number | null {
  const list = listSleep(userId).slice(0, days);
  if (!list.length) return null;
  return Math.round((list.reduce((a, s) => a + s.hours, 0) / list.length) * 10) / 10;
}
