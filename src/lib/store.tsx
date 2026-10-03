import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthResult, AuthUser, DayData, DayHistory, MacroTargets, UserProfile, WeightEntry } from '../types';
import { calcMacros } from './calculations';
import { getDb, todayStr, daysAgo, type DbApi } from './db';
import { ServerDb, clearServerSession, loadServerUrl, setServerUrlOnly, clearServerOverride, pendingCount } from './serverApi';
import { getStepsToday, isNative, stepsPluginAvailable } from './steps';
import { loadProfileShadow, loadAchShadow, loadDay, uidFromToken } from './syncQueue';

interface Store {
  loading: boolean;
  user: AuthUser | null;
  profile: UserProfile | null;
  targets: MacroTargets | null;
  onboarded: boolean;
  day: DayData;
  achievements: string[];
  achievementDates: Record<string, string>;
  activeDays: number;
  consumed: number;
  proteinEaten: number;
  carbsEaten: number;
  fatEaten: number;
  celebration: string | null;
  dismissCelebration: () => void;
  serverUrl: string;
  setServerUrl: (url: string) => void;
  useOfficialServer: () => void;
  register: (u: { name: string; email: string; password: string }) => Promise<AuthResult>;
  login: (u: { email: string; password: string }) => Promise<AuthResult>;
  googleSignIn: () => Promise<AuthResult>;
  logout: () => Promise<void>;
  completeOnboarding: (p: UserProfile) => Promise<MacroTargets>;
  refresh: () => Promise<void>;
  logFood: (f: { name: string; kcal: number; protein?: number; carbs?: number; fat?: number; meal?: string }) => Promise<void>;
  deleteFood: (id: number) => Promise<void>;
  logWater: (ml: number) => Promise<void>;
  toggleExercise: (exercise: string, sessionSize: number) => Promise<void>;
  resetAll: () => Promise<void>;
  unlockMedal: (id: string) => Promise<void>;
  history: DayHistory[];
  weights: WeightEntry[];
  streak: number;
  weekWorkouts: number;
  steps: number | null;
  stepsSupported: boolean;
  stepsError: string | null;
  refreshSteps: () => Promise<void>;
  syncPending: number;
  refreshSync: () => Promise<void>;
  getInviteCode: () => Promise<string>;
  addFriend: (code: string) => Promise<import('../types').AuthUser>;
  getFriends: () => Promise<import('../types').FriendInfo[]>;
  getLeaderboard: () => Promise<import('../types').BoardRow[]>;
  refreshHistory: () => Promise<void>;
  setWeight: (weight: number, date?: string) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);
