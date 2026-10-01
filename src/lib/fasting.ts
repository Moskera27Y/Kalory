/** Ayuno intermitente: timer + protocolos + historial (por usuario, en este equipo). */

export interface Protocol {
  id: string;
  label: string;
  hours: number;
}

export const PROTOCOLS: Protocol[] = [
  { id: '12-12', label: '12:12', hours: 12 },
  { id: '14-10', label: '14:10', hours: 14 },
  { id: '16-8', label: '16:8', hours: 16 },
  { id: '18-6', label: '18:6', hours: 18 },
  { id: '20-4', label: '20:4', hours: 20 },
  { id: 'omad', label: 'OMAD', hours: 23 },
];

export interface FastRecord {
  start: number;
  end: number;
  targetH: number;
  completed: boolean;
}

interface UserFast {
  protocolId: string;
  activeStart: number | null;
  history: FastRecord[];
}

const KEY = 'kalory-fasting-v1';

function loadAll(): Record<number, UserFast> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}
function saveAll(s: Record<number, UserFast>) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
function blank(): UserFast {
  return { protocolId: '16-8', activeStart: null, history: [] };
}
function get(uid: number): UserFast {
  const all = loadAll();
  return all[uid] ?? blank();
}
function set(uid: number, u: UserFast) {
  const all = loadAll();
  all[uid] = u;
  saveAll(all);
}

export function fastingState(uid: number): UserFast {
  return get(uid);
}
export function setProtocol(uid: number, id: string) {
  const u = get(uid);
  u.protocolId = id;
  set(uid, u);
}
export function startFast(uid: number, at = Date.now()) {
  const u = get(uid);
  u.activeStart = at;
  set(uid, u);
}
/** Cierra el ayuno; completed = duró al menos la meta. Devuelve el registro. */
export function stopFast(uid: number, at = Date.now()): FastRecord | null {
  const u = get(uid);
  if (!u.activeStart) return null;
  const targetH = PROTOCOLS.find((p) => p.id === u.protocolId)?.hours ?? 16;
  const rec: FastRecord = {
    start: u.activeStart,
    end: at,
    targetH,
    completed: at - u.activeStart >= targetH * 3600 * 1000,
  };
  u.activeStart = null;
  u.history = [...u.history, rec].slice(-120);
  set(uid, u);
  return rec;
}
export function cancelFast(uid: number) {
  const u = get(uid);
  u.activeStart = null;
  set(uid, u);
}
export function completedCount(uid: number): number {
  return get(uid).history.filter((h) => h.completed).length;
}
export function fastingStreak(uid: number): number {
  const days = new Set(
    get(uid).history.filter((h) => h.completed).map((h) => new Date(h.end).toDateString()),
  );
  let s = 0;
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) {
    s++;
    d.setDate(d.getDate() - 1);
  }
  return s;
}
export function totalFastedHours(uid: number): number {
  return get(uid).history.reduce((a, h) => a + (h.end - h.start) / 3600000, 0);
}
