import { isNative } from './steps';

/**
 * Notificaciones programadas:
 * - En móvil (Capacitor): locales diarias aunque la app esté cerrada.
 * - En web/escritorio: el componente Reminders las muestra con la app abierta.
 */

export interface NotifyPrefs {
  water: boolean;
  meals: boolean;
  workout: boolean;
  goals: boolean;
  breakfast: string; // HH:MM
  lunch: string;
  dinner: string;
  workoutTime: string;
  goalsTime: string;
}

export const DEFAULT_NOTIFY: NotifyPrefs = {
  water: true,
  meals: true,
  workout: true,
  goals: true,
  breakfast: '08:00',
  lunch: '13:00',
  dinner: '20:00',
  workoutTime: '18:00',
  goalsTime: '21:30',
};

export function toHM(h: number): string {
  return `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 >= 0.5 ? '30' : '00'}`;
}

export function hmToDate(hm: string): { hour: number; minute: number } {
  const [h, m] = hm.split(':').map(Number);
  return { hour: h || 0, minute: m || 0 };
}

async function plugin(): Promise<null | {
  requestPermissions: () => Promise<{ display?: string }>;
  cancel: (o: { notifications: { id: number }[] }) => Promise<void>;
  schedule: (o: { notifications: { id: number; title: string; body: string; schedule: { on: { hour: number; minute: number }; allowWhileIdle?: boolean }; smallIcon?: string }[] }) => Promise<void>;
}> {
  if (!isNative()) return null;
  try {
    const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor;
    const p = cap?.Plugins?.LocalNotifications as never;
    return (p ?? null) as never;
  } catch {
    return null;
  }
}

/** Programa (o reprograma) las notificaciones diarias del usuario. */
export async function scheduleDaily(p: NotifyPrefs): Promise<boolean> {
  const ln = await plugin();
  if (!ln) return false;
  try {
    const perm = await ln.requestPermissions();
    if (perm && perm.display && perm.display !== 'granted') return false;
  } catch { /* sigue intentando */ }
  const items: { id: number; title: string; body: string; at: string; on: boolean }[] = [
    { id: 11, title: '🍳 Hora del desayuno', body: 'Registra tu desayuno para empezar el día contando.', at: p.breakfast, on: p.meals },
    { id: 12, title: '🍽️ Hora del almuerzo', body: '¿Ya almorzaste? Anótalo en tu diario.', at: p.lunch, on: p.meals },
    { id: 13, title: '🌙 Hora de la cena', body: 'Registra tu cena y cierra el día.', at: p.dinner, on: p.meals },
    { id: 21, title: '💧 Hidrátate', body: 'Toma un vaso de agua. Vas a la mitad del día.', at: '15:00', on: p.water },
    { id: 22, title: '🔥 A entrenar', body: 'Hoy toca moverse. Abre tu rutina y completa la sesión.', at: p.workoutTime, on: p.workout },
    { id: 23, title: '🎯 Cierre del día', body: 'Revisa si cumpliste tu meta de calorías, agua y entreno.', at: p.goalsTime, on: p.goals },
  ];
  try {
    await ln.cancel({ notifications: items.map((i) => ({ id: i.id })) });
    const active = items.filter((i) => i.on);
    if (active.length) {
      await ln.schedule({
        notifications: active.map((i) => {
          const { hour, minute } = hmToDate(i.at);
          return { id: i.id, title: i.title, body: i.body, schedule: { on: { hour, minute }, allowWhileIdle: true } };
        }),
      });
    }
    return true;
  } catch {
    return false;
  }
}
