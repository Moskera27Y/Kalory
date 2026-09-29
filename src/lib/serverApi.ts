import type { AuthResult, AuthUser, DayData, MacroTargets, UserProfile } from '../types';
import type { DbApi } from './db';
import { todayStr } from './db';

/** Sesión del servidor online (URL + JWT) guardada en este equipo. */
const LS_KEY = 'kalory-server-v1';

/** Servidor oficial: la app se conecta sola sin pedir nada al usuario.
 *  Se rellena con la URL real al desplegar el servidor (https://...).
 *  Vacío = modo local (datos solo en este equipo). */
export const DEFAULT_SERVER_URL = '';

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

  async getState() {
    try {
      const d = await req<{
        user: NonNullable<Awaited<ReturnType<DbApi['getState']>>['user']>;
        profile: Awaited<ReturnType<DbApi['getState']>>['profile'];
        targets: Awaited<ReturnType<DbApi['getState']>>['targets'];
        achievements: Awaited<ReturnType<DbApi['getState']>>['achievements'];
      }>(this.url, this.token, `/api/bootstrap?date=${todayStr()}`);
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
      if (!t.ok) return { ok: false, error: (t as { error: string }).error };
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
    await req(this.url, this.token, '/api/profile', 'PUT', p);
    return true;
  }

  async logFood(f: { date: string; name: string; kcal: number; protein?: number; carbs?: number; fat?: number; meal?: string }) {
    const d = await req<{ id: number }>(this.url, this.token, '/api/foods', 'POST', f);
    return d.id;
  }

  async deleteFood(id: number) {
    await fetch(this.url + '/api/foods/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + this.token } });
    return true;
  }

  async getDay(date: string): Promise<DayData> {
    const d = await req<{ day: DayData }>(this.url, this.token, `/api/bootstrap?date=${date}`);
    return d.day;
  }

  async logWater(w: { date: string; ml: number }) {
    const d = await req<{ total: number }>(this.url, this.token, '/api/water', 'POST', w);
    return d.total;
  }

  async toggleExercise(t: { date: string; exercise: string }) {
    const d = await req<{ done: boolean }>(this.url, this.token, '/api/exercises/toggle', 'POST', t);
    return d.done;
  }

  async unlock(id: string) {
    const d = await req<{ at: string }>(this.url, this.token, '/api/achievements/unlock', 'POST', { id });
    return d.at;
  }

  async stats() {
    const d = await req<{ stats: { totalFoods: number; activeDays: number } }>(this.url, this.token, `/api/bootstrap?date=${todayStr()}`);
    return d.stats;
  }

  async resetAll() {
    await fetch(this.url + '/api/account/data', { method: 'DELETE', headers: { Authorization: 'Bearer ' + this.token } });
    return true;
  }
}
