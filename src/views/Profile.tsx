import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck, ClipboardList, UtensilsCrossed, Droplet, Dumbbell,
  Trophy, Target, Flame, Pencil, Lock, CalendarCheck, Scale, Camera, Medal, Bell,
  FileDown, FileUp, Database, FileText, MoonStar, Hourglass, LogOut, Footprints, UserPlus, Crown,
} from 'lucide-react';
import { GlassCard } from '../components/ui';
import { MEDALS } from '../lib/achievements';
import { calcBMR } from '../lib/calculations';
import { loadPrefs, savePrefs, type NotifyPrefs } from '../lib/reminders';
import { downloadFile, weeklyCSV, APP_VERSION } from '../lib/report';
import { daysAgo, getDb, todayStr } from '../lib/db';
import { useStore } from '../lib/store';

const MEDAL_ICONS: Record<string, typeof Trophy> = {
  primer_paso: UserCheck,
  perfil_completo: ClipboardList,
  primera_comida: UtensilsCrossed,
  hidratado: Droplet,
  primera_rutina: Dumbbell,
  sesion_completa: Trophy,
  en_meta: Target,
  constancia_3: Flame,
  racha_7: CalendarCheck,
  semana_perfecta: Medal,
  peso_meta: Scale,
  foto_1: Camera,
  ayuno_1: MoonStar,
  ayuno_7: Hourglass,
  pasos_10k: Footprints,
  amigo_1: UserPlus,
  top_1: Crown,
};

const ACT_LABEL: Record<string, string> = {
  sedentario: 'Sedentario', ligero: 'Ligero', moderado: 'Moderado', muy_activo: 'Muy activo',
};
const GOAL_LABEL: Record<string, string> = {
  perder_grasa: 'Perder grasa', ganar_musculo: 'Ganar músculo', mantenimiento: 'Mantenimiento', salud: 'Salud general',
};
const DIET_LABEL: Record<string, string> = {
  omnivoro: 'Omnívoro', vegetariano: 'Vegetariano', vegano: 'Vegano', sin_gluten: 'Sin gluten', keto: 'Keto',
};

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Por debajo del rango';
  if (bmi < 25) return 'Rango saludable';
  if (bmi < 30) return 'Por encima del rango';
  return 'Rango alto';
}

