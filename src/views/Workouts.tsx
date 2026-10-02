import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, CheckCircle2, X, Zap, Star, PartyPopper, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassCard } from '../components/ui';
import { useStore } from '../lib/store';
import { getAssignedPlan } from '../lib/library';
import { saveHealthWorkout } from '../lib/steps';

interface Exercise { name: string; sets: string; tip: string }

const FULL_BODY: Exercise[] = [
  { name: 'Sentadilla con barra', sets: '4 × 8-10', tip: 'Pecho alto, rodillas alineadas, baja hasta 90°.' },
  { name: 'Press de banca', sets: '4 × 8-10', tip: 'Escápulas juntas, barra al pecho con control.' },
  { name: 'Remo con barra', sets: '3 × 10-12', tip: 'Espalda neutra, codos pegados al cuerpo.' },
  { name: 'Peso muerto rumano', sets: '3 × 10-12', tip: 'Bisagra de cadera, peso pegado a las piernas.' },
  { name: 'Plancha abdominal', sets: '3 × 45s', tip: 'Cuerpo recto, glúteo y abdomen activos.' },
];

/** Semana 1 para principiantes: cardio + peso corporal, cero máquinas. */
const FOUNDATION: Exercise[] = [
  { name: 'Caminata enérgica', sets: '15 min', tip: 'Ritmo que te acelere la respiración pero te deje hablar.' },
  { name: 'Sentadilla libre (sin peso)', sets: '3 × 12', tip: 'Pies al ancho de hombros, espalda recta, baja controlado.' },
  { name: 'Flexiones inclinadas', sets: '3 × 8', tip: 'Manos en una silla o mesa, cuerpo recto de cabeza a talones.' },
  { name: 'Plancha abdominal', sets: '3 × 30s', tip: 'Codos bajo hombros, aprieta abdomen y glúteos.' },
  { name: 'Movilidad total', sets: '5 min', tip: 'Círculos de cadera, hombros y tobillos, suaves y amplios.' },
];

const SPLIT_DAY: Exercise[] = [
  { name: 'Sentadilla búlgara', sets: '3 × 10 / pierna', tip: 'Torso erguido, rodilla trasera casi al suelo.' },
  { name: 'Hip thrust', sets: '4 × 12', tip: 'Aprieta el glúteo 1s arriba.' },
  { name: 'Press militar', sets: '4 × 8-10', tip: 'Core firme, no arquees la espalda.' },
  { name: 'Dominadas / Jalón', sets: '3 × 8-12', tip: 'Pecho a la barra, baja controlado.' },
  { name: 'Fondos en paralelas', sets: '3 × 10-12', tip: 'Inclina el torso para más pecho.' },
];

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const setsCount = (s: string) => {
  const m = s.match(/(\d+)/);
  return m ? Math.min(8, Math.max(1, Number(m[1]))) : 3;
};

