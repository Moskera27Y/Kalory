/**
 * Pasos automáticos del teléfono (HealthKit en iOS / Health Connect en Android
 * vía cordova-plugin-health). En PC/navegador no disponible.
 */

export const STEPS_GOAL = 8000;

export function isNative(): boolean {
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return !!cap?.isNativePlatform?.();
  } catch {
    return false;
  }
}

type HealthApi = {
  isAvailable?: (ok: (v: boolean) => void, err: (e: unknown) => void) => void;
  requestAuthorization?: (
    scopes: { read: string[]; write: string[] },
    ok: () => void,
    err: (e: unknown) => void,
  ) => void;
  query?: (
    opts: { startDate: Date; endDate: Date; dataType: string; limit?: number; filtered?: boolean },
    ok: (samples: { value: number }[]) => void,
    err: (e: unknown) => void,
  ) => void;
};

function api(): HealthApi | null {
  try {
    const h = (window.navigator as unknown as { health?: HealthApi }).health;
    return h ?? null;
  } catch {
    return null;
  }
}

const call = <T,>(fn: (ok: (v: T) => void, err: (e: unknown) => void) => void): Promise<T> =>
  new Promise((resolve, reject) => {
    try {
      fn(resolve, reject);
    } catch (e) {
      reject(e);
    }
  });

const LS_KEY = 'kalory-steps-v1';
interface Cache { [userId: number]: { date: string; steps: number; at: number } }
function loadCache(): Cache {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as Cache;
  } catch {
    return {};
  }
}
function saveCache(c: Cache) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(c));
  } catch { /* ignore */ }
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Lee los pasos de hoy del teléfono (pide permiso la primera vez). */
export async function readPhoneSteps(): Promise<number> {
  const h = api();
  if (!h?.requestAuthorization || !h?.query) throw new Error('no_plugin');
  await call<void>((ok, err) => h.requestAuthorization!({ read: ['steps'], write: [] }, ok, err));
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const samples = await call<{ value: number }[]>((ok, err) =>
    h.query!({ startDate: start, endDate: new Date(), dataType: 'steps', limit: 1000 }, ok, err),
  );
  return Math.round(samples.reduce((a, s) => a + (Number(s.value) || 0), 0));
}

/** Pasos de hoy (caché de 15 min por usuario para no pedir al sensor a cada rato). */
export async function getStepsToday(userId: number): Promise<number> {
  if (!isNative()) throw new Error('no_nativo');
  const c = loadCache();
  const today = todayStr();
  const hit = c[userId];
  if (hit && hit.date === today && Date.now() - hit.at < 15 * 60 * 1000) return hit.steps;
  const steps = await readPhoneSteps();
  c[userId] = { date: today, steps, at: Date.now() };
  saveCache(c);
  return steps;
}
