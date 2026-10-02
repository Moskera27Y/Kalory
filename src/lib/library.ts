/** Biblioteca de ejercicios + planes listos para asignar. */

export type Muscle = 'Pecho' | 'Espalda' | 'Pierna' | 'Hombro' | 'Brazo' | 'Core' | 'Cardio' | 'Movilidad';
export type Level = 'Principiante' | 'Intermedio' | 'Avanzado';

export interface LibraryExercise {
  name: string;
  muscle: Muscle;
  level: Level;
  sets: string;
  tip: string;
  equipment: string;
}

export const LIBRARY: LibraryExercise[] = [
  { name: 'Sentadilla con barra', muscle: 'Pierna', level: 'Intermedio', sets: '4 × 8-10', tip: 'Pecho alto, rodillas alineadas, baja hasta 90°.', equipment: 'Barra' },
  { name: 'Sentadilla libre', muscle: 'Pierna', level: 'Principiante', sets: '3 × 12', tip: 'Pies al ancho de hombros, espalda recta.', equipment: 'Sin peso' },
  { name: 'Sentadilla búlgara', muscle: 'Pierna', level: 'Intermedio', sets: '3 × 10 / pierna', tip: 'Torso erguido, rodilla trasera casi al suelo.', equipment: 'Mancuernas' },
  { name: 'Peso muerto rumano', muscle: 'Pierna', level: 'Intermedio', sets: '3 × 10-12', tip: 'Bisagra de cadera, peso pegado a las piernas.', equipment: 'Barra' },
  { name: 'Hip thrust', muscle: 'Pierna', level: 'Intermedio', sets: '4 × 12', tip: 'Aprieta el glúteo 1s arriba.', equipment: 'Banco' },
  { name: 'Zancadas caminando', muscle: 'Pierna', level: 'Principiante', sets: '3 × 12 / pierna', tip: 'Pasos largos, torso erguido.', equipment: 'Sin peso' },
  { name: 'Press de banca', muscle: 'Pecho', level: 'Intermedio', sets: '4 × 8-10', tip: 'Escápulas juntas, barra al pecho con control.', equipment: 'Barra + banco' },
  { name: 'Flexiones', muscle: 'Pecho', level: 'Principiante', sets: '3 × 10', tip: 'Cuerpo recto de cabeza a talones.', equipment: 'Sin peso' },
  { name: 'Flexiones inclinadas', muscle: 'Pecho', level: 'Principiante', sets: '3 × 8', tip: 'Manos en silla o mesa.', equipment: 'Silla' },
  { name: 'Fondos en paralelas', muscle: 'Pecho', level: 'Avanzado', sets: '3 × 10-12', tip: 'Inclina el torso para más pecho.', equipment: 'Paralelas' },
  { name: 'Remo con barra', muscle: 'Espalda', level: 'Intermedio', sets: '3 × 10-12', tip: 'Espalda neutra, codos pegados.', equipment: 'Barra' },
  { name: 'Dominadas', muscle: 'Espalda', level: 'Avanzado', sets: '3 × 8', tip: 'Pecho a la barra, baja controlado.', equipment: 'Barra fija' },
  { name: 'Jalón al pecho', muscle: 'Espalda', level: 'Principiante', sets: '3 × 12', tip: 'Codos hacia abajo y atrás.', equipment: 'Polea' },
  { name: 'Press militar', muscle: 'Hombro', level: 'Intermedio', sets: '4 × 8-10', tip: 'Core firme, no arquees la espalda.', equipment: 'Barra' },
  { name: 'Elevaciones laterales', muscle: 'Hombro', level: 'Principiante', sets: '3 × 15', tip: 'Sube hasta la altura de hombros.', equipment: 'Mancuernas' },
  { name: 'Curl de bíceps', muscle: 'Brazo', level: 'Principiante', sets: '3 × 12', tip: 'Codos fijos al torso.', equipment: 'Mancuernas' },
  { name: 'Extensión de tríceps', muscle: 'Brazo', level: 'Principiante', sets: '3 × 12', tip: 'Solo se mueve el antebrazo.', equipment: 'Polea' },
  { name: 'Plancha abdominal', muscle: 'Core', level: 'Principiante', sets: '3 × 45s', tip: 'Cuerpo recto, abdomen activo.', equipment: 'Sin peso' },
  { name: 'Crunch bicicleta', muscle: 'Core', level: 'Intermedio', sets: '3 × 20', tip: 'Codo a rodilla contraria, lento.', equipment: 'Sin peso' },
  { name: 'Caminata enérgica', muscle: 'Cardio', level: 'Principiante', sets: '15 min', tip: 'Ritmo que acelere la respiración.', equipment: 'Ninguno' },
  { name: 'Trote suave', muscle: 'Cardio', level: 'Intermedio', sets: '20 min', tip: 'Puedes mantener conversación.', equipment: 'Ninguno' },
  { name: 'Burpees', muscle: 'Cardio', level: 'Avanzado', sets: '5 × 30s', tip: 'Explosivo arriba, controlado abajo.', equipment: 'Sin peso' },
  { name: 'Movilidad total', muscle: 'Movilidad', level: 'Principiante', sets: '5 min', tip: 'Cadera, hombros y tobillos amplios.', equipment: 'Ninguno' },
  { name: 'Peso muerto convencional', muscle: 'Espalda', level: 'Avanzado', sets: '5 × 5', tip: 'Espalda neutra, empuja el suelo.', equipment: 'Barra' },
];

