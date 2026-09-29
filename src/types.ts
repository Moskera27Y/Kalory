export type ActivityLevel = 'sedentario' | 'ligero' | 'moderado' | 'muy_activo';
export type Goal = 'perder_grasa' | 'ganar_musculo' | 'mantenimiento' | 'salud';
export type Diet = 'omnivoro' | 'vegano' | 'vegetariano' | 'sin_gluten' | 'keto';
export type Experience = 'principiante' | 'intermedio' | 'avanzado';
export type Place = 'casa' | 'gimnasio' | 'mixto';

export interface UserProfile {
  name: string;
  age: number;
  weightKg: number;
  heightCm: number;
  gender: 'masculino' | 'femenino' | 'otro';
  activity: ActivityLevel;
  goal: Goal;
  diet: Diet;
  /** Nuevos campos de perfil completo */
  targetWeightKg: number;
  experience: Experience;
  daysPerWeek: number;
  place: Place;
  allergies: string;
  mealsPerDay: number;
}

export const EMPTY_PROFILE: UserProfile = {
  name: '',
  age: 28,
  weightKg: 70,
  heightCm: 170,
  gender: 'masculino',
  activity: 'moderado',
  goal: 'perder_grasa',
  diet: 'omnivoro',
  targetWeightKg: 65,
  experience: 'principiante',
  daysPerWeek: 3,
  place: 'gimnasio',
  allergies: '',
  mealsPerDay: 4,
};

export interface MacroTargets {
  calories: number;
  protein: number; // g
  carbs: number;   // g
  fat: number;     // g
  waterMl: number;
}

export interface FoodEntry {
  id: number;
  date: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  meal: string;
}

export interface AchievementRow {
  id: string;
  unlocked_at: string;
}

export interface DayData {
  date: string;
  foods: FoodEntry[];
  waterMl: number;
  done: string[];
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  provider: string;
}

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: string; detail?: string };
