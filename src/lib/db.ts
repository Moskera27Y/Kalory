import type { DayData, DayHistory, FoodEntry, MacroTargets, UserProfile, AchievementRow, AuthUser, AuthResult, WeightEntry } from '../types';

/**
 * Acceso a datos: usa SQLite local (vía preload en el .exe) o
 * localStorage como fallback cuando se ejecuta en navegador (dev).
 */
export interface DbApi {
  getState: () => Promise<{ user: AuthUser | null; profile: UserProfile | null; targets: MacroTargets | null; achievements: AchievementRow[] }>;
  register: (u: { name: string; email: string; password: string }) => Promise<AuthResult>;
  login: (u: { email: string; password: string }) => Promise<AuthResult>;
  googleSignIn: () => Promise<AuthResult>;
  getGoogleIdToken?: () => Promise<{ ok: true; idToken: string } | { ok: false; error: string }>;
  logout: () => Promise<boolean>;
  getGoogleClientId: () => Promise<string>;
  setGoogleClientId: (clientId: string) => Promise<boolean>;
  saveProfile: (p: { profile: UserProfile; targets: MacroTargets }) => Promise<boolean>;
  logFood: (f: { date: string; name: string; kcal: number; protein?: number; carbs?: number; fat?: number; meal?: string }) => Promise<number>;
  deleteFood: (id: number) => Promise<boolean>;
  getDay: (date: string) => Promise<DayData>;
  logWater: (w: { date: string; ml: number }) => Promise<number>;
  toggleExercise: (t: { date: string; exercise: string }) => Promise<boolean>;
  unlock: (id: string) => Promise<string>;
  stats: () => Promise<{ totalFoods: number; activeDays: number }>;
  resetAll: () => Promise<boolean>;
  setWeight: (w: { date: string; weight: number }) => Promise<boolean>;
  getWeights: (r: { from: string; to: string }) => Promise<WeightEntry[]>;
  getHistory: (r: { from: string; to: string }) => Promise<DayHistory[]>;
  exportData: () => Promise<Record<string, unknown>>;
  backupDb?: () => Promise<string | null>;
  restoreDb?: () => Promise<boolean>;
}

declare global {
  interface Window { kaloryDb?: DbApi }
}

// ---------------- Fallback navegador (solo desarrollo) ----------------
interface FbUser extends AuthUser { pwdHash: string; pwdSalt: string }
interface FallbackState {
  users: FbUser[];
  sessionId: number | null;
  profiles: Record<number, { profile: UserProfile; targets: MacroTargets }>;
  achievements: (AchievementRow & { userId: number })[];
  foods: (FoodEntry & { userId: number })[];
  water: { userId: number; date: string; ml: number }[];
  workouts: { userId: number; date: string; exercise: string }[];
  weights: { userId: number; date: string; weight: number }[];
  googleClientId: string;
  seq: number;
}

const KEY = 'kalory-fallback-v2';

function loadFb(): FallbackState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as FallbackState;
  } catch { /* ignore */ }
  return { users: [], sessionId: null, profiles: {}, achievements: [], foods: [], water: [], workouts: [], weights: [], googleClientId: '', seq: 1 };
}

function saveFb(s: FallbackState) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

