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

type StepsPlugin = {
  getToday?: () => Promise<{ steps?: number }>;
  getWeight?: () => Promise<{ kg?: number }>;
  getSleep?: () => Promise<{ hours?: number }>;
  saveWorkout?: (o: { startMs: number; endMs: number; kcal: number }) => Promise<unknown>;
  saveWidgetSnapshot?: (o: { steps: string; water: string; streak: string }) => Promise<unknown>;
};

export function stepsPluginAvailable(): boolean {
  try {
    const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, StepsPlugin> } }).Capacitor;
    return !!cap?.Plugins?.KalorySteps?.getToday;
  } catch {
    return false;
  }
}

function plugin(): StepsPlugin | null {
  try {
    const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, StepsPlugin> } }).Capacitor;
    return cap?.Plugins?.KalorySteps ?? null;
  } catch {
    return null;
  }
}

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
  const p = plugin();
  if (!p?.getToday) throw new Error('no_plugin');
  const r = await p.getToday();
  const v = Math.round(Number(r?.steps) || 0);
  if (!Number.isFinite(v)) throw new Error('bad_value');
  return Math.max(0, v);
}

/** Último peso en la app de Salud del teléfono (kg) o null. Solo iOS. */
export async function getHealthWeight(): Promise<number | null> {
  const p = plugin();
  if (!p?.getWeight) return null;
  try {
    const r = await p.getWeight();
    const v = Number(r?.kg) || 0;
    return v > 20 && v < 400 ? Math.round(v * 10) / 10 : null;
  } catch {
    return null;
  }
}

/** Horas dormidas según Salud del teléfono o null. Solo iOS. */
export async function getHealthSleep(): Promise<number | null> {
  const p = plugin();
  if (!p?.getSleep) return null;
  try {
    const r = await p.getSleep();
    const v = Number(r?.hours) || 0;
    return v > 0 && v < 24 ? Math.round(v * 10) / 10 : null;
  } catch {
    return null;
  }
}

/** Guarda el entreno en Salud (iOS). Silencioso si no aplica. */
export async function saveHealthWorkout(startMs: number, endMs: number, kcal: number): Promise<boolean> {
  const p = plugin();
  if (!p?.saveWorkout) return false;
  try {
    await p.saveWorkout({ startMs, endMs, kcal });
    return true;
  } catch {
    return false;
  }
}

/** Foto de datos para el widget Android (pasos/agua/racha como texto). */
export async function saveWidgetSnapshot(s: { steps: string; water: string; streak: string }): Promise<void> {
  const p = plugin();
  if (!p?.saveWidgetSnapshot) return;
  try {
    await p.saveWidgetSnapshot(s);
  } catch { /* ignore */ }
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
