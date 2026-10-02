/** Coach motivacional: mensaje contextual según tu estado del día. */

export type CoachIcon = 'flame' | 'droplet' | 'dumbbell' | 'food' | 'trophy' | 'party' | 'moon' | 'star';

export interface CoachMsg {
  icon: CoachIcon;
  text: string;
}

export function coachMessage(s: {
  name: string;
  streak: number;
  weekTrainDays: number;
  goalDays: number;
  hasFood: boolean;
  waterPct: number;
  consumedPct: number;
  doneExercises: number;
  fastingActive: boolean;
  fastingDone: boolean;
}): CoachMsg {
  const h = new Date().getHours();
  if (s.streak >= 7) return { icon: 'party', text: `Racha de ${s.streak} días: estás imparable, ${s.name}. Hoy también cuenta.` };
  if (!s.hasFood && h < 11) return { icon: 'food', text: 'Buenos días: registra tu desayuno y arranca con energía.' };
  if (s.fastingActive) return s.fastingDone
    ? { icon: 'moon', text: 'Meta de ayuno cumplida. Rompe el ayuno con proteína.' }
    : { icon: 'moon', text: 'Ayuno en marcha: agua, café o té. Tú puedes.' };
  if (s.doneExercises === 0 && h >= 17) return { icon: 'dumbbell', text: 'Aún estás a tiempo: una sesión corta hoy mantiene tu racha.' };
  if (s.waterPct < 0.5 && h >= 14) return { icon: 'droplet', text: 'Vas bajo de agua: dos vasos ahora y lo remontas.' };
  if (s.weekTrainDays >= s.goalDays) return { icon: 'trophy', text: 'Semana cumplida. Ahora a mantener el ritmo.' };
  if (s.consumedPct >= 0.9) return { icon: 'star', text: 'Casi en tu meta de calorías. Cierra el día con calma.' };
  if (s.streak >= 3) return { icon: 'flame', text: `${s.streak} días seguidos: la constancia te está cambiando.` };
  return { icon: 'star', text: 'Un día a la vez: registra, entrena y descansa.' };
}
