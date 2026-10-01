import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, Flame, Leaf, Beef, WheatOff, Salad, Home, Building2, Shuffle, Coffee } from 'lucide-react';
import Logo from '../components/Logo';
import { useStore } from '../lib/store';
import { calcMacros, calcTDEE } from '../lib/calculations';
import { EMPTY_PROFILE, type UserProfile } from '../types';

const steps = ['Datos', 'Medidas', 'Actividad', 'Entrenamiento', 'Objetivo', 'Nutrición', 'Tu plan'];

const activities = [
  { id: 'sedentario', label: 'Sedentario', desc: 'Poco o nada de ejercicio', icon: '🛋️' },
  { id: 'ligero', label: 'Ligero', desc: '1–3 días / semana', icon: '🚶' },
  { id: 'moderado', label: 'Moderado', desc: '3–5 días / semana', icon: '🏃' },
  { id: 'muy_activo', label: 'Muy activo', desc: '6–7 días / semana', icon: '🔥' },
] as const;

const experiences = [
  { id: 'principiante', label: 'Principiante', desc: 'Menos de 6 meses entrenando' },
  { id: 'intermedio', label: 'Intermedio', desc: '6 meses – 2 años' },
  { id: 'avanzado', label: 'Avanzado', desc: 'Más de 2 años' },
] as const;

const places = [
  { id: 'casa', label: 'En casa', icon: Home },
  { id: 'gimnasio', label: 'Gimnasio', icon: Building2 },
  { id: 'mixto', label: 'Mixto', icon: Shuffle },
] as const;

const goals = [
  { id: 'perder_grasa', label: 'Perder grasa', desc: 'Déficit controlado', icon: Flame, grad: 'from-[#F59E0B] to-[#EF4444]' },
  { id: 'ganar_musculo', label: 'Ganar músculo', desc: 'Superávit + proteína', icon: Beef, grad: 'from-[#10B981] to-[#059669]' },
  { id: 'mantenimiento', label: 'Mantenimiento', desc: 'Equilibrio total', icon: Salad, grad: 'from-sky-400 to-emerald-500' },
  { id: 'salud', label: 'Salud general', desc: 'Energía y hábito', icon: Leaf, grad: 'from-lime-400 to-emerald-600' },
] as const;

const diets = [
  { id: 'omnivoro', label: 'Omnívoro', icon: Beef },
  { id: 'vegetariano', label: 'Vegetariano', icon: Salad },
  { id: 'vegano', label: 'Vegano', icon: Leaf },
  { id: 'sin_gluten', label: 'Sin gluten', icon: WheatOff },
  { id: 'keto', label: 'Keto', icon: Flame },
] as const;