const EMPTY_DAY: DayData = { date: '', foods: [], waterMl: 0, done: [] };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [serverUrl] = useState(() => loadServerUrl());
  const [db] = useState<DbApi>(() => (serverUrl ? new ServerDb(serverUrl) : getDb()));
  const setServerUrl = (url: string) => {
    setServerUrlOnly(url);
    window.location.reload();
  };
  const useOfficialServer = () => {
    clearServerOverride();
    window.location.reload();
  };
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [targets, setTargets] = useState<MacroTargets | null>(null);
  const [day, setDay] = useState<DayData>(EMPTY_DAY);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [achievementDates, setAchievementDates] = useState<Record<string, string>>({});
  const [activeDays, setActiveDays] = useState(0);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [history, setHistory] = useState<DayHistory[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [weekWorkouts, setWeekWorkouts] = useState(0);
  const [steps, setSteps] = useState<number | null>(null);
  const [stepsSupported, setStepsSupported] = useState(false);
  const [stepsError, setStepsError] = useState<string | null>(null);
  const [syncPending, setSyncPending] = useState(0);

  const clearLocal = () => {
    setProfile(null);
    setTargets(null);
    setDay({ ...EMPTY_DAY, date: todayStr() });
    setAchievements([]);
    setAchievementDates({});
    setActiveDays(0);
    setHistory([]);
    setWeights([]);
    setStreak(0);
    setWeekWorkouts(0);
    setSteps(null);
    setStepsSupported(false);
    setStepsError(null);
    setSyncPending(0);
  };

  const isActiveDay = (d: DayHistory) => d.kcal > 0 || d.waterMl > 0 || d.exercises > 0;

  /** Carga historial (30 días), racha, entrenos de la semana y medallas asociadas. */
  const refreshHistory = async () => {
    if (!user) return;
    const to = todayStr();
    const from = daysAgo(60);
    const h = await db.getHistory({ from, to });
    setHistory(h.filter((d) => d.date >= daysAgo(30)));
    setWeights(await db.getWeights({ from: daysAgo(120), to }));
    // Racha: días activos consecutivos (hoy puede estar vacío)
    const desc = [...h].reverse();
    if (desc.length && !isActiveDay(desc[0])) desc.shift();
    let s = 0;
    for (const d of desc) {
      if (isActiveDay(d)) s++;
      else break;
    }
    setStreak(s);
    // Entrenos de la semana actual (lunes-domingo)
    const nowD = new Date();
    const dow = (nowD.getDay() + 6) % 7;
    const monday = new Date(nowD);
    monday.setDate(nowD.getDate() - dow);
    const mStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    setWeekWorkouts(h.filter((d) => d.date >= mStr).reduce((a, d) => a + d.exercises, 0));
    let list = achievements;
    if (s >= 7) list = await unlock('racha_7', list);
    const weekActive = h.filter((d) => d.date >= mStr && d.exercises > 0).length;
    if (profile && profile.daysPerWeek > 0 && weekActive >= profile.daysPerWeek) {
      list = await unlock('semana_perfecta', list);
    }
    void list;
  };

  const refreshSync = async () => {
    if (!('syncNow' in db)) {
      setSyncPending(0);
      return;
    }
    try {
      const had = syncPending;
      const left = await (db as unknown as { syncNow: () => Promise<number> }).syncNow();
      setSyncPending(left);
      if (had > 0 && left === 0) await refresh();
    } catch {
      /* sin conexión: se reintenta luego */
    }
  };

  const onlineDb = () => {
    if (!('getLeaderboard' in db)) throw Object.assign(new Error('solo_online'), { code: 'solo_online' });
    return db as unknown as {
      getInviteCode: () => Promise<string>;
      addFriend: (c: string) => Promise<import('../types').AuthUser>;
      getFriends: () => Promise<import('../types').FriendInfo[]>;
      getLeaderboard: () => Promise<import('../types').BoardRow[]>;
    };
  };

  const refresh = async () => {
    const date = todayStr();
    try {
      const st = await db.getState();
      setUser(st.user);
      if (!st.user) {
        clearLocal();
        return;
      }
      const [d, stats] = await Promise.all([db.getDay(date), db.stats()]);
      setProfile(st.profile);
      setTargets(st.targets);
      setDay(d);
      setAchievements(st.achievements.map((a) => a.id));
      setAchievementDates(Object.fromEntries(st.achievements.map((a) => [a.id, a.unlocked_at])));
      setActiveDays(stats.activeDays);
      await refreshSync();
    } catch (e) {
      // Sin sesión en el servidor → volver a bienvenida
      if ((e as { code?: string })?.code === 'no_session') {
        setUser(null);
        clearLocal();
      } else if (e instanceof TypeError && 'syncNow' in db) {
        // Sin internet: usa la última copia guardada en este equipo
        try {
          const raw = localStorage.getItem('kalory-server-v1');
          const uid = uidFromToken(JSON.parse(raw || 'null')?.token || '');
          if (uid != null) {
            const sp = loadProfileShadow(uid);
            if (sp) {
              setProfile(sp.profile);
              setTargets(sp.targets);
              setAchievements(loadAchShadow(uid).map((a) => a.id));
              setAchievementDates(Object.fromEntries(loadAchShadow(uid).map((a) => [a.id, a.unlocked_at])));
              setDay(loadDay(uid, date) ?? { date, foods: [], waterMl: 0, done: [] });
              setSyncPending(pendingCount(uid));
              // mantiene la sesión aparente sin user real
              setUser((u) => u ?? { id: uid, name: sp.profile.name, email: '', provider: 'offline' });
              return;
            }
          }
        } catch { /* ignore */ }
        throw e;
      } else throw e;
    }
  };

  useEffect(() => {
    refresh().catch(() => undefined).finally(() => setLoading(false));
    const onOnline = () => refreshSync().catch(() => undefined);
    window.addEventListener('online', onOnline);
    const iv = window.setInterval(() => refreshSync().catch(() => undefined), 5 * 60 * 1000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user && profile) refreshHistory().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, day.date]);

  useEffect(() => {
    if (user) refreshSteps().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const afterAuth = async (r: AuthResult): Promise<AuthResult> => {
    if (r.ok) {
      setCelebration(r.user.name);
      await refresh();
    }
    return r;
  };

  const dismissCelebration = () => setCelebration(null);

  const refreshSteps = async () => {
    const native = isNative();
    const supported = native && stepsPluginAvailable();
    setStepsSupported(supported);
    if (!user || !supported) {
      if (!supported) {
        setSteps(null);
        // En móvil sin plugin: el mensaje dice la causa real en vez de silencio
        setStepsError(native ? 'Plugin de Salud ausente: genera el IPA/APK de nuevo.' : null);
      }
      return;
    }
    try {
      const s = await getStepsToday(user.id);
      setSteps(s);
      setStepsError(null);
      if (s >= 10000) await unlock('pasos_10k', achievements);
    } catch (e) {
      setSteps(null);
      const code = (e as Error)?.message || 'error';
      setStepsError(
        code === 'permiso_denegado'
          ? 'Permiso denegado: actívalo en Ajustes → Salud y toca de nuevo.'
          : code === 'sin_sensor' || code === 'sin_healthkit'
            ? 'Salud no disponible: abre la app Salud del iPhone una vez y vuelve.'
            : code === 'no_plugin'
              ? 'Instala el IPA/APK nuevo: esta versión no trae el plugin de pasos.'
              : 'Toca para intentar de nuevo.',
      );
    }
  };

  const unlockMedal = async (id: string) => {
    await unlock(id, achievements);
  };  const register = (u: { name: string; email: string; password: string }) => db.register(u).then(afterAuth);
  const login = (u: { email: string; password: string }) => db.login(u).then(afterAuth);
  const googleSignIn = () => db.googleSignIn().then(afterAuth);
  const logout = async () => {
    await db.logout();
    setUser(null);
    setCelebration(null);
    clearLocal();
  };

  const unlock = async (id: string, already: string[]) => {
    if (already.includes(id)) return already;
    const at = await db.unlock(id);
    const next = [...already, id];
    setAchievements(next);
    setAchievementDates((m) => ({ ...m, [id]: at }));
    return next;
  };

  /** Evalúa medallas tras cada acción con datos frescos */
  const evaluate = async (d: DayData, t: MacroTargets | null, statsActiveDays: number, current: string[]) => {
    let list = current;
    if (d.foods.length >= 1) list = await unlock('primera_comida', list);
    if (t && d.waterMl >= t.waterMl && t.waterMl > 0) list = await unlock('hidratado', list);
    if (d.done.length >= 1) list = await unlock('primera_rutina', list);
    if (t && d.foods.reduce((a, f) => a + f.kcal, 0) >= t.calories * 0.9) list = await unlock('en_meta', list);
    if (statsActiveDays >= 3) list = await unlock('constancia_3', list);
  };

  const completeOnboarding = async (p: UserProfile) => {
    const macros = calcMacros(p);
    await db.saveProfile({ profile: p, targets: macros });
    let list = await unlock('primer_paso', achievements);
    const full = p.name.trim() && p.targetWeightKg > 0 && p.allergies.trim() && p.daysPerWeek >= 1 && p.mealsPerDay >= 1;
    if (full) list = await unlock('perfil_completo', list);
    void list;
    await refresh();
    return macros;
  };

  const logFood = async (f: { name: string; kcal: number; protein?: number; carbs?: number; fat?: number; meal?: string }) => {
    await db.logFood({ date: todayStr(), ...f });
    const d = await db.getDay(todayStr());
    setDay(d);
    const s = await db.stats();
    setActiveDays(s.activeDays);
    await evaluate(d, targets, s.activeDays, achievements);
    refreshSync().catch(() => undefined);
  };

  const deleteFood = async (id: number) => {
    await db.deleteFood(id);
    setDay(await db.getDay(todayStr()));
  };

  const logWater = async (ml: number) => {
    const total = await db.logWater({ date: todayStr(), ml });
    const d = await db.getDay(todayStr());
    setDay({ ...d, waterMl: total });
    const s = await db.stats();
    setActiveDays(s.activeDays);
    await evaluate({ ...d, waterMl: total }, targets, s.activeDays, achievements);
    refreshSync().catch(() => undefined);
  };

  const toggleExercise = async (exercise: string, sessionSize: number) => {
    await db.toggleExercise({ date: todayStr(), exercise });
    const d = await db.getDay(todayStr());
    setDay(d);
    let list = achievements;
    if (d.done.length >= 1) list = await unlock('primera_rutina', list);
    if (d.done.length >= sessionSize && sessionSize > 0) list = await unlock('sesion_completa', list);
    void list;
    const s = await db.stats();
    setActiveDays(s.activeDays);
    await refreshHistory().catch(() => undefined);
    refreshSync().catch(() => undefined);
  };

  const resetAll = async () => {
    await db.resetAll();
    clearLocal();
  };

  const setWeight = async (weight: number, date?: string) => {
    const d = date || todayStr();
    if (!Number.isFinite(weight) || weight <= 20 || weight > 400) return;
    await db.setWeight({ date: d, weight });
    await refreshHistory();
    const ws = await db.getWeights({ from: '2000-01-01', to: '2999-12-31' });
    setWeights(ws);
    if (profile && Math.abs(weight - profile.targetWeightKg) <= 1) {
      await unlock('peso_meta', achievements);
    }
  };

  const consumed = day.foods.reduce((a, f) => a + f.kcal, 0);
  const proteinEaten = day.foods.reduce((a, f) => a + f.protein, 0);
  const carbsEaten = day.foods.reduce((a, f) => a + f.carbs, 0);
  const fatEaten = day.foods.reduce((a, f) => a + f.fat, 0);

  return (
    <Ctx.Provider
      value={{
        loading, user, profile, targets, onboarded: !!user && !!profile, day,
        achievements, achievementDates, activeDays,
        consumed, proteinEaten, carbsEaten, fatEaten,
        celebration, dismissCelebration,
        serverUrl, setServerUrl, useOfficialServer,
        register, login, googleSignIn, logout,
        completeOnboarding, refresh, logFood, deleteFood, logWater, toggleExercise, resetAll, unlockMedal,
        history, weights, streak, weekWorkouts, refreshHistory, setWeight, steps, stepsSupported, stepsError, refreshSteps, syncPending, refreshSync,
        getInviteCode: () => onlineDb().getInviteCode(),
        addFriend: (c) => onlineDb().addFriend(c),
        getFriends: () => onlineDb().getFriends(),
        getLeaderboard: () => onlineDb().getLeaderboard(),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore fuera del provider');
  return v;
}
