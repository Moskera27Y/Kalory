import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthResult, AuthUser, DayData, MacroTargets, UserProfile } from '../types';
import { calcMacros } from './calculations';
import { getDb, todayStr, type DbApi } from './db';
import { ServerDb, clearServerSession, loadServerUrl, setServerUrlOnly, clearServerOverride } from './serverApi';

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

  const clearLocal = () => {
    setProfile(null);
    setTargets(null);
    setDay({ ...EMPTY_DAY, date: todayStr() });
    setAchievements([]);
    setAchievementDates({});
    setActiveDays(0);
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
    } catch (e) {
      // Sin sesión en el servidor → volver a bienvenida
      if ((e as { code?: string })?.code === 'no_session') {
        setUser(null);
        clearLocal();
      } else throw e;
    }
  };

  useEffect(() => {
    refresh().catch(() => undefined).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const afterAuth = async (r: AuthResult): Promise<AuthResult> => {
    if (r.ok) {
      setCelebration(r.user.name);
      await refresh();
    }
    return r;
  };

  const dismissCelebration = () => setCelebration(null);

  const register = (u: { name: string; email: string; password: string }) => db.register(u).then(afterAuth);
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
  };

  const resetAll = async () => {
    await db.resetAll();
    clearLocal();
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
        completeOnboarding, refresh, logFood, deleteFood, logWater, toggleExercise, resetAll,
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
