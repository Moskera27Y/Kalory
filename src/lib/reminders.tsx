import { useEffect } from 'react';
import { useStore } from './store';
import { DEFAULT_NOTIFY, scheduleDaily, type NotifyPrefs } from './notify';
export type { NotifyPrefs };
import { isNative } from './steps';

const LS_KEY = 'kalory-reminders-v1';

export function loadPrefs(): NotifyPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_NOTIFY, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_NOTIFY };
}

export function savePrefs(p: NotifyPrefs) {
  localStorage.setItem(LS_KEY, JSON.stringify(p));
  // En móvil se programan aunque la app esté cerrada
  if (isNative()) scheduleDaily(p).catch(() => undefined);
}

function toH(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
}

function lastKey(id: string) {
  return `kalory-reminder-last:${id}`;
}
function shownToday(id: string): boolean {
  try {
    const v = localStorage.getItem(lastKey(id));
    if (!v) return false;
    return new Date(Number(v)).toDateString() === new Date().toDateString();
  } catch { return false; }
}
function markShown(id: string) {
  try { localStorage.setItem(lastKey(id), String(Date.now())); } catch { /* ignore */ }
}
function hoursSince(id: string): number {
  try {
    const v = Number(localStorage.getItem(lastKey(id)) || 0);
    return (Date.now() - v) / 3600000;
  } catch { return 99; }
}

function notify(title: string, body: string) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') new Notification(title, { body });
    else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((p) => {
        if (p === 'granted') new Notification(title, { body });
      });
    }
  } catch { /* ignore */ }
}

/** Revisa recordatorios cada 30 min con los horarios del usuario. No renderiza nada. */
export function Reminders() {
  const { user, profile, targets, day, consumed } = useStore();

  // Al entrar en móvil, asegura la programación diaria
  useEffect(() => {
    if (user && isNative()) scheduleDaily(loadPrefs()).catch(() => undefined);
  }, [user]);

  useEffect(() => {
    if (!user || !profile) return;
    let timer: number | null = null;

    const check = () => {
      const prefs = loadPrefs();
      const h = new Date().getHours() + new Date().getMinutes() / 60;
      if (prefs.water && targets && h >= 9 && h <= 21 && day.waterMl < targets.waterMl * 0.5 && hoursSince('water') >= 3) {
        notify('💧 Hora de hidratarte', `Llevas ${(day.waterMl / 1000).toFixed(2)} L de ${(targets.waterMl / 1000).toFixed(1)} L.`);
        markShown('water');
      }
      if (prefs.meals && consumed === 0 && h >= toH(prefs.breakfast) && h < toH(prefs.breakfast) + 2 && !shownToday('breakfast')) {
        notify('🍳 Hora del desayuno', 'Registra tu desayuno para empezar el día contando.');
        markShown('breakfast');
      }
      if (prefs.meals && consumed === 0 && h >= toH(prefs.lunch) && h < toH(prefs.lunch) + 2 && !shownToday('lunch')) {
        notify('🍽️ Hora del almuerzo', '¿Ya almorzaste? Anótalo en tu diario.');
        markShown('lunch');
      }
      if (prefs.meals && h >= toH(prefs.dinner) && h < toH(prefs.dinner) + 2 && !shownToday('dinner')) {
        notify('🌙 Hora de la cena', day.foods.length === 0 ? 'Aún no registraste comidas hoy.' : 'No olvides anotar tu cena.');
        markShown('dinner');
      }
      if (prefs.workout && day.done.length === 0 && h >= toH(prefs.workoutTime) && !shownToday('workout')) {
        notify('🔥 A entrenar', `Tienes ${profile.daysPerWeek} días esta semana. ¡Hoy puede ser uno!`);
        markShown('workout');
      }
      if (prefs.goals && h >= toH(prefs.goalsTime) && !shownToday('goals')) {
        notify('🎯 Cierre del día', 'Revisa si cumpliste tu meta de calorías, agua y entreno.');
        markShown('goals');
      }
    };

    const boot = window.setTimeout(check, 60000);
    timer = window.setInterval(check, 30 * 60 * 1000);
    return () => {
      window.clearTimeout(boot);
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile !== null]);

  return null;
}
