import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Dumbbell, Check, ChevronDown, MapPin } from 'lucide-react';
import { GlassCard } from '../components/ui';
import { useStore } from '../lib/store';
import { LIBRARY, PLANS, getAssignedPlan, assignPlan, type Muscle } from '../lib/library';

const MUSCLES: ('Todos' | Muscle)[] = ['Todos', 'Pecho', 'Espalda', 'Pierna', 'Hombro', 'Brazo', 'Core', 'Cardio', 'Movilidad'];

/** Biblioteca de ejercicios + planes asignables. */
export default function Biblioteca() {
  const { user } = useStore();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<'Todos' | Muscle>('Todos');
  const [open, setOpen] = useState<string | null>(null);
  const [assigned, setAssigned] = useState(() => (user ? getAssignedPlan(user.id)?.id ?? null : null));

  const list = LIBRARY.filter(
    (e) => (muscle === 'Todos' || e.muscle === muscle) &&
      (q.trim() === '' || e.name.toLowerCase().includes(q.toLowerCase())),
  );

  const usePlan = (id: string | null) => {
    if (!user) return;
    assignPlan(user.id, id);
    setAssigned(id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Biblioteca <span className="text-gradient-fire">y planes</span></h1>
        <p className="text-sm text-muted">{assigned ? `Plan activo: ${PLANS.find((p) => p.id === assigned)?.name}` : 'Plan automático según tu perfil'}</p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-muted">Planes listos · toca para asignar</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((p) => {
            const active = assigned === p.id;
            return (
              <motion.button key={p.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => usePlan(active ? null : p.id)}
                className={`glass p-4 text-left ${active ? '!border-emerald/60 shadow-glow-emerald' : ''}`}>
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-fire" />
                  <p className="font-bold text-sm flex-1">{p.name}</p>
                  {active && <span className="rounded-full bg-emerald/15 p-1 text-emerald"><Check size={13} /></span>}
                </div>
                <p className="mt-1 text-xs text-muted">{p.desc}</p>
                <p className="mt-2 text-[11px] text-muted">{p.days} días/sem · {p.level} · {p.focus} · {p.exercises.length} ejercicios</p>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {MUSCLES.map((m) => (
          <button key={m} onClick={() => setMuscle(m)}
            className={`chip !text-xs ${muscle === m ? 'border-emerald/60 bg-emerald/15 text-white' : 'text-muted'}`}>{m}</button>
        ))}
      </div>
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio…" className="input-kalory !pl-9 text-sm" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((e) => {
          const isOpen = open === e.name;
          return (
            <GlassCard key={e.name} className="!p-4">
              <button onClick={() => setOpen(isOpen ? null : e.name)} className="flex w-full items-center gap-3 text-left">
                <span className="rounded-xl bg-gradient-to-br from-[#10B981]/30 to-[#F59E0B]/20 p-2 text-emerald"><Dumbbell size={17} /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{e.name}</p>
                  <p className="text-[11px] text-muted">{e.muscle} · {e.level} · {e.sets}</p>
                </div>
                <ChevronDown size={16} className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <p className="pt-2 text-xs text-muted">{e.tip}</p>
                    <p className="mt-1 text-[11px] text-fire">Material: {e.equipment}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          );
        })}
      </div>
      {list.length === 0 && <p className="text-sm text-muted text-center py-6">Sin ejercicios para ese filtro.</p>}
    </div>
  );
}
