import type { DayData, DayHistory, MacroTargets, UserProfile, WeightEntry } from '../types';

/**
 * Modo offline total: sombra local + cola de operaciones pendientes.
 * - Cada lectura exitosa guarda una copia (sombra) por usuario.
 * - Cada escritura que falla por red se encola y se aplica a la sombra.
 * - Al volver internet se reenvía la cola en orden.
 */

export interface PendingOp {
  id: string;
  kind: 'food' | 'water' | 'exercise' | 'weight' | 'unlock' | 'profile' | 'deleteFood';
  payload: Record<string, unknown>;
  ts: number;
}

export function isOfflineError(e: unknown): boolean {
  return e instanceof TypeError;
}

export function uidFromToken(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.uid === 'number' ? payload.uid : null;
  } catch {
    return null;
  }
}

const qKey = (uid: number) => `kalory-sync-queue:${uid}`;
const dayKey = (uid: number, date: string) => `kalory-shadow-day:${uid}:${date}`;
const profKey = (uid: number) => `kalory-shadow-profile:${uid}`;
const achKey = (uid: number) => `kalory-shadow-ach:${uid}`;
const histKey = (uid: number) => `kalory-shadow-history:${uid}`;
const wKey = (uid: number) => `kalory-shadow-weights:${uid}`;

function read<T>(k: string): T | null {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch { /* ignore */ }
}

export function loadQueue(uid: number): PendingOp[] {
  return read<PendingOp[]>(qKey(uid)) ?? [];
}
export function pendingCount(uid: number): number {
  return loadQueue(uid).length;
}
export function enqueue(uid: number, op: Omit<PendingOp, 'id' | 'ts'>) {
  const q = loadQueue(uid);
  q.push({ ...op, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ts: Date.now() });
  write(qKey(uid), q.slice(-200));
}

export function saveDay(uid: number, day: DayData) {
  write(dayKey(uid, day.date), day);
}
export function loadDay(uid: number, date: string): DayData | null {
  return read<DayData>(dayKey(uid, date));
}
export function applyFood(uid: number, date: string, f: { name: string; kcal: number; protein?: number; carbs?: number; fat?: number; meal?: string }): number {
  const d = loadDay(uid, date) ?? { date, foods: [], waterMl: 0, done: [] };
  const id = -Date.now();
  d.foods = [...d.foods, {
    id, date, name: f.name, kcal: f.kcal,
    protein: f.protein ?? 0, carbs: f.carbs ?? 0, fat: f.fat ?? 0, meal: f.meal ?? 'extra',
  }];
  write(dayKey(uid, date), d);
  return id;
}
export function applyDeleteFood(uid: number, date: string, id: number) {
  const d = loadDay(uid, date);
  if (!d) return;
  d.foods = d.foods.filter((x) => x.id !== id);
  write(dayKey(uid, date), d);
}
export function applyWater(uid: number, date: string, ml: number): number {
  const d = loadDay(uid, date) ?? { date, foods: [], waterMl: 0, done: [] };
  d.waterMl = Math.max(0, d.waterMl + ml);
  write(dayKey(uid, date), d);
  return d.waterMl;
}
export function applyToggle(uid: number, date: string, exercise: string): boolean {
  const d = loadDay(uid, date) ?? { date, foods: [], waterMl: 0, done: [] };
  const has = d.done.includes(exercise);
  d.done = has ? d.done.filter((x) => x !== exercise) : [...d.done, exercise];
  write(dayKey(uid, date), d);
  return !has;
}
export function saveProfileShadow(uid: number, profile: UserProfile, targets: MacroTargets) {
  write(profKey(uid), { profile, targets });
}
export function loadProfileShadow(uid: number): { profile: UserProfile; targets: MacroTargets } | null {
  return read(profKey(uid));
}
export function saveAchShadow(uid: number, list: { id: string; unlocked_at: string }[]) {
  write(achKey(uid), list);
}
export function loadAchShadow(uid: number): { id: string; unlocked_at: string }[] {
  return read<{ id: string; unlocked_at: string }[]>(achKey(uid)) ?? [];
}
export function applyUnlock(uid: number, id: string): string {
  const list = loadAchShadow(uid);
  const at = new Date().toISOString();
  if (!list.some((a) => a.id === id)) list.push({ id, unlocked_at: at });
  write(achKey(uid), list);
  return at;
}
export function saveHistory(uid: number, days: DayHistory[]) {
  write(histKey(uid), days);
}
export function loadHistory(uid: number): DayHistory[] {
  return read<DayHistory[]>(histKey(uid)) ?? [];
}
export function saveWeights(uid: number, list: WeightEntry[]) {
  write(wKey(uid), list);
}
export function loadWeights(uid: number): WeightEntry[] {
  return read<WeightEntry[]>(wKey(uid)) ?? [];
}

/** Reenvía la cola en orden. Devuelve cuántas quedan pendientes. */
export async function flushQueue(
  url: string,
  token: string,
  uid: number,
  call: (path: string, method: string, body?: unknown) => Promise<unknown>,
  matchExercise: (date: string, exercise: string, want: boolean) => Promise<void>,
): Promise<number> {
  let q = loadQueue(uid);
  const remaining: PendingOp[] = [];
  for (const op of q) {
    try {
      switch (op.kind) {
        case 'food':
          await call('/api/foods', 'POST', op.payload);
          break;
        case 'deleteFood':
          await call(`/api/foods/${op.payload.id}`, 'DELETE');
          break;
        case 'water':
          await call('/api/water', 'POST', op.payload);
          break;
        case 'exercise': {
          const p = op.payload as { date: string; exercise: string; want: boolean };
          await matchExercise(p.date, p.exercise, p.want);
          break;
        }
        case 'weight':
          await call('/api/weight', 'POST', op.payload);
          break;
        case 'unlock':
          await call('/api/achievements/unlock', 'POST', op.payload);
          break;
        case 'profile':
          await call('/api/profile', 'PUT', op.payload);
          break;
      }
    } catch (e) {
      if (isOfflineError(e)) {
        remaining.push(op, ...q.slice(q.indexOf(op) + 1));
        break;
      }
      // Error de app (p. ej. duplicado): se descarta para no atascar la cola
    }
  }
  write(qKey(uid), remaining);
  return remaining.length;
}
