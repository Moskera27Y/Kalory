import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Dumbbell, ChevronRight, Beef, Wheat, Droplet, Plus, TrendingUp, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassCard } from '../components/ui';
import { ActivityRings, AnimatedCounter, WaterTracker } from '../components/widgets';
import FastingWidget from '../components/FastingWidget';
import { useStore } from '../lib/store';
import { staggerParent, staggerChild } from '../lib/motion';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export default function Dashboard() {
  const { profile, targets, consumed, proteinEaten, carbsEaten, fatEaten, day, logFood, logWater, activeDays, history, streak, loading } = useStore();
  const target = targets?.calories ?? 0;
  const burned = day.done.length * 90;
  const remaining = Math.max(0, target - consumed);

  const [quickName, setQuickName] = useState('');
  const [quickKcal, setQuickKcal] = useState('');

  const nowD = new Date();
  const dow = (nowD.getDay() + 6) % 7;
  const mon = new Date(nowD);
  mon.setDate(nowD.getDate() - dow);
  const monKey = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
  const weekTrainDays = history.filter((h) => h.date >= monKey && h.exercises > 0).length;
  const goalDays = profile?.daysPerWeek ?? 3;

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

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
          </div>
          <Skeleton className="h-24" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  const tiles = [
    { icon: Flame, label: 'Racha', value: `${streak} 🔥`, sub: `${activeDays} días con actividad` },
    { icon: Trophy, label: 'Semana', value: `${weekTrainDays}/${goalDays}`, sub: 'días con entreno' },
    { icon: Droplet, label: 'Agua hoy', value: `${(day.waterMl / 1000).toFixed(1)}L`, sub: `de ${((targets?.waterMl ?? 0) / 1000).toFixed(1)} L` },
    { icon: Dumbbell, label: 'Sesión', value: `${day.done.length}`, sub: 'ejercicios hoy' },
  ];

  return (
    <motion.div variants={staggerParent} initial="hidden" animate="show" className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <motion.div variants={staggerChild}>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Hola{profile?.name ? `, ${profile.name}` : ''} 👋</h1>
          {consumed === 0 && day.done.length === 0 && day.waterMl === 0 ? (
            <p className="mt-1 text-sm text-muted">Hoy empiezas desde cero: registra tu primera comida, tu agua y tu entreno.</p>
          ) : (
            <p className="mt-1 text-sm text-muted">Te faltan <b className="text-white">{remaining.toLocaleString('es')} kcal</b> para tu meta de hoy</p>
          )}
        </motion.div>

        {/* Héroe: anillos + ayuno */}
        <div className="grid gap-4 md:grid-cols-2">
          <motion.div variants={staggerChild}>
            <GlassCard glow className="glow-hover h-full">
              <p className="text-xs uppercase tracking-widest text-muted">Resumen de hoy</p>
              <ActivityRings consumed={consumed} target={Math.max(1, target)} burned={burned} />
              <div className="mt-2 flex justify-center gap-5 text-xs">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald" /> Consumidas</span>
                <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-fire to-fire-hot" /> Quemadas <b>{burned}</b></span>
              </div>
            </GlassCard>
          </motion.div>
          <motion.div variants={staggerChild}>
            <FastingWidget />
          </motion.div>
        </div>

        {/* Tiles 2x2 */}
        <motion.div variants={staggerChild} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((t) => (
            <GlassCard key={t.label} className="glow-hover !p-4 text-center">
              <t.icon size={17} className="mx-auto text-muted" />
              <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{t.value}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted">{t.label}</p>
              <p className="text-[11px] text-muted/70">{t.sub}</p>
            </GlassCard>
          ))}
        </motion.div>

        {/* Reto semanal */}
        <motion.div variants={staggerChild}>
          <Link to="/progreso">
            <GlassCard className="glow-hover flex items-center gap-4 border-emerald/20">
              <span className="rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] p-3 text-white shadow-glow-emerald"><Trophy size={22} /></span>
              <div className="flex-1">
                <p className="font-bold text-sm">Reto semanal · {weekTrainDays}/{goalDays} días con entreno</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#F59E0B]"
                    initial={{ width: 0 }} animate={{ width: `${Math.min(100, (weekTrainDays / Math.max(1, goalDays)) * 100)}%` }}
                    transition={{ type: 'spring', stiffness: 60, damping: 18 }} />
                </div>
              </div>
              <TrendingUp className="text-muted" size={18} />
            </GlassCard>
          </Link>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          <motion.div variants={staggerChild}>
            <GlassCard className="glow-hover h-full">
              <p className="text-xs uppercase tracking-widest text-muted">Macronutrientes de hoy</p>
              <div className="mt-4 flex flex-col gap-4">
                {macroRows.map((m) => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted"><m.icon size={15} /> {m.label}</span>
                      <span className="font-bold tabular-nums">{m.g}g <span className="font-normal text-muted">/ {m.goal}g</span></span>
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
          </motion.div>
          <motion.div variants={staggerChild}>
            <GlassCard className="glow-hover h-full">
              <p className="text-xs uppercase tracking-widest text-muted">Agua de hoy</p>
              <div className="mt-3"><WaterTracker ml={day.waterMl} goal={targets?.waterMl ?? 2000} onAdd={(ml) => logWater(ml)} /></div>
            </GlassCard>
          </motion.div>
        </div>

        <motion.div variants={staggerChild}>
          <Link to="/rutinas">
            <GlassCard className="glow-hover flex items-center gap-4 border-fire/20">
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
        </motion.div>
      </div>

      <div className="flex flex-col gap-4">
        <motion.div variants={staggerChild}>
          <GlassCard glow className="glow-hover">
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
                    <span className="truncate">{f.name}</span><b className="ml-2 tabular-nums">+{Math.round(f.kcal)}</b>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>

        <motion.div variants={staggerChild}>
          <GlassCard className="glow-hover">
            <div className="flex items-center gap-2 text-sm font-bold"><Dumbbell size={17} className="text-fire" /> Actividad</div>
            <p className="mt-2 text-xs text-muted">Completa ejercicios en la sección Rutinas y se reflejan aquí.</p>
            <p className="mt-3 font-display text-3xl font-extrabold text-gradient-fire"><AnimatedCounter value={burned} suffix=" kcal" /></p>
            <p className="text-xs text-muted">Estimación por ejercicios completados hoy</p>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