export default function Onboarding({ mode = 'first' }: { mode?: 'first' | 'edit' }) {
  const { profile, completeOnboarding } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<UserProfile>(profile ?? { ...EMPTY_PROFILE });
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof UserProfile>(k: K, v: UserProfile[K]) => setForm((f) => ({ ...f, [k]: v }));

  const canNext =
    step === 0 ? form.name.trim().length > 1 && form.age > 0
    : step === 1 ? form.weightKg > 0 && form.targetWeightKg > 0 && form.heightCm > 0
    : true;

  const next = () => {
    if (step === 5) {
      setThinking(true);
      setTimeout(() => { setThinking(false); setStep(6); }, 1400);
    } else setStep((s) => s + 1);
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    setSaving(true);
    try {
      await completeOnboarding(form);
      if (mode === 'edit') navigate('/perfil');
    } finally {
      setSaving(false);
    }
  };

  const preview = calcTDEE(form);
  const macrosPreview = calcMacros(form);

  return (
    <div className="onboarding h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center justify-between">
          <Logo size={36} />
          <span className="text-xs text-muted">Paso {step + 1} / 7 · {steps[step]}</span>
        </div>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-[#10B981] via-[#F59E0B] to-[#EF4444]"
            animate={{ width: `${((step + 1) / 7) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        </div>

        <div className="mt-8 min-h-[420px]">
          <AnimatePresence mode="wait">
            <motion.div key={step}
              initial={{ opacity: 0, x: 48 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -48 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}>

              {step === 0 && (
                <div>
                  <h2 className="font-display text-3xl font-extrabold">Cuéntanos <span className="text-gradient-emerald">quién eres</span></h2>
                  <p className="mt-2 text-muted">Estos datos se usan para calcular tu metabolismo basal.</p>
                  <div className="glass mt-6 grid gap-4 p-6">
                    <label className="grid gap-1.5 text-sm">Nombre
                      <input className="input-kalory" placeholder="Ej. Alex" value={form.name} onChange={(e) => set('name', e.target.value)} />
                    </label>
                    <label className="grid gap-1.5 text-sm text-muted">Edad (años)
                      <input type="number" min={10} max={100} className="input-kalory" value={form.age} onChange={(e) => set('age', Number(e.target.value))} />
                    </label>
                    <div className="flex gap-2">
                      {(['masculino', 'femenino', 'otro'] as const).map((g) => (
                        <button key={g} onClick={() => set('gender', g)}
                          className={`chip flex-1 capitalize ${form.gender === g ? 'border-emerald/60 bg-emerald/15 text-white shadow-glow-emerald' : 'text-muted'}`}>{g}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2 className="font-display text-3xl font-extrabold">Tus <span className="text-gradient-emerald">medidas</span></h2>
                  <p className="mt-2 text-muted">Punto de partida y meta para medir tu progreso.</p>
                  <div className="glass mt-6 grid gap-4 p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <label className="grid gap-1.5 text-sm text-muted">Peso actual (kg)
                        <input type="number" min={30} max={300} className="input-kalory" value={form.weightKg} onChange={(e) => set('weightKg', Number(e.target.value))} />
                      </label>
                      <label className="grid gap-1.5 text-sm text-muted">Peso objetivo (kg)
                        <input type="number" min={30} max={300} className="input-kalory" value={form.targetWeightKg} onChange={(e) => set('targetWeightKg', Number(e.target.value))} />
                      </label>
                      <label className="grid gap-1.5 text-sm text-muted">Altura (cm)
                        <input type="number" min={120} max={230} className="input-kalory" value={form.heightCm} onChange={(e) => set('heightCm', Number(e.target.value))} />
                      </label>
                    </div>
                    {form.weightKg > 0 && form.targetWeightKg > 0 && (
                      <p className="text-sm text-muted">
                        Diferencia: <b className="text-white">{(form.targetWeightKg - form.weightKg).toFixed(1)} kg</b>
                        {form.targetWeightKg < form.weightKg ? ' a perder' : form.targetWeightKg > form.weightKg ? ' a ganar' : ' (mantenimiento)'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="font-display text-3xl font-extrabold">Tu nivel de <span className="text-gradient-fire">actividad</span></h2>
                  <p className="mt-2 text-muted">Fuera del entrenamiento: trabajo, pasos, día a día.</p>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {activities.map((a) => (
                      <motion.button key={a.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => set('activity', a.id)}
                        className={`glass p-5 text-left ${form.activity === a.id ? 'border-[#F59E0B]/60 shadow-glow-fire' : ''}`}>
                        <span className="text-2xl">{a.icon}</span>
                        <p className="mt-2 font-bold">{a.label}</p><p className="text-xs text-muted">{a.desc}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="font-display text-3xl font-extrabold">Tu <span className="text-gradient-fire">entrenamiento</span></h2>
                  <p className="mt-2 text-muted">Así ajustamos el plan semanal a tu realidad.</p>
                  <p className="mt-5 text-xs uppercase tracking-widest text-muted">Experiencia</p>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {experiences.map((e) => (
                      <button key={e.id} onClick={() => set('experience', e.id)}
                        className={`glass p-4 text-left ${form.experience === e.id ? 'border-emerald/60 shadow-glow-emerald' : ''}`}>
                        <p className="font-bold text-sm">{e.label}</p><p className="mt-1 text-[11px] text-muted">{e.desc}</p>
                      </button>
                    ))}
                  </div>
                  <p className="mt-5 text-xs uppercase tracking-widest text-muted">Días disponibles por semana</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <button key={d} onClick={() => set('daysPerWeek', d)}
                        className={`chip flex-1 !px-0 text-center ${form.daysPerWeek === d ? 'border-fire/60 bg-fire/15 text-white shadow-glow-fire' : 'text-muted'}`}>{d}</button>
                    ))}
                  </div>
                  <p className="mt-5 text-xs uppercase tracking-widest text-muted">¿Dónde entrenas?</p>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {places.map((p) => (
                      <button key={p.id} onClick={() => set('place', p.id)}
                        className={`glass flex items-center justify-center gap-2 p-4 text-sm font-bold ${form.place === p.id ? 'border-emerald/60 shadow-glow-emerald' : 'text-muted'}`}>
                        <p.icon size={17} /> {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h2 className="font-display text-3xl font-extrabold">¿Cuál es tu <span className="text-gradient-emerald">objetivo?</span></h2>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {goals.map((g) => (
                      <motion.button key={g.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => set('goal', g.id)}
                        className={`glass overflow-hidden p-5 text-left ${form.goal === g.id ? 'border-emerald/60 shadow-glow-emerald' : ''}`}>
                        <span className={`inline-flex rounded-xl bg-gradient-to-r p-2.5 text-white ${g.grad}`}><g.icon size={20} /></span>
                        <p className="mt-3 font-bold">{g.label}</p><p className="text-xs text-muted">{g.desc}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div>
                  <h2 className="font-display text-3xl font-extrabold">Tu <span className="text-gradient-emerald">alimentación</span></h2>
                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {diets.map((d) => (
                      <motion.button key={d.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => set('diet', d.id)}
                        className={`glass p-4 text-center ${form.diet === d.id ? 'border-emerald/60 shadow-glow-emerald' : ''}`}>
                        <d.icon className="mx-auto text-emerald" size={22} />
                        <p className="mt-2 text-sm font-bold">{d.label}</p>
                      </motion.button>
                    ))}
                  </div>
                  <div className="glass mt-4 grid gap-4 p-6">
                    <label className="grid gap-1.5 text-sm text-muted">Alergias o restricciones (escribe “Ninguna” si no tienes)
                      <input className="input-kalory" placeholder="Ej. Ninguna / frutos secos / lactosa…" value={form.allergies} onChange={(e) => set('allergies', e.target.value)} />
                    </label>
                    <div>
                      <p className="text-sm text-muted">¿Cuántas comidas haces al día?</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[2, 3, 4, 5, 6].map((n) => (
                          <button key={n} onClick={() => set('mealsPerDay', n)}
                            className={`chip flex-1 !px-0 text-center ${form.mealsPerDay === n ? 'border-emerald/60 bg-emerald/15 text-white' : 'text-muted'}`}>{n}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="glass card-glow-emerald p-8 text-center">
                  {thinking ? (
                    <div>
                      <Coffee className="mx-auto animate-pulse text-fire" size={36} />
                      <h2 className="mt-4 font-display text-2xl font-extrabold">Calculando tu plan…</h2>
                      <p className="mt-2 text-sm text-muted">Metabolismo basal · gasto total · reparto de macros</p>
                    </div>
                  ) : (
                    <div>
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-[#10B981] to-[#059669] text-white"><Check /></span>
                      <h2 className="mt-4 font-display text-2xl font-extrabold">¡Listo{form.name ? `, ${form.name}` : ''}! 🎯</h2>
                      <div className="mx-auto mt-6 grid max-w-lg grid-cols-3 gap-3">
                        <div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-muted">Metabolismo basal</p><p className="text-xl font-extrabold">{preview.bmr}</p><p className="text-[11px] text-muted">kcal/día</p></div>
                        <div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-muted">Gasto total</p><p className="text-xl font-extrabold">{preview.tdee}</p><p className="text-[11px] text-muted">kcal/día</p></div>
                        <div className="rounded-xl border border-fire/40 bg-fire/10 p-4"><p className="text-xs text-fire">Meta diaria</p><p className="text-xl font-extrabold text-gradient-fire">{preview.target}</p><p className="text-[11px] text-muted">kcal/día</p></div>
                      </div>
                      <div className="mx-auto mt-3 grid max-w-lg grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="rounded-xl bg-white/5 p-3"><p className="text-[11px] text-muted">Proteína</p><p className="font-extrabold">{macrosPreview.protein}g</p></div>
                        <div className="rounded-xl bg-white/5 p-3"><p className="text-[11px] text-muted">Carbos</p><p className="font-extrabold">{macrosPreview.carbs}g</p></div>
                        <div className="rounded-xl bg-white/5 p-3"><p className="text-[11px] text-muted">Grasas</p><p className="font-extrabold">{macrosPreview.fat}g</p></div>
                        <div className="rounded-xl bg-white/5 p-3"><p className="text-[11px] text-muted">Agua</p><p className="font-extrabold">{(macrosPreview.waterMl / 1000).toFixed(1)}L</p></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {!thinking && (
          <div className="mt-8 flex items-center justify-between">
            <button onClick={back} disabled={step === 0} className="chip flex items-center gap-2 text-muted disabled:opacity-30"><ArrowLeft size={16} /> Atrás</button>
            {step < 6 ? (
              <button onClick={next} disabled={!canNext} className="btn-emerald flex items-center gap-2">
                {step === 5 ? 'Calcular mi plan' : 'Continuar'} <ArrowRight size={17} />
              </button>
            ) : (
              <button onClick={finish} disabled={saving} className="btn-emerald flex items-center gap-2">
                {saving ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Guardar y entrar'} <Check size={17} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
