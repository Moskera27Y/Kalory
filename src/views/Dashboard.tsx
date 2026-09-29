import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Dumbbell, ChevronRight, Beef, Wheat, Droplet, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassCard } from '../components/ui';
import { ActivityRings, AnimatedCounter, WaterTracker } from '../components/widgets';
import { useStore } from '../lib/store';

export default function Dashboard() {
  const { profile, targets, consumed, proteinEaten, carbsEaten, fatEaten, day, logFood, logWater, activeDays } = useStore();
  const target = targets?.calories ?? 0;
  const burned = day.done.length * 90;
  const remaining = Math.max(0, target - consumed);

  const [quickName, setQuickName] = useState('');
  const [quickKcal, setQuickKcal] = useState('');

  const macroRows = [
    { label: 'Proteínas', g: Math.round(proteinEaten), goal: targets?.protein ?? 0, color: 'from-[#10B981] to-[#059669]', icon: Beef },
    { label: 'Carbos', g: Math.round(carbsEaten), goal: targets?.carbs ?? 0, color: 'from-[#F59E0B] to-[#EF4444]', icon: Wheat },
    { label: 'Grasas', g: Math.round(fatEaten), goal: targets?.fat ?? 0, color: 'from-sky-400 to-violet-500', icon: Droplet },
  ];

  const quickAdd = async () => {
    const kcal = Math.round(Number(quickKcal));
    if (!quickName.trim() || !Number.isFinite(kcal) || kcal <= 0) return;
    await logFood({ name: quickName.trim(), kcal, meal: 'extra' });
    setQuickName('');
    setQuickKcal('');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Hola{profile?.name ? `, ${profile.name}` : ''} 👋</h1>
          {consumed === 0 && day.done.length === 0 && day.waterMl === 0 ? (
            <p className="text-sm text-muted">Hoy empiezas desde cero: registra tu primera comida, tu agua y tu entreno.</p>
          ) : (
            <p className="text-sm text-muted">{activeDays} días con actividad · Te faltan <b className="text-white">{remaining.toLocaleString('es')} kcal</b> para tu meta</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <GlassCard glow>
            <p className="text-xs uppercase tracking-widest text-muted">Resumen de hoy</p>
            <ActivityRings consumed={consumed} target={Math.max(1, target)} burned={burned} />
            <div className="mt-2 flex justify-center gap-5 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald" /> Consumidas</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-fire to-fire-hot" /> Quemadas (est.) <b>{burned}</b></span>
            </div>
          </GlassCard>

          <div className="flex flex-col gap-4">
            <GlassCard>
              <p className="text-xs uppercase tracking-widest text-muted">Macronutrientes de hoy</p>
              <div className="mt-4 flex flex-col gap-4">
                {macroRows.map((m) => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted"><m.icon size={15} /> {m.label}</span>
                      <span className="font-bold">{m.g}g <span className="font-normal text-muted">/ {m.goal}g</span></span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                      <motion.div className={`h-full rounded-full bg-gradient-to-r ${m.color}`}
                        initial={{ width: 0 }} animate={{ width: `${m.goal ? Math.min(100, (m.g / m.goal) * 100) : 0}%` }}
                        transition={{ type: 'spring', stiffness: 60, damping: 18 }} />
                    </div>
                  </div>
                ))}
              </div>
              {consumed === 0 && <p className="mt-3 text-xs text-muted">Sin registros hoy. Todo parte de 0.</p>}
            </GlassCard>
            <GlassCard>
              <p className="text-xs uppercase tracking-widest text-muted">Agua de hoy</p>
              <div className="mt-3"><WaterTracker ml={day.waterMl} goal={targets?.waterMl ?? 2000} onAdd={(ml) => logWater(ml)} /></div>
            </GlassCard>
          </div>
        </div>

        <Link to="/rutinas">
          <GlassCard className="flex items-center gap-4 border-fire/20">
            <span className="rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#EF4444] p-3 text-white shadow-glow-fire"><Flame size={22} /></span>
            <div className="flex-1">
              <p className="font-bold">Rutina de hoy
                <span className="ml-2 rounded-full bg-fire/15 px-2 py-0.5 text-xs text-fire">
                  {profile ? `${profile.daysPerWeek} días/sem · ${profile.place}` : 'Ver plan'}
                </span>
              </p>
              <p className="text-xs text-muted">{day.done.length === 0 ? 'Aún no completaste ejercicios hoy' : `${day.done.length} ejercicios completados`}</p>
            </div>
            <ChevronRight className="text-muted" />
          </GlassCard>
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        <GlassCard glow>
          <div className="flex items-center gap-2 text-sm font-bold"><Plus size={17} className="text-emerald" /> Registro rápido</div>
          <p className="mt-2 text-xs text-muted">Añade lo que comiste con sus calorías reales.</p>
          <div className="mt-4 grid gap-2">
            <input value={quickName} onChange={(e) => setQuickName(e.target.value)} className="input-kalory text-sm" placeholder="Ej. Ensalada de atún" />
            <div className="flex gap-2">
              <input value={quickKcal} onChange={(e) => setQuickKcal(e.target.value)} type="number" min={1} className="input-kalory text-sm" placeholder="kcal" />
              <motion.button whileTap={{ scale: 0.97 }} onClick={quickAdd} className="btn-emerald !px-4 text-sm whitespace-nowrap">Añadir</motion.button>
            </div>
          </div>
          {day.foods.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              {day.foods.slice(-4).map((f) => (
                <div key={f.id} className="flex justify-between text-xs rounded-lg bg-white/5 px-3 py-2">
                  <span className="truncate">{f.name}</span><b className="ml-2">+{Math.round(f.kcal)}</b>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 text-sm font-bold"><Dumbbell size={17} className="text-fire" /> Actividad</div>
          <p className="mt-2 text-xs text-muted">Completa ejercicios en la sección Rutinas y se reflejan aquí.</p>
          <p className="mt-3 font-display text-3xl font-extrabold text-gradient-fire"><AnimatedCounter value={burned} suffix=" kcal" /></p>
          <p className="text-xs text-muted">Estimación por ejercicios completados hoy</p>
        </GlassCard>
      </div>
    </div>
  );
}