function fmt(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

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
        <span className="font-display text-2xl font-extrabold tabular-nums">{fmt(sec)}</span>
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

/** Sesión guiada a pantalla completa: series, descanso automático y avance. */
function SessionPlayer({ exercises, onDone, onClose }: { exercises: Exercise[]; onDone: (names: string[]) => void; onClose: () => void }) {
  const [exIdx, setExIdx] = useState(0);
  const [setNum, setSetNum] = useState(0);
  const [rest, setRest] = useState(0);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState(false);
  const [rating, setRating] = useState(0);
  const startRef = useRef(Date.now());
  const totalSets = setsCount(exercises[exIdx].sets);

  useEffect(() => {
    if (!running) return;
    if (rest <= 0) { setRunning(false); return; }
    const id = window.setInterval(() => setRest((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running, rest]);

  const completeSet = () => {
    if (setNum + 1 >= totalSets) {
      if (exIdx + 1 >= exercises.length) {
        setSummary(true);
        setRunning(false);
      } else {
        setExIdx(exIdx + 1);
        setSetNum(0);
        setRest(90);
        setRunning(true);
      }
    } else {
      setSetNum(setNum + 1);
      setRest(90);
      setRunning(true);
    }
  };

  const e = exercises[exIdx];
  if (summary) {
    const mins = Math.max(1, Math.round((Date.now() - startRef.current) / 60000));
    return (
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070B16]/95 backdrop-blur-md p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="glass card-glow-emerald w-full max-w-md p-8 text-center relative overflow-hidden"
          initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
          {[0, 1, 2].map((i) => (
            <motion.span key={i}
              className={`absolute h-40 w-40 rounded-full blur-2xl ${i === 0 ? 'bg-emerald/25 -top-10 -left-10' : i === 1 ? 'bg-fire/20 top-1/3 -right-10' : 'bg-fire-hot/15 -bottom-10 left-1/4'}`}
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
              transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.4 }} />
          ))}
          <motion.span
            initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.15 }}
            className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#F59E0B] to-[#EF4444] text-white shadow-glow-fire"
          >
            <PartyPopper size={34} />
          </motion.span>
          <h2 className="relative mt-4 font-display text-3xl font-extrabold">¡Sesión <span className="text-gradient-emerald">completa</span>!</h2>
          <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
            {[['Tiempo', `${mins} min`], ['Ejercicios', `${exercises.length}`], ['Quema est.', `${exercises.length * 90}`]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/5 border border-white/10 p-3">
                <p className="text-[11px] text-muted">{k}</p>
                <p className="font-display text-lg font-extrabold">{v}</p>
              </div>
            ))}
          </div>
          <p className="relative mt-4 text-xs uppercase tracking-widest text-muted">¿Cómo te sentiste?</p>
          <div className="relative mt-1 flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <motion.button key={s} whileTap={{ scale: 1.3 }} onClick={() => setRating(s)}>
                <Star size={30} className={s <= rating ? 'text-fire fill-fire' : 'text-muted'} fill={s <= rating ? 'currentColor' : 'none'} />
              </motion.button>
            ))}
          </div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => onDone(exercises.map((x) => x.name))}
            className="btn-emerald relative mt-5 w-full">
            Guardar y terminar
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070B16]/95 backdrop-blur-md p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="glass w-full max-w-lg p-8 text-center relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted hover:text-white"><X size={20} /></button>
        <p className="text-xs uppercase tracking-widest text-muted">Ejercicio {exIdx + 1} de {exercises.length}</p>
        <h2 className="mt-2 font-display text-3xl font-extrabold">{e.name}</h2>
        <p className="mt-1 text-sm text-fire font-bold">{e.sets} · Serie {setNum + 1} de {totalSets}</p>
        <p className="mt-2 text-xs text-muted">{e.tip}</p>

        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: totalSets }).map((_, i) => (
            <span key={i} className={`h-2.5 w-8 rounded-full ${i < setNum ? 'bg-emerald' : i === setNum ? 'bg-fire animate-pulse' : 'bg-white/10'}`} />
          ))}
        </div>

        {rest > 0 && running ? (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-widest text-muted">Descansa</p>
            <p className="font-display text-6xl font-extrabold tabular-nums text-gradient-fire">{fmt(rest)}</p>
            <button onClick={() => { setRunning(false); setRest(0); }} className="chip mt-3 text-sm">Saltar descanso</button>
          </div>
        ) : (
          <motion.button whileTap={{ scale: 0.97 }} onClick={completeSet} className="btn-emerald mt-6 w-full text-lg">
            {setNum + 1 >= totalSets ? (exIdx + 1 >= exercises.length ? '¡Terminar sesión!' : 'Siguiente ejercicio') : 'Serie completada ✓'}
          </motion.button>
        )}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-gradient-to-r from-[#10B981] to-[#F59E0B]"
            style={{ width: `${((exIdx + setNum / totalSets) / exercises.length) * 100}%` }} />
        </div>
      </div>
    </motion.div>
  );
}

function beep(freq = 880, ms = 180) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = freq;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
    o.stop(ctx.currentTime + ms / 1000);
  } catch { /* sin audio */ }
}

