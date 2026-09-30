import { useEffect } from 'react';
import { useStore } from './store';

const LS_KEY = 'kalory-reminders-v1';

export interface ReminderPrefs {
  water: boolean;
  meals: boolean;
  workout: boolean;
}

export function loadPrefs(): ReminderPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { water: true, meals: true, workout: true, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { water: true, meals: true, workout: true };
}

export function savePrefs(p: ReminderPrefs) {
  localStorage.setItem(LS_KEY, JSON.stringify(p));
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

/** Revisa recordatorios cada 30 min (y una vez al arrancar con retardo). No renderiza nada. */
export function Reminders() {
  const { user, profile, targets, day, consumed } = useStore();

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
      if (prefs.meals && consumed === 0 && h >= 13 && h < 15 && !shownToday('lunch')) {
        notify('🍽️ ¿Ya almorzaste?', 'Registra tu comida para no perder la cuenta del día.');
        markShown('lunch');
      }
      if (prefs.meals && h >= 20.5 && !shownToday('dinner')) {
        notify('🌙 Registra tu cena', day.foods.length === 0 ? 'Aún no registraste comidas hoy.' : 'No olvides anotar tu última comida.');
        markShown('dinner');
      }
      if (prefs.workout && day.done.length === 0 && h >= 18 && !shownToday('workout')) {
        notify('🔥 Te falta el entreno', `Tienes ${profile.daysPerWeek} días esta semana. ¡Hoy puede ser uno!`);
        markShown('workout');
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
