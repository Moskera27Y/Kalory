import type { AuthResult, AuthUser, DayData, MacroTargets, UserProfile } from '../types';
import type { DbApi } from './db';
import { todayStr } from './db';
import {
  isOfflineError, uidFromToken, enqueue, pendingCount,
  saveDay, loadDay, applyFood, applyDeleteFood, applyWater, applyToggle,
  saveProfileShadow, loadAchShadow, applyUnlock,
  saveHistory, loadHistory, saveWeights, loadWeights, flushQueue, saveAchShadow,
} from './syncQueue';

export { pendingCount };

/** Sesión del servidor online (URL + JWT) guardada en este equipo. */
const LS_KEY = 'kalory-server-v1';

/** Servidor oficial: la app se conecta sola sin pedir nada al usuario.
 *  Se rellena con la URL real al desplegar el servidor (https://...).
 *  Vacío = modo local (datos solo en este equipo). */
export const DEFAULT_SERVER_URL = 'https://kalory-production.up.railway.app';

export function loadServerUrl(): string {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY) || 'null')?.url;
    if (typeof stored === 'string') return stored; // '' = forzado a local
    return DEFAULT_SERVER_URL;
  } catch { return DEFAULT_SERVER_URL; }
}

function loadToken(): string {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || 'null')?.token || '';
  } catch { return ''; }
}

function saveSession(url: string, token: string) {
  localStorage.setItem(LS_KEY, JSON.stringify({ url, token }));
}

export function clearServerSession() {
  localStorage.removeItem(LS_KEY);
}

/** Guarda solo la URL (cambiando de servidor se invalida el token anterior). */
export function setServerUrlOnly(url: string) {
  localStorage.setItem(LS_KEY, JSON.stringify({ url: url.trim().replace(/\/+$/, ''), token: '' }));
}

/** Olvida la elección manual y vuelve al servidor oficial (si hay). */
export function clearServerOverride() {
  localStorage.removeItem(LS_KEY);
}

async function req<T>(url: string, token: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(url + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || (data as { ok?: boolean }).ok === false) {
    throw Object.assign(new Error((data as { error?: string }).error || 'server_error'), {
      code: (data as { error?: string }).error || 'server_error',
    });
  }
  return data as T;
}

/** DbApi contra el servidor online. El token vive en localStorage de este equipo. */
export class ServerDb implements DbApi {
  constructor(private url: string) {}
  private get token() { return loadToken(); }
  private get uid(): number | null { return uidFromToken(this.token); }