/** Temporizador HIIT por intervalos. */
function HiitTimer() {
  const [rounds, setRounds] = useState(8);
  const [work, setWork] = useState(30);
  const [rest, setRest] = useState(15);
  const [phase, setPhase] = useState<'idle' | 'work' | 'rest' | 'done'>('idle');
  const [round, setRound] = useState(1);
  const [sec, setSec] = useState(0);

  useEffect(() => {
    if (phase !== 'work' && phase !== 'rest') return;
    if (sec <= 0) {
      if (phase === 'work') {
        beep(660);
        if (round >= rounds) { setPhase('done'); beep(880, 400); return; }
        setPhase('rest'); setSec(rest);
      } else {
        beep(990);
        setRound((r) => r + 1);
        setPhase('work'); setSec(work);
      }
      return;
    }
    const id = window.setInterval(() => setSec((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [phase, sec, round, rounds, work, rest]);

  const start = () => { setRound(1); setPhase('work'); setSec(work); beep(990); };
  const stop = () => setPhase('idle');

  return (
    <GlassCard glow>
      <div className="flex items-center gap-2"><Zap size={17} className="text-fire" /><p className="text-sm font-bold">HIIT por intervalos</p></div>
      {phase === 'idle' || phase === 'done' ? (
        <div className="mt-3 grid gap-2">
          {phase === 'done' && <p className="rounded-xl border border-emerald/40 bg-emerald/10 p-3 text-center text-sm font-bold text-emerald">¡Completado! 🔥</p>}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <label className="grid gap-1 text-xs text-muted">Rondas<input type="number" min={1} max={30} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} className="input-kalory !py-2 text-sm" /></label>
            <label className="grid gap-1 text-xs text-muted">Trabajo (s)<input type="number" min={5} max={300} value={work} onChange={(e) => setWork(Number(e.target.value))} className="input-kalory !py-2 text-sm" /></label>
            <label className="grid gap-1 text-xs text-muted">Descanso (s)<input type="number" min={5} max={300} value={rest} onChange={(e) => setRest(Number(e.target.value))} className="input-kalory !py-2 text-sm" /></label>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={start} className="btn-fire text-sm flex items-center justify-center gap-2"><Play size={16} /> Empezar HIIT</motion.button>
        </div>
      ) : (
        <div className="mt-3 text-center">
          <p className={`text-xs font-bold uppercase tracking-widest ${phase === 'work' ? 'text-fire' : 'text-emerald'}`}>
            {phase === 'work' ? '🔥 ¡Dale!' : '😮‍💨 Recupera'} · Ronda {round}/{rounds}
          </p>
          <p className="font-display text-6xl font-extrabold tabular-nums">{fmt(sec)}</p>
          <div className="mt-2 flex justify-center gap-1.5">
            {Array.from({ length: rounds }).map((_, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${i + 1 < round || (i + 1 === round && phase === 'rest') ? 'bg-emerald' : i + 1 === round ? 'bg-fire animate-pulse' : 'bg-white/10'}`} />
            ))}
          </div>
          <button onClick={stop} className="chip mt-3 text-sm">Detener</button>
        </div>
      )}
    </GlassCard>
  );
}

export default function Workouts() {
  const { profile, day, toggleExercise, user } = useStore();
  const [tab, setTab] = useState<'rutina' | 'hiit'>('rutina');
  const [session, setSession] = useState(false);
  const [sessionStart, setSessionStart] = useState(Date.now());
  const daysPerWeek = profile?.daysPerWeek ?? 3;
  const isBeginner = profile?.experience === 'principiante';
  const custom = user ? getAssignedPlan(user.id) : null;
  const exercises = custom ? custom.exercises : isBeginner ? FOUNDATION : daysPerWeek > 3 ? SPLIT_DAY : FULL_BODY;
  const planName = custom ? custom.name : isBeginner ? 'Semana 1 · Acondicionamiento' : daysPerWeek > 3 ? 'Tren superior / inferior' : 'Cuerpo completo';
  const todayIdx = (new Date().getDay() + 6) % 7;

  const finishSession = async (names: string[]) => {
    for (const n of names) {
      if (!day.done.includes(n)) await toggleExercise(n, exercises.length);
    }
    // Guarda el entreno en Salud del teléfono (iOS) sin bloquear
    saveHealthWorkout(sessionStart, Date.now(), names.length * 90).catch(() => undefined);
    setSession(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Plan de ejercicio <span className="text-gradient-fire">semanal</span></h1>
          <p className="text-sm text-muted">
            {planName} · {daysPerWeek} días/semana
            {profile ? ` · Nivel ${profile.experience} · ${profile.place}` : ''}
          </p>
          {isBeginner && (
            <p className="mt-2 rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-2.5 text-xs text-emerald">
              🌱 Primera semana: solo cardio y peso corporal, sin máquinas ni peso. Cuando completes 4+ sesiones, cambia tu nivel a <b>Intermedio</b> en Perfil.
            </p>
          )}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto no-print">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
            <button onClick={() => setTab('rutina')} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab === 'rutina' ? 'bg-emerald/20 text-white' : 'text-muted'}`}>Rutina</button>
            <button onClick={() => setTab('hiit')} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab === 'hiit' ? 'bg-fire/20 text-white' : 'text-muted'}`}>HIIT</button>
          </div>
          <Link to="/biblioteca" className="chip !py-2 flex flex-1 items-center justify-center gap-1.5 text-xs !border-emerald/40 text-emerald sm:flex-none"><BookOpen size={14} /> Biblioteca</Link>
          <button onClick={() => { setSessionStart(Date.now()); setSession(true); }} className="btn-fire !py-2 text-sm flex flex-1 items-center justify-center gap-2 sm:flex-none"><Play size={15} /> Iniciar sesión</button>
        </div>
      </div>

      {tab === 'hiit' ? (
        <HiitTimer />
      ) : (
        <>
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
                        <button onClick={() => toggleExercise(e.name, exercises.length)} className={`mt-1 transition-all no-print ${done ? 'text-emerald' : 'text-muted hover:text-white'}`}>
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
            <div className="flex flex-col gap-4 no-print">
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
        </>
      )}

      <AnimatePresence>
        {session && <SessionPlayer exercises={exercises} onDone={finishSession} onClose={() => setSession(false)} />}
      </AnimatePresence>
    </div>
  );
}
