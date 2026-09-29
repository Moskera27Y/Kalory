import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../components/ui';
import { useStore } from '../lib/store';

interface Exercise { name: string; sets: string; tip: string }

const FULL_BODY: Exercise[] = [
  { name: 'Sentadilla con barra', sets: '4 × 8-10', tip: 'Pecho alto, rodillas alineadas, baja hasta 90°.' },
  { name: 'Press de banca', sets: '4 × 8-10', tip: 'Escápulas juntas, barra al pecho con control.' },
  { name: 'Remo con barra', sets: '3 × 10-12', tip: 'Espalda neutra, codos pegados al cuerpo.' },
  { name: 'Peso muerto rumano', sets: '3 × 10-12', tip: 'Bisagra de cadera, peso pegado a las piernas.' },
  { name: 'Plancha abdominal', sets: '3 × 45s', tip: 'Cuerpo recto, glúteo y abdomen activos.' },
];

const SPLIT_DAY: Exercise[] = [
  { name: 'Sentadilla búlgara', sets: '3 × 10 / pierna', tip: 'Torso erguido, rodilla trasera casi al suelo.' },
  { name: 'Hip thrust', sets: '4 × 12', tip: 'Aprieta el glúteo 1s arriba.' },
  { name: 'Press militar', sets: '4 × 8-10', tip: 'Core firme, no arquees la espalda.' },
  { name: 'Dominadas / Jalón', sets: '3 × 8-12', tip: 'Pecho a la barra, baja controlado.' },
  { name: 'Fondos en paralelas', sets: '3 × 10-12', tip: 'Inclina el torso para más pecho.' },
];

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function RestTimer() {
  const [sec, setSec] = useState(90);
  const [run, setRun] = useState(false);
  const idRef = useRef<number | null>(null);
  const setPreset = (s: number) => { setRun(false); setSec(s); };

  useEffect(() => {
    if (run) {
      idRef.current = window.setInterval(() => {
        setSec((s) => {
          if (s <= 1) {
            setRun(false);
            return 90;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (idRef.current) window.clearInterval(idRef.current); };
  }, [run ]);

  return (
    <div>
      <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
        <span className="font-display text-2xl font-extrabold tabular-nums">{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setRun(!run)} className="chip !px-3">{run ? <Pause size={15} /> : <Play size={15} />}</button>
          <button onClick={() => { setRun(false); setSec(90); }} className="chip !px-3"><RotateCcw size={15} /></button>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {[60, 90, 120].map((s) => (
          <button key={s} onClick={() => setPreset(s)} className={`chip text-xs ${sec === s ? 'border-fire/50 text-fire' : ''}`}>{s}s</button>
        ))}
      </div>
    </div>
  );
}

export default function Workouts() {
  const { profile, day, toggleExercise } = useStore();
  const daysPerWeek = profile?.daysPerWeek ?? 3;
  const exercises = daysPerWeek > 3 ? SPLIT_DAY : FULL_BODY;
  const planName = daysPerWeek > 3 ? 'Tren superior / inferior' : 'Cuerpo completo';
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Plan de ejercicio <span className="text-gradient-fire">semanal</span></h1>
        <p className="text-sm text-muted">
          {planName} · {daysPerWeek} días/semana
          {profile ? ` · Nivel ${profile.experience} · ${profile.place}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-7 gap-2 max-lg:grid-cols-4 max-sm:grid-cols-2">
        {DAYS.map((d, i) => {
          const isTraining = i < daysPerWeek;
          const isToday = i === todayIdx;
          return (
            <GlassCard key={d} className={`!p-3 text-center ${isToday && isTraining ? '!border-fire/50 shadow-glow-fire' : ''}`}>
              <p className="text-xs font-bold uppercase text-muted">{d}</p>
              <p className="mt-1 text-xs font-semibold leading-tight">{isTraining ? 'Entreno' : 'Descanso'}</p>
              <p className={`mt-2 text-[11px] font-bold ${isToday ? 'text-fire' : 'text-muted'}`}>{isToday ? '● Hoy' : '·'}</p>
            </GlassCard>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-3">
          <AnimatePresence>
            {exercises.map((e, i) => {
              const done = day.done.includes(e.name);
              return (
                <motion.div key={e.name} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <GlassCard className={`flex items-start gap-4 ${done ? 'opacity-70' : ''}`}>
                    <button onClick={() => toggleExercise(e.name, exercises.length)} className={`mt-1 transition-all ${done ? 'text-emerald' : 'text-muted hover:text-white'}`}>
                      <CheckCircle2 size={24} fill={done ? 'rgba(16,185,129,0.2)' : 'transparent'} />
                    </button>
                    <div className="flex-1">
                      <p className={`font-bold ${done ? 'line-through' : ''}`}>{i + 1}. {e.name}</p>
                      <p className="text-xs font-semibold text-fire">{e.sets}</p>
                      <p className="mt-1 text-xs text-muted">{e.tip}</p>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        <div className="flex flex-col gap-4">
          <GlassCard glow>
            <p className="text-xs uppercase tracking-widest text-muted">Temporizador de descanso</p>
            <div className="mt-3"><RestTimer /></div>
          </GlassCard>
          <GlassCard>
            <p className="text-sm font-bold">Progreso de hoy</p>
            <p className="font-display text-3xl font-extrabold text-gradient-emerald">{Math.round((day.done.length / exercises.length) * 100)}%</p>
            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-[#10B981] to-[#059669]" animate={{ width: `${(day.done.length / exercises.length) * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">{day.done.length} de {exercises.length} ejercicios</p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