async function fbHash(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}::${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

const fallback: DbApi = {
  async getState() {
    const s = loadFb();
    const u = s.users.find((x) => x.id === s.sessionId) ?? null;
    if (!u) return { user: null, profile: null, targets: null, achievements: [] };
    const p = s.profiles[u.id];
    return {
      user: { id: u.id, name: u.name, email: u.email, provider: u.provider },
      profile: p?.profile ?? null,
      targets: p?.targets ?? null,
      achievements: s.achievements.filter((a) => a.userId === u.id),
    };
  },
  async register({ name, email, password }) {
    const s = loadFb();
    name = name.trim(); email = email.trim().toLowerCase();
    if (name.length < 2) return { ok: false, error: 'nombre_corto' };
    if (!validEmail(email)) return { ok: false, error: 'email_invalido' };
    if (password.length < 6) return { ok: false, error: 'clave_corta' };
    if (s.users.some((x) => x.email === email)) return { ok: false, error: 'email_en_uso' };
    const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const id = s.seq++;
    s.users.push({ id, name, email, provider: 'local', pwdHash: await fbHash(password, salt), pwdSalt: salt });
    s.sessionId = id;
    saveFb(s);
    return { ok: true, user: { id, name, email, provider: 'local' } };
  },
  async login({ email, password }) {
    const s = loadFb();
    email = email.trim().toLowerCase();
    const u = s.users.find((x) => x.email === email);
    if (!u || (await fbHash(password, u.pwdSalt)) !== u.pwdHash) return { ok: false, error: 'credenciales' };
    s.sessionId = u.id;
    saveFb(s);
    return { ok: true, user: { id: u.id, name: u.name, email: u.email, provider: u.provider } };
  },
  async googleSignIn() {
    return { ok: false, error: 'solo_exe' };
  },
  async getGoogleIdToken() {
    return { ok: false, error: 'solo_exe' };
  },
  async logout() {
    const s = loadFb();
    s.sessionId = null;
    saveFb(s);
    return true;
  },
  async getGoogleClientId() {
    return loadFb().googleClientId;
  },
  async setGoogleClientId(clientId) {
    const s = loadFb();
    s.googleClientId = clientId.trim();
    saveFb(s);
    return true;
  },
  async saveProfile(p) {
    const s = loadFb();
    if (s.sessionId == null) throw Object.assign(new Error('no_session'), { code: 'no_session' });
    s.profiles[s.sessionId] = p;
    saveFb(s);
    return true;
  },
  async logFood(f) {
    const s = loadFb();
    if (s.sessionId == null) throw Object.assign(new Error('no_session'), { code: 'no_session' });
    const id = s.seq++;
    s.foods.push({ id, userId: s.sessionId, date: f.date, name: f.name, kcal: f.kcal, protein: f.protein ?? 0, carbs: f.carbs ?? 0, fat: f.fat ?? 0, meal: f.meal ?? 'extra' });
    saveFb(s);
    return id;
  },
  async deleteFood(id) {
    const s = loadFb();
    s.foods = s.foods.filter((x) => !(x.id === id && x.userId === s.sessionId));
    saveFb(s);
    return true;
  },
  async getDay(date) {
    const s = loadFb();
    const uid = s.sessionId;
    const foods = s.foods.filter((x) => x.userId === uid && x.date === date);
    const waterMl = Math.max(0, s.water.filter((x) => x.userId === uid && x.date === date).reduce((a, x) => a + x.ml, 0));
    const done = s.workouts.filter((x) => x.userId === uid && x.date === date).map((x) => x.exercise);
    return { date, foods, waterMl, done };
  },
  async logWater(w) {
    const s = loadFb();
    if (s.sessionId == null) throw Object.assign(new Error('no_session'), { code: 'no_session' });
    s.water.push({ userId: s.sessionId, ...w });
    saveFb(s);
    return Math.max(0, s.water.filter((x) => x.userId === s.sessionId && x.date === w.date).reduce((a, x) => a + x.ml, 0));
  },
  async toggleExercise(t) {
    const s = loadFb();
    const i = s.workouts.findIndex((x) => x.userId === s.sessionId && x.date === t.date && x.exercise === t.exercise);
    if (i >= 0) s.workouts.splice(i, 1);
    else s.workouts.push({ userId: s.sessionId as number, ...t });
    saveFb(s);
    return i < 0;
  },
  async unlock(id) {
    const s = loadFb();
    const at = new Date().toISOString();
    if (s.sessionId != null && !s.achievements.some((a) => a.userId === s.sessionId && a.id === id)) {
      s.achievements.push({ userId: s.sessionId, id, unlocked_at: at });
    }
    saveFb(s);
    return at;
  },
  async stats() {
    const s = loadFb();
    const uid = s.sessionId;
    const days = new Set([
      ...s.foods.filter((x) => x.userId === uid).map((x) => x.date),
      ...s.water.filter((x) => x.userId === uid && x.ml > 0).map((x) => x.date),
      ...s.workouts.filter((x) => x.userId === uid).map((x) => x.date),
    ]);
    return { totalFoods: s.foods.filter((x) => x.userId === uid).length, activeDays: days.size };
  },
  async resetAll() {
    const s = loadFb();
    const uid = s.sessionId;
    delete s.profiles[uid as number];
    s.foods = s.foods.filter((x) => x.userId !== uid);
    s.water = s.water.filter((x) => x.userId !== uid);
    s.workouts = s.workouts.filter((x) => x.userId !== uid);
    s.achievements = s.achievements.filter((x) => x.userId !== uid);
    s.weights = s.weights.filter((x) => x.userId !== uid);
    saveFb(s);
    return true;
  },
  async setWeight(w) {
    const s = loadFb();
    if (s.sessionId == null) throw Object.assign(new Error('no_session'), { code: 'no_session' });
    s.weights = s.weights.filter((x) => !(x.userId === s.sessionId && x.date === w.date));
    s.weights.push({ userId: s.sessionId, ...w });
    saveFb(s);
    return true;
  },
  async getWeights(r) {
    const s = loadFb();
    return s.weights
      .filter((x) => x.userId === s.sessionId && x.date >= r.from && x.date <= r.to)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map(({ date, weight }) => ({ date, weight }));
  },
  async getHistory(r) {
    const s = loadFb();
    const uid = s.sessionId;
    const map = new Map<string, DayHistory>();
    const get = (date: string): DayHistory => {
      if (!map.has(date)) map.set(date, { date, kcal: 0, protein: 0, carbs: 0, fat: 0, waterMl: 0, exercises: 0, weight: null });
      return map.get(date)!;
    };
    for (const f of s.foods.filter((x) => x.userId === uid && x.date >= r.from && x.date <= r.to)) {
      const d = get(f.date);
      d.kcal += f.kcal; d.protein += f.protein; d.carbs += f.carbs; d.fat += f.fat;
    }
    for (const w of s.water.filter((x) => x.userId === uid && x.date >= r.from && x.date <= r.to)) {
      get(w.date).waterMl = Math.max(0, get(w.date).waterMl + w.ml);
    }
    for (const x of s.workouts.filter((x) => x.userId === uid && x.date >= r.from && x.date <= r.to)) {
      get(x.date).exercises += 1;
    }
    for (const w of s.weights.filter((x) => x.userId === uid && x.date >= r.from && x.date <= r.to)) {
      get(w.date).weight = w.weight;
    }
    const out: DayHistory[] = [];
    for (let d = r.from; d <= r.to; d = addDay(d)) {
      out.push(map.get(d) || { date: d, kcal: 0, protein: 0, carbs: 0, fat: 0, waterMl: 0, exercises: 0, weight: null });
    }
    return out;
  },
  async exportData() {
    const s = loadFb();
    const uid = s.sessionId;
    const p = uid != null ? s.profiles[uid] : undefined;
    const u = s.users.find((x) => x.id === uid);
    return {
      type: 'kalory-backup', version: 1, exported_at: new Date().toISOString(),
      user: u ? { id: u.id, name: u.name, email: u.email, provider: u.provider } : null,
      profile: p?.profile ?? null,
      targets: p?.targets ?? null,
      foods: s.foods.filter((x) => x.userId === uid),
      waters: s.water.filter((x) => x.userId === uid),
      workouts: s.workouts.filter((x) => x.userId === uid),
      achievements: s.achievements.filter((x) => x.userId === uid),
      weights: s.weights.filter((x) => x.userId === uid),
    };
  },
};

export function getDb(): DbApi {
  return window.kaloryDb ?? fallback;
}

export function isDesktop(): boolean {
  return !!window.kaloryDb;
}

export function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDay(s: string): string {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export const AUTH_ERRORS: Record<string, string> = {
  nombre_corto: 'Escribe tu nombre (mínimo 2 letras).',
  email_invalido: 'Ese correo no parece válido.',
  clave_corta: 'La contraseña debe tener al menos 6 caracteres.',
  email_en_uso: 'Ese correo ya tiene cuenta. Inicia sesión.',
  credenciales: 'Correo o contraseña incorrectos.',
  no_client_id: 'Falta configurar el Client ID de Google (ver ayuda abajo).',
  cancelled: 'Cancelaste el acceso con Google.',
  timeout: 'Se agotó el tiempo de espera (¿cerraste el navegador?). Vuelve y pulsa de nuevo Continuar con Google.',
  bad_state: 'Verificación de seguridad fallida. Inténtalo de nuevo.',
  token_exchange_failed: 'Google no completó el acceso. Revisa tu Client ID.',
  google_error: 'No se pudo completar el acceso con Google.',
  solo_exe: 'El acceso con Google solo está disponible en el programa instalado (.exe).',
  server_error: 'No se pudo contactar al servidor. Revisa tu conexión.',
  google_invalido: 'Google no validó el acceso en el servidor.',
  sin_public_url: 'Servidor sin URL pública configurada.',
  expirado: 'El acceso expiró. Inténtalo de nuevo.',
};