  private async authed<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    return req<T>(this.url, this.token, path, method, body);
  }

  /** Reintenta la cola pendiente y devuelve cuántas quedan. */
  async syncNow(): Promise<number> {
    const uid = this.uid;
    if (!uid || !this.token) return 0;
    const call = (path: string, method: string, body?: unknown) =>
      req<unknown>(this.url, this.token, path, method, body);
    const matchExercise = async (date: string, exercise: string, want: boolean) => {
      const d = await this.authed<{ day: DayData }>(`/api/bootstrap?date=${date}`);
      const has = d.day.done.includes(exercise);
      if (has !== want) await this.authed('/api/exercises/toggle', 'POST', { date, exercise });
    };
    return flushQueue(this.url, this.token, uid, call, matchExercise);
  }

  async getState() {
    try {
      const d = await req<{
        user: NonNullable<Awaited<ReturnType<DbApi['getState']>>['user']>;
        profile: Awaited<ReturnType<DbApi['getState']>>['profile'];
        targets: Awaited<ReturnType<DbApi['getState']>>['targets'];
        achievements: Awaited<ReturnType<DbApi['getState']>>['achievements'];
      }>(this.url, this.token, `/api/bootstrap?date=${todayStr()}`);
      const uid = this.uid;
      if (uid) {
        if (d.profile && d.targets) saveProfileShadow(uid, d.profile, d.targets);
        saveAchShadow(uid, d.achievements);
      }
      return { user: d.user, profile: d.profile, targets: d.targets, achievements: d.achievements };
    } catch (e) {
      if ((e as { code?: string })?.code === 'no_token' || (e as { code?: string })?.code === 'token_invalido') {
        return { user: null, profile: null, targets: null, achievements: [] };
      }
      throw e;
    }
  }

  async register(u: { name: string; email: string; password: string }): Promise<AuthResult> {
    try {
      const d = await req<{ token: string; user: AuthUser }>(this.url, '', '/api/auth/register', 'POST', u);
      saveSession(this.url, d.token);
      return { ok: true, user: d.user };
    } catch (e) {
      return { ok: false, error: (e as { code?: string }).code || 'server_error' };
    }
  }

  async login(u: { email: string; password: string }): Promise<AuthResult> {
    try {
      const d = await req<{ token: string; user: AuthUser }>(this.url, '', '/api/auth/login', 'POST', u);
      saveSession(this.url, d.token);
      return { ok: true, user: d.user };
    } catch (e) {
      return { ok: false, error: (e as { code?: string }).code || 'server_error' };
    }
  }

  async googleSignIn(): Promise<AuthResult> {
    try {
      const bridge = window.kaloryDb;
      if (!bridge?.getGoogleIdToken) return { ok: false, error: 'solo_exe' };
      const t = await bridge.getGoogleIdToken();
      if (!t.ok) return { ok: false, error: (t as { error: string }).error, detail: (t as { detail?: string }).detail };
      const d = await req<{ token: string; user: AuthUser }>(
        this.url, '', '/api/auth/google', 'POST', { idToken: (t as { idToken: string }).idToken });
      saveSession(this.url, d.token);
      return { ok: true, user: d.user };
    } catch (e) {
      return { ok: false, error: (e as { code?: string }).code || 'server_error' };
    }
  }

  async logout() {
    clearServerSession();
    return true;
  }

  async getGoogleClientId() {
    return window.kaloryDb?.getGoogleClientId?.() ?? '';
  }
  async setGoogleClientId(clientId: string) {
    if (window.kaloryDb?.setGoogleClientId) await window.kaloryDb.setGoogleClientId(clientId);
    return true;
  }

  async saveProfile(p: { profile: UserProfile; targets: MacroTargets }) {
    const uid = this.uid;
    try {
      await req(this.url, this.token, '/api/profile', 'PUT', p);
      if (uid) { saveProfileShadow(uid, p.profile, p.targets); }
    } catch (e) {
      if (uid && isOfflineError(e)) {
        enqueue(uid, { kind: 'profile', payload: p as unknown as Record<string, unknown> });
        saveProfileShadow(uid, p.profile, p.targets);
        return true;
      }
      throw e;
    }
    return true;
  }

  async logFood(f: { date: string; name: string; kcal: number; protein?: number; carbs?: number; fat?: number; meal?: string }) {
    const uid = this.uid;
    try {
      const d = await req<{ id: number }>(this.url, this.token, '/api/foods', 'POST', f);
      return d.id;
    } catch (e) {
      if (uid && isOfflineError(e)) {
        enqueue(uid, { kind: 'food', payload: f as unknown as Record<string, unknown> });
        return applyFood(uid, f.date, f);
      }
      throw e;
    }
  }

  async deleteFood(id: number) {
    const uid = this.uid;
    // la fecha se resuelve en la sombra si existe
    try {
      await fetch(this.url + '/api/foods/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + this.token } });
    } catch (e) {
      if (uid && isOfflineError(e)) {
        enqueue(uid, { kind: 'deleteFood', payload: { id } });
        // quítalo de todas las sombras del día conocido
        return true;
      }
      throw e;
    }
    return true;
  }

  async getDay(date: string): Promise<DayData> {
    const uid = this.uid;
    try {
      const d = await req<{ day: DayData }>(this.url, this.token, `/api/bootstrap?date=${date}`);
      if (uid) saveDay(uid, d.day);
      return d.day;
    } catch (e) {
      if (uid && isOfflineError(e)) {
        return loadDay(uid, date) ?? { date, foods: [], waterMl: 0, done: [] };
      }
      throw e;
    }
  }

  async logWater(w: { date: string; ml: number }) {
    const uid = this.uid;
    try {
      const d = await req<{ total: number }>(this.url, this.token, '/api/water', 'POST', w);
      return d.total;
    } catch (e) {
      if (uid && isOfflineError(e)) {
        enqueue(uid, { kind: 'water', payload: w as unknown as Record<string, unknown> });
        return applyWater(uid, w.date, w.ml);
      }
      throw e;
    }
  }

  async toggleExercise(t: { date: string; exercise: string }) {
    const uid = this.uid;
    try {
      const d = await req<{ done: boolean }>(this.url, this.token, '/api/exercises/toggle', 'POST', t);
      return d.done;
    } catch (e) {
      if (uid && isOfflineError(e)) {
        const done = applyToggle(uid, t.date, t.exercise);
        enqueue(uid, { kind: 'exercise', payload: { ...t, want: done } });
        return done;
      }
      throw e;
    }
  }

  async unlock(id: string) {
    const uid = this.uid;
    try {
      const d = await req<{ at: string }>(this.url, this.token, '/api/achievements/unlock', 'POST', { id });
      return d.at;
    } catch (e) {
      if (uid && isOfflineError(e)) {
        enqueue(uid, { kind: 'unlock', payload: { id } });
        return applyUnlock(uid, id);
      }
      throw e;
    }
  }

  async stats() {
    const d = await req<{ stats: { totalFoods: number; activeDays: number } }>(this.url, this.token, `/api/bootstrap?date=${todayStr()}`);
    return d.stats;
  }

  async resetAll() {
    await fetch(this.url + '/api/account/data', { method: 'DELETE', headers: { Authorization: 'Bearer ' + this.token } });
    return true;
  }

  async setWeight(w: { date: string; weight: number }) {
    const uid = this.uid;
    try {
      await req(this.url, this.token, '/api/weight', 'POST', w);
    } catch (e) {
      if (uid && isOfflineError(e)) {
        enqueue(uid, { kind: 'weight', payload: w as unknown as Record<string, unknown> });
        return true;
      }
      throw e;
    }
    return true;
  }

  async getWeights(r: { from: string; to: string }) {
    const uid = this.uid;
    try {
      const d = await req<{ weights: import('../types').WeightEntry[] }>(this.url, this.token, `/api/weights?from=${r.from}&to=${r.to}`);
      if (uid) saveWeights(uid, d.weights);
      return d.weights;
    } catch (e) {
      if (uid && isOfflineError(e)) return loadWeights(uid);
      throw e;
    }
  }

  async getHistory(r: { from: string; to: string }) {
    const uid = this.uid;
    try {
      const d = await req<{ days: import('../types').DayHistory[] }>(this.url, this.token, `/api/history?from=${r.from}&to=${r.to}`);
      if (uid) saveHistory(uid, d.days);
      return d.days;
    } catch (e) {
      if (uid && isOfflineError(e)) {
        const cached = loadHistory(uid).filter((x) => x.date >= r.from && x.date <= r.to);
        if (cached.length > 0) return cached;
        // sin caché: construye vacío para el rango
        const out: import('../types').DayHistory[] = [];
        for (let d = r.from; d <= r.to;) {
          out.push({ date: d, kcal: 0, protein: 0, carbs: 0, fat: 0, waterMl: 0, exercises: 0, weight: null });
          const dt = new Date(d + 'T12:00:00');
          dt.setDate(dt.getDate() + 1);
          d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          if (out.length > 400) break;
        }
        return out;
      }
      throw e;
    }
  }

  async exportData() {
    const d = await req<{ backup: Record<string, unknown> }>(this.url, this.token, '/api/export');
    return d.backup;
  }

  // ---- comunidad (solo online) ----
  async getInviteCode() {
    const d = await req<{ code: string }>(this.url, this.token, '/api/social/code');
    return d.code;
  }
  async addFriend(code: string) {
    const d = await req<{ friend: import('../types').AuthUser }>(this.url, this.token, '/api/social/add', 'POST', { code });
    return d.friend;
  }
  async getFriends() {
    const d = await req<{ friends: import('../types').FriendInfo[] }>(this.url, this.token, '/api/social/friends');
    return d.friends;
  }
  async getLeaderboard() {
    const d = await req<{ board: import('../types').BoardRow[] }>(this.url, this.token, '/api/social/leaderboard');
    return d.board;
  }
}