export interface Plan {
  id: string;
  name: string;
  desc: string;
  days: number;
  level: Level;
  focus: string;
  exercises: { name: string; sets: string; tip: string }[];
}

function find(name: string) {
  const e = LIBRARY.find((x) => x.name === name)!;
  return { name: e.name, sets: e.sets, tip: e.tip };
}

export const PLANS: Plan[] = [
  {
    id: 'adaptacion', name: 'Adaptación · Semana 1', desc: 'Cardio + peso corporal, cero máquinas.',
    days: 3, level: 'Principiante', focus: 'Acondicionamiento',
    exercises: ['Caminata enérgica', 'Sentadilla libre', 'Flexiones inclinadas', 'Plancha abdominal', 'Movilidad total'].map(find),
  },
  {
    id: 'fullbody3', name: 'Cuerpo completo ×3', desc: 'Fuerza general 3 días por semana.',
    days: 3, level: 'Intermedio', focus: 'Fuerza',
    exercises: ['Sentadilla con barra', 'Press de banca', 'Remo con barra', 'Peso muerto rumano', 'Plancha abdominal'].map(find),
  },
  {
    id: 'ppl6', name: 'Push · Pull · Legs ×6', desc: 'Doble frecuencia para intermedios-avanzados.',
    days: 6, level: 'Avanzado', focus: 'Hipertrofia',
    exercises: ['Press de banca', 'Press militar', 'Fondos en paralelas', 'Dominadas', 'Sentadilla búlgara', 'Hip thrust'].map(find),
  },
  {
    id: 'fuerza5x5', name: 'Fuerza 5×5', desc: 'Básicos pesados, progresión lineal.',
    days: 3, level: 'Intermedio', focus: 'Fuerza máxima',
    exercises: ['Sentadilla con barra', 'Press de banca', 'Remo con barra', 'Peso muerto convencional', 'Press militar'].map(find),
  },
  {
    id: 'hiit30', name: 'HIIT 30 días', desc: 'Cardio explosivo en casa, sin material.',
    days: 4, level: 'Intermedio', focus: 'Quema',
    exercises: ['Burpees', 'Sentadilla libre', 'Flexiones', 'Crunch bicicleta', 'Trote suave'].map(find),
  },
  {
    id: 'casa', name: 'En casa sin material', desc: 'Todo con peso corporal.',
    days: 3, level: 'Principiante', focus: 'Hábito',
    exercises: ['Sentadilla libre', 'Flexiones inclinadas', 'Zancadas caminando', 'Plancha abdominal', 'Movilidad total'].map(find),
  },
];

/** Plan asignado por el usuario (este equipo). null = automático según perfil. */
const KEY = 'kalory-custom-plan-v1';
export function getAssignedPlan(userId: number): Plan | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<number, string>;
    return PLANS.find((p) => p.id === map[userId]) ?? null;
  } catch {
    return null;
  }
}
export function assignPlan(userId: number, planId: string | null) {
  try {
    const raw = localStorage.getItem(KEY);
    const map = raw ? (JSON.parse(raw) as Record<number, string>) : {};
    if (planId) map[userId] = planId;
    else delete map[userId];
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}
