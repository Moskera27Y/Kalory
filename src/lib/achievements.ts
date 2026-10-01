export interface Medal {
  id: string;
  name: string;
  desc: string;
}

export const MEDALS: Medal[] = [
  { id: 'primer_paso', name: 'Primer paso', desc: 'Completaste tu perfil personal' },
  { id: 'perfil_completo', name: 'Perfil total', desc: 'Rellenaste todos los datos, metas y restricciones' },
  { id: 'primera_comida', name: 'Primera comida', desc: 'Registraste tu primera comida del diario' },
  { id: 'hidratado', name: 'Hidratación total', desc: 'Alcanzaste tu meta diaria de agua' },
  { id: 'primera_rutina', name: 'Manos a la obra', desc: 'Completaste tu primer ejercicio' },
  { id: 'sesion_completa', name: 'Sesión completa', desc: 'Terminaste todos los ejercicios del día' },
  { id: 'en_meta', name: 'En el objetivo', desc: 'Alcanzaste tu meta de calorías del día' },
  { id: 'constancia_3', name: 'Constancia x3', desc: 'Registraste actividad 3 días distintos' },
  { id: 'racha_7', name: 'Racha x7', desc: '7 días seguidos con actividad' },
  { id: 'semana_perfecta', name: 'Semana perfecta', desc: 'Entrenaste todos tus días de la semana' },
  { id: 'peso_meta', name: 'Peso objetivo', desc: 'Llegaste a tu peso meta (±1 kg)' },
  { id: 'foto_1', name: 'Evidencia', desc: 'Guardaste tu primera foto de progreso' },
  { id: 'ayuno_1', name: 'Primer ayuno', desc: 'Completaste tu primer ayuno' },
  { id: 'ayuno_7', name: 'Maestro del ayuno', desc: 'Completaste 7 ayunos' },
];
