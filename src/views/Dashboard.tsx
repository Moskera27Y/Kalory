import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Dumbbell, ChevronRight, Beef, Wheat, Droplet, Plus, TrendingUp, Trophy, Footprints, X, PieChart, Star, PartyPopper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassCard } from '../components/ui';
import { ActivityRings, AnimatedCounter, WaterTracker } from '../components/widgets';
import FastingWidget from '../components/FastingWidget';
import { STEPS_GOAL, saveWidgetSnapshot } from '../lib/steps';
import { saveSleep, listSleep, avgSleep } from '../lib/sleep';
import { coachMessage, type CoachIcon } from '../lib/coach';
import { fastingState, PROTOCOLS } from '../lib/fasting';
import { UtensilsCrossed, MoonStar, Moon } from 'lucide-react';
import { useStore } from '../lib/store';
import { staggerParent, staggerChild } from '../lib/motion';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export default function Dashboard() {
  const { user, profile, targets, consumed, proteinEaten, carbsEaten, fatEaten, day, logFood, logWater, activeDays, history, streak, loading, steps, stepsSupported, stepsError, refreshSteps } = useStore();
  const target = targets?.calories ?? 0;
  const burned = day.done.length * 90;
  const remaining = Math.max(0, target - consumed);

  const [quickName, setQuickName] = useState('');
  const [quickKcal, setQuickKcal] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [bed, setBed] = useState('23:00');
  const [wake, setWake] = useState('07:00');
  const [, setSleepTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    saveWidgetSnapshot({
      steps: steps !== null ? steps.toLocaleString('es') : '—',
      water: `${(day.waterMl / 1000).toFixed(1)}L`,
      streak: `${streak}🔥`,
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumed, day.waterMl, streak, steps]);

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
            <button onClick={() => setShowSummary(true)} className="w-full text-left">
            <GlassCard glow className="glow-hover h-full">
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-widest text-muted">Resumen de hoy</p>
                <PieChart size={13} className="text-muted" />
              </div>
              <ActivityRings consumed={consumed} target={Math.max(1, target)} burned={burned} />
              <div className="mt-2 flex justify-center gap-5 text-xs">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald" /> Consumidas</span>
                <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-fire to-fire-hot" /> Quemadas <b>{burned}</b></span>
              </div>
              <p className="mt-2 text-center text-[11px] text-emerald">Toca para ver el desglose →</p>
            </GlassCard>
            </button>
          </motion.div>
          <motion.div variants={staggerChild}>
            <FastingWidget />
          </motion.div>
        </div>

        {/* Tiles 2x2 */}
        <motion.div variants={staggerChild} className={`grid grid-cols-2 gap-3 ${stepsSupported ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
          {tiles.map((t) => (
            <GlassCard key={t.label} className="glow-hover !p-4 text-center">
              <t.icon size={17} className="mx-auto text-muted" />
              <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{t.value}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted">{t.label}</p>
              <p className="text-[11px] text-muted/70">{t.sub}</p>
            </GlassCard>
          ))}
          {stepsSupported && (
            <motion.button variants={staggerChild} onClick={() => refreshSteps()} title="Toca para actualizar" className="text-left">
              <GlassCard className="glow-hover !p-4 text-center h-full border-emerald/20">
                <Footprints size={17} className="mx-auto text-emerald" />
                <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">
                  {steps !== null ? steps.toLocaleString('es') : '• • •'}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-muted">Pasos</p>
                <p className="text-[11px] text-muted/70">
                  {steps !== null ? `meta ${STEPS_GOAL.toLocaleString('es')}` : stepsError ?? 'toca para activar'}
                </p>
              </GlassCard>
            </motion.button>
          )}
        </motion.div>

        {/* Coach + siguiente acción */}
        <motion.div variants={staggerChild} className="flex flex-col gap-3">
          {(() => {
            const h = new Date().getHours();
            const fst = user?.id ? fastingState(user.id) : null;
            const felapsed = fst?.activeStart ? Date.now() - fst.activeStart : 0;
            const fproto = PROTOCOLS.find((p) => p.id === fst?.protocolId);
            const cIcons: Record<CoachIcon, typeof Flame> = {
              flame: Flame, droplet: Droplet, dumbbell: Dumbbell, food: UtensilsCrossed,
              trophy: Trophy, party: PartyPopper, moon: MoonStar, star: Star,
            };
            const msg = coachMessage({
              name: profile?.name?.split(' ')[0] || 'campeón',
              streak, weekTrainDays, goalDays,
              hasFood: day.foods.length > 0,
              waterPct: targets ? day.waterMl / Math.max(1, targets.waterMl) : 0,
              consumedPct: target ? consumed / Math.max(1, target) : 0,
              doneExercises: day.done.length,
              fastingActive: !!fst?.activeStart,
              fastingDone: !!fst?.activeStart && fproto ? felapsed >= fproto.hours * 3600000 : false,
            });
            const CIcon = cIcons[msg.icon];
            let action: { icon: typeof Flame; text: string; to: string; cta: string } | null = null;
            if (day.foods.length === 0) {
              action = {
                icon: Plus,
                text: h < 11 ? 'Empieza el día registrando tu desayuno' : h < 15 ? 'Registra tu almuerzo para no perder la cuenta' : 'Anota tu próxima comida',
                to: '/dieta', cta: 'Registrar',
              };
            } else if (targets && day.waterMl < targets.waterMl * 0.5) {
              action = { icon: Droplet, text: `Vas en ${(day.waterMl / 1000).toFixed(1)} L de agua: toma un vaso ahora`, to: '/', cta: 'Anotar agua' };
            } else if (day.done.length === 0) {
              action = { icon: Dumbbell, text: 'Te falta el entreno de hoy: abre tu rutina', to: '/rutinas', cta: 'Entrenar' };
            } else if (targets && consumed < targets.calories * 0.9 && h >= 19) {
              action = { icon: Beef, text: `Te faltan ${Math.round(targets.calories - consumed)} kcal: completa con una cena con proteína`, to: '/dieta', cta: 'Cenar' };
            }
            return (
              <>
                <div className="glass flex items-center gap-3 px-4 py-3">
                  <span className="rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-2 text-white shrink-0"><CIcon size={17} /></span>
                  <p className="text-[13px] leading-snug"><b className="text-white">Coach:</b> <span className="text-muted">{msg.text}</span></p>
                </div>
                {action && (() => {
                  const AIcon = action.icon;
                  return (
                    <Link to={action.to}>
                      <GlassCard className="glow-hover flex items-center gap-4 border-fire/30 bg-gradient-to-r from-fire/10 to-transparent">
                        <span className="rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#EF4444] p-2.5 text-white shadow-glow-fire"><AIcon size={19} /></span>
                        <p className="flex-1 text-sm font-semibold">{action.text}</p>
                        <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">{action.cta} →</span>
                      </GlassCard>
                    </Link>
                  );
                })()}
              </>
            );
          })()}
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
        <motion.div variants={staggerChild}>
          <GlassCard className="glow-hover">
            <div className="flex items-center gap-2 text-sm font-bold"><Moon size={17} className="text-violet-400" /> Sueño</div>
            {(() => {
              const mine = user ? listSleep(user.id) : [];
              const last = mine[0];
              const avg = user ? avgSleep(user.id) : null;
              return (
                <>
                  {last && <p className="mt-2 text-xs text-muted">Anoche: <b className="text-white">{last.hours} h</b> ({last.bed} → {last.wake}){avg != null ? ` · prom. ${avg} h` : ''}</p>}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-[11px] text-muted">Acostada
                      <input type="time" value={bed} onChange={(e) => setBed(e.target.value)} className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-xs text-center tabular-nums" />
                    </label>
                    <label className="grid gap-1 text-[11px] text-muted">Despertada
                      <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-xs text-center tabular-nums" />
                    </label>
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => { if (user) { saveSleep(user.id, bed, wake); setSleepTick((x) => x + 1); } }} className="btn-emerald mt-2 w-full !py-2 text-xs">
                    Guardar noche
                  </motion.button>
                </>
              );
            })()}
          </GlassCard>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSummary && (
          <DaySummaryModal
            consumed={consumed}
            target={target}
            burned={burned}
            foods={day.foods}
            done={day.done}
            onClose={() => setShowSummary(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DaySummaryModal({ consumed, target, burned, foods, done, onClose }: {
  consumed: number; target: number; burned: number;
  foods: { id: number; name: string; kcal: number; meal: string }[];
  done: string[]; onClose: () => void;
}) {
  const meals = ['Desayuno', 'Almuerzo', 'Cena', 'Snack', 'Extra'];
  const byMeal = meals
    .map((m) => ({ meal: m, items: foods.filter((f) => f.meal === m) }))
    .filter((g) => g.items.length > 0);
  const balance = Math.round(consumed - target);
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="glass-strong w-full max-w-md p-6 max-h-[85vh] overflow-y-auto"
        initial={{ scale: 0.9, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <PieChart size={17} className="text-emerald" />
          <p className="font-bold">Resumen de hoy</p>
          <button onClick={onClose} className="ml-auto chip !px-3 !py-1.5 text-muted"><X size={14} /></button>
        </div>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          El anillo verde muestra lo que <b className="text-white">comiste</b> frente a tu meta;
          el naranja, lo que <b className="text-white">quemaste</b> entrenando (estimación).
        </p>

        <p className="mt-4 text-xs uppercase tracking-widest text-muted">Consumidas · {Math.round(consumed).toLocaleString('es')} kcal</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {byMeal.length === 0 && <p className="text-xs text-muted">Nada registrado hoy.</p>}
          {byMeal.map((g) => (
            <div key={g.meal} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
              <div className="flex justify-between text-xs">
                <b>{g.meal}</b>
                <b className="tabular-nums">{Math.round(g.items.reduce((a, x) => a + x.kcal, 0))} kcal</b>
              </div>
              {g.items.map((f) => (
                <div key={f.id} className="flex justify-between text-[11px] text-muted">
                  <span className="truncate">{f.name}</span>
                  <span className="ml-2 tabular-nums">{Math.round(f.kcal)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs uppercase tracking-widest text-muted">Quemadas (est.) · {burned} kcal</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {done.length === 0 && <p className="text-xs text-muted">Sin ejercicios hoy. Cada ejercicio suma ~90 kcal.</p>}
          {done.map((e) => (
            <div key={e} className="flex justify-between text-xs rounded-lg bg-fire/10 border border-fire/20 px-3 py-2">
              <span>{e}</span><b className="tabular-nums">~90</b>
            </div>
          ))}
        </div>

        <div className={`mt-4 rounded-xl border p-3 text-center text-sm font-bold ${balance <= 0 ? 'border-emerald/40 bg-emerald/10 text-emerald' : 'border-fire/40 bg-fire/10 text-fire'}`}>
          {balance <= 0 ? `Vas ${Math.abs(balance).toLocaleString('es')} kcal por debajo de tu meta` : `Te pasaste por ${balance.toLocaleString('es')} kcal de tu meta`}
        </div>
      </motion.div>
    </motion.div>
  );
}