export default function Profile() {
  const { profile, targets, achievements, achievementDates, history, logout } = useStore();
  const [prefs, setPrefs] = useState<NotifyPrefs>(() => loadPrefs());
  const [dbMsg, setDbMsg] = useState('');
  const [showImc, setShowImc] = useState(false);
  if (!profile || !targets) return null;

  const bmi = profile.weightKg / Math.pow(profile.heightCm / 100, 2);
  const bmr = Math.round(calcBMR(profile));
  const diff = profile.targetWeightKg - profile.weightKg;

  const rows: [string, string][] = [
    ['Edad', `${profile.age} años`],
    ['Género', profile.gender],
    ['Altura', `${profile.heightCm} cm`],
    ['Peso actual', `${profile.weightKg} kg`],
    ['Peso objetivo', `${profile.targetWeightKg} kg (${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg)`],
    ['Actividad diaria', ACT_LABEL[profile.activity] ?? profile.activity],
    ['Objetivo', GOAL_LABEL[profile.goal] ?? profile.goal],
    ['Experiencia', profile.experience],
    ['Días por semana', `${profile.daysPerWeek}`],
    ['Lugar de entreno', profile.place],
    ['Alimentación', DIET_LABEL[profile.diet] ?? profile.diet],
    ['Alergias / restricciones', profile.allergies || '—'],
    ['Comidas al día', `${profile.mealsPerDay}`],
  ];

  return (
    <div className="flex flex-col gap-4">
      <GlassCard glow className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] font-display text-2xl font-extrabold text-white shadow-glow-emerald">
          {profile.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-extrabold truncate">{profile.name}</h1>
          <p className="text-sm text-muted">{GOAL_LABEL[profile.goal]} · Meta {targets.calories.toLocaleString('es')} kcal/día</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <Link to="/onboarding" className="btn-emerald !py-2 !px-3 text-sm flex items-center justify-center gap-2"><Pencil size={15} /> Editar</Link>
          <button onClick={() => { if (window.confirm('¿Cerrar sesión?')) logout(); }} className="chip !py-2 !text-sm flex items-center justify-center gap-2 text-muted hover:text-fire-hot">
            <LogOut size={15} /> Salir
          </button>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <p className="text-xs uppercase tracking-widest text-muted">Información completa</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {rows.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/[0.04] border border-white/5 px-3 py-2.5">
                <p className="text-[11px] text-muted capitalize">{k}</p>
                <p className="text-sm font-bold capitalize">{v}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <div className="flex flex-col gap-4">
          <GlassCard>
            <p className="text-xs uppercase tracking-widest text-muted">Tus números</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setShowImc(true)} title="Ver detalle" className="rounded-xl bg-white/[0.04] border border-white/5 p-4 text-center hover:border-emerald/40 transition-all">
                <p className="text-[11px] text-muted">IMC ⓘ</p>
                <p className="font-display text-2xl font-extrabold">{bmi.toFixed(1)}</p>
                <p className="text-[11px] text-emerald">{bmiCategory(bmi)}</p>
              </button>
              <div className="rounded-xl bg-white/[0.04] border border-white/5 p-4 text-center">
                <p className="text-[11px] text-muted">Metabolismo basal</p>
                <p className="font-display text-2xl font-extrabold">{bmr}</p>
                <p className="text-[11px] text-muted">kcal/día</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] border border-white/5 p-4 text-center">
                <p className="text-[11px] text-muted">Meta calórica</p>
                <p className="font-display text-2xl font-extrabold text-gradient-fire">{targets.calories.toLocaleString('es')}</p>
                <p className="text-[11px] text-muted">kcal/día</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] border border-white/5 p-4 text-center">
                <p className="text-[11px] text-muted">Agua diaria</p>
                <p className="font-display text-2xl font-extrabold text-gradient-emerald">{(targets.waterMl / 1000).toFixed(1)} L</p>
                <p className="text-[11px] text-muted">P {targets.protein}g · C {targets.carbs}g · G {targets.fat}g</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-2">
              <Bell size={17} className="text-emerald" />
              <p className="text-sm font-bold">Recordatorios y horarios</p>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {([
                ['water', 'Agua durante el día', null],
                ['meals', 'Comidas del día', null],
                ['workout', 'Entrenamiento pendiente', 'workoutTime'],
                ['goals', 'Cierre y metas diarias', 'goalsTime'],
              ] as const).map(([k, label, timeKey]) => (
                <div key={k} className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                  <button
                    onClick={() => {
                      const next = { ...prefs, [k]: !prefs[k] };
                      setPrefs(next);
                      savePrefs(next);
                    }}
                    className="flex flex-1 items-center gap-3 text-sm"
                  >
                    <span className={`relative h-5 w-9 shrink-0 rounded-full transition-all ${prefs[k] ? 'bg-emerald' : 'bg-white/10'}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${prefs[k] ? 'left-[18px]' : 'left-0.5'}`} />
                    </span>
                    {label}
                  </button>
                  {timeKey && (
                    <input
                      type="time" value={prefs[timeKey]}
                      onChange={(e) => {
                        const next = { ...prefs, [timeKey]: e.target.value };
                        setPrefs(next);
                        savePrefs(next);
                      }}
                      className="w-[104px] h-9 shrink-0 rounded-lg bg-white/5 border border-white/10 px-2 text-xs text-center tabular-nums"
                    />
                  )}
                </div>
              ))}
              {prefs.meals && (
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['breakfast', 'Desayuno'],
                    ['lunch', 'Almuerzo'],
                    ['dinner', 'Cena'],
                  ] as const).map(([k, label]) => (
                    <label key={k} className="grid gap-1 rounded-xl border border-white/5 bg-white/[0.03] px-2.5 py-2 text-[11px] text-muted">
                      {label}
                      <input
                        type="time" value={prefs[k]}
                        onChange={(e) => {
                          const next = { ...prefs, [k]: e.target.value };
                          setPrefs(next);
                          savePrefs(next);
                        }}
                        className="w-full h-9 rounded-lg bg-white/5 border border-white/10 px-1 text-xs text-white text-center tabular-nums"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted">En el móvil suenan aunque la app esté cerrada. Cerrar la ventana minimiza a la bandeja.</p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-2">
              <Database size={17} className="text-fire" />
              <p className="text-sm font-bold">Informes y copia de seguridad</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const week = history.filter((d) => d.date >= daysAgo(6));
                  downloadFile(`kalory-semana-${todayStr()}.csv`, weeklyCSV(week), 'text/csv');
                }}
                className="chip !text-xs flex items-center justify-center gap-1.5 hover:border-emerald/50"
              >
                <FileText size={14} /> Semana CSV
              </button>
              <Link to="/informe" className="chip !text-xs flex items-center justify-center gap-1.5 hover:border-emerald/50">
                <FileText size={14} /> Informe / PDF
              </Link>
              <button
                onClick={async () => {
                  const data = await getDb().exportData();
                  downloadFile(`kalory-backup-${todayStr()}.json`, JSON.stringify(data), 'application/json');
                  setDbMsg('Respaldo JSON descargado.');
                }}
                className="chip !text-xs flex items-center justify-center gap-1.5 hover:border-emerald/50"
              >
                <FileDown size={14} /> Respaldo JSON
              </button>
              {typeof window !== 'undefined' && (window as unknown as { kaloryDb?: { backupDb?: () => Promise<string | null>; restoreDb?: () => Promise<boolean> } }).kaloryDb?.backupDb && (
                <>
                  <button
                    onClick={async () => {
                      const p = await (window as unknown as { kaloryDb: { backupDb: () => Promise<string | null> } }).kaloryDb.backupDb();
                      setDbMsg(p ? `Copia guardada.` : 'Cancelado.');
                    }}
                    className="chip !text-xs flex items-center justify-center gap-1.5 hover:border-emerald/50"
                  >
                    <Database size={14} /> Copia .db
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm('¿Restaurar copia? Se reemplazarán tus datos actuales.')) return;
                      try {
                        const ok = await (window as unknown as { kaloryDb: { restoreDb: () => Promise<boolean> } }).kaloryDb.restoreDb();
                        if (ok) window.location.reload();
                        else setDbMsg('Cancelado.');
                      } catch {
                        setDbMsg('Archivo inválido: no es una base Kalory.');
                      }
                    }}
                    className="chip !text-xs flex items-center justify-center gap-1.5 hover:border-fire-hot/50 col-span-2"
                  >
                    <FileUp size={14} /> Restaurar copia .db
                  </button>
                </>
              )}
            </div>
            {dbMsg && <p className="mt-2 text-[11px] text-emerald">{dbMsg}</p>}
            <p className="mt-3 text-center text-[11px] text-muted">Kalory v{APP_VERSION}</p>
          </GlassCard>

          <GlassCard glow>
            <div className="flex items-center gap-2">
              <Trophy size={17} className="text-fire" />
              <p className="text-sm font-bold">Medallas · {achievements.length} de {MEDALS.length}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {MEDALS.map((m) => {
                const unlocked = achievements.includes(m.id);
                const Icon = MEDAL_ICONS[m.id] ?? Trophy;
                return (
                  <div key={m.id}
                    className={`rounded-xl border p-3 flex gap-2.5 items-start ${
                      unlocked ? 'border-fire/40 bg-gradient-to-br from-fire/15 to-emerald/10' : 'border-white/5 bg-white/[0.02] opacity-50'
                    }`}>
                    <span className={`rounded-lg p-2 shrink-0 ${unlocked ? 'bg-gradient-to-br from-[#F59E0B] to-[#EF4444] text-white' : 'bg-white/5 text-muted'}`}>
                      {unlocked ? <Icon size={17} /> : <Lock size={17} />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold">{m.name}</p>
                      <p className="text-[11px] text-muted leading-tight">{m.desc}</p>
                      {unlocked && achievementDates[m.id] && (
                        <p className="mt-1 text-[10px] text-emerald">{new Date(achievementDates[m.id]).toLocaleDateString('es')}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>

      {showImc && <ImcModal bmi={bmi} onClose={() => setShowImc(false)} />}
    </div>
  );
}

const IMC_ROWS: { max: number; name: string; color: string; risks: string; tip: string }[] = [
  { max: 18.5, name: 'Bajo peso', color: 'text-sky-400', risks: 'Defensas bajas, fatiga, pérdida muscular y menor densidad ósea.', tip: 'Sube calorías con proteína y fuerza 3x/semana.' },
  { max: 25, name: 'Rango saludable', color: 'text-emerald', risks: 'Riesgo bajo. Mantener hábitos te conserva aquí.', tip: 'Sigue con tu plan actual y revisa tu peso cada mes.' },
  { max: 30, name: 'Sobrepeso', color: 'text-fire', risks: 'Tiende a subir la tensión y el azúcar; más carga en rodillas.', tip: 'Déficit suave de 300-500 kcal + caminar a diario.' },
  { max: 35, name: 'Obesidad tipo I', color: 'text-fire-hot', risks: 'Riesgo alto de diabetes tipo 2, hipertensión y apnea del sueño.', tip: 'Plan estructurado de dieta + ejercicio; valora acompañamiento profesional.' },
  { max: 40, name: 'Obesidad tipo II', color: 'text-fire-hot', risks: 'Riesgo muy alto cardiovascular y articular; posible síndrome metabólico.', tip: 'Acompañamiento médico y nutricional recomendado.' },
  { max: 999, name: 'Obesidad tipo III', color: 'text-fire-hot', risks: 'Riesgo severo: corazón, articulaciones, respiración y metabolismo.', tip: 'Consulta médica prioritaria antes de entrenar fuerte.' },
];

function ImcModal({ bmi, onClose }: { bmi: number; onClose: () => void }) {
  const active = IMC_ROWS.findIndex((r) => bmi < r.max);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-strong w-full max-w-md p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">Tu IMC</p>
            <p className="font-display text-3xl font-extrabold">{bmi.toFixed(1)}</p>
          </div>
          <span className={`ml-auto rounded-full px-3 py-1 text-xs font-bold border border-white/10 bg-white/5 ${IMC_ROWS[active].color}`}>
            {IMC_ROWS[active].name}
          </span>
          <button onClick={onClose} className="chip !px-3 !py-1.5 text-muted">✕</button>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {IMC_ROWS.map((r, i) => (
            <div key={r.name} className={`rounded-xl border p-3 text-xs ${i === active ? 'border-emerald/50 bg-emerald/10' : 'border-white/5 bg-white/[0.02]'}`}>
              <p className={`font-bold ${r.color}`}>{r.name}{i === active ? ' · tú estás aquí' : ''}</p>
              <p className="mt-1 text-muted"><b className="text-white/80">Riesgos:</b> {r.risks}</p>
              <p className="mt-1 text-muted"><b className="text-white/80">Consejo:</b> {r.tip}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted">El IMC es orientativo y no distingue músculo de grasa. No es un diagnóstico médico.</p>
      </div>
    </div>
  );
}
