import type { UserProfile, MacroTargets, Goal, ActivityLevel } from '../types';

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  muy_activo: 1.725,
};

const GOAL_DELTA: Record<Goal, number> = {
  perder_grasa: -450,
  ganar_musculo: 300,
  mantenimiento: 0,
  salud: -150,
};

/** Mifflin-St Jeor → BMR */
export function calcBMR(p: UserProfile): number {
  const s = p.gender === 'masculino' ? 5 : p.gender === 'femenino' ? -161 : -78;
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + s;
}

export function calcTDEE(p: UserProfile): { bmr: number; tdee: number; target: number } {
  const bmr = Math.round(calcBMR(p));
  const tdee = Math.round(bmr * ACTIVITY_FACTOR[p.activity]);
  const target = Math.max(1200, tdee + GOAL_DELTA[p.goal]);
  return { bmr, tdee, target };
}

/** Reparto de macros por objetivo (prote alta si hipertrofia/déficit) */
export function calcMacros(p: UserProfile): MacroTargets {
  const { target: calories } = calcTDEE(p);
  let pPerKg = 1.8;
  if (p.goal === 'ganar_musculo') pPerKg = 2.1;
  if (p.goal === 'perder_grasa') pPerKg = 2.2;
  if (p.goal === 'mantenimiento') pPerKg = 1.9;

  const protein = Math.round(p.weightKg * pPerKg);
  // Grasas: 27% kcal salvo keto (65%)
  const fatRatio = p.diet === 'keto' ? 0.62 : 0.27;
  const fat = Math.round((calories * fatRatio) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const waterMl = Math.round(p.weightKg * 35 + (p.activity === 'muy_activo' ? 500 : p.activity === 'moderado' ? 250 : 0));

  return { calories, protein, carbs, fat, waterMl };
}
