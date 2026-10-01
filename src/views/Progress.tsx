import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TrendingDown, Flame, Droplet, Dumbbell, Scale, ChevronLeft, ChevronRight, Camera, Trash2, Columns2, CalendarDays, Award } from 'lucide-react';
import { GlassCard } from '../components/ui';
import { useStore } from '../lib/store';
import { todayStr } from '../lib/db';
import { addPhoto, deletePhoto, listPhotos, type ProgressPhoto } from '../lib/photos';
import { totalFastedHours } from '../lib/fasting';
import type { DayHistory } from '../types';

function Bars({ data, getValue, format, color, target }: {
  data: DayHistory[]; getValue: (d: DayHistory) => number; format: (v: number) => string; color: string; target?: number;
}) {
  const max = Math.max(target || 0, ...data.map(getValue), 1);
  return (
    <div>
      <div className="flex h-36 items-end gap-1">
        {data.map((d) => {
          const v = getValue(d);
          return (
            <div key={d.date} className="group relative flex-1 flex flex-col justify-end h-full">
              <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {d.date.slice(5)} · {format(v)}
              </span>
              <motion.div
                className={`w-full rounded-t-md bg-gradient-to-t ${color}`}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(3, (v / max) * 100)}%` }}
                transition={{ type: 'spring', stiffness: 90, damping: 20 }}
                style={{ opacity: v === 0 ? 0.25 : 1 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>{data[0]?.date.slice(5)}</span>
        {target !== undefined && <span>Meta: {format(target)}</span>}
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function WeightLine({ data, target }: { data: DayHistory[]; target: number }) {
  const pts = data.map((d) => d.weight).filter((w): w is number => w != null);
  if (pts.length < 1) return <p className="py-8 text-center text-sm text-muted">Registra tu peso para ver la curva.</p>;
  const W = 600, H = 160, P = 24;
  const all = [...pts, target];
  const min = Math.min(...all) - 1, max = Math.max(...all) + 1;
  const X = (i: number) => P + (i / Math.max(1, data.length - 1)) * (W - 2 * P);
  const Y = (v: number) => H - P - ((v - min) / Math.max(0.1, max - min)) * (H - 2 * P);
  // interpola nulos con el último valor conocido
  let last: number | null = null;
  const series = data.map((d) => { if (d.weight != null) last = d.weight; return last; });
  const path = series.map((v, i) => (v == null ? '' : `${i === 0 || series[i - 1] == null ? 'M' : 'L'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`)).join(' ');
  const ty = Y(target);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="wl" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <line x1={P} y1={ty} x2={W - P} y2={ty} stroke="#F59E0B" strokeDasharray="5 4" strokeWidth="1.5" opacity="0.8" />
      <text x={W - P} y={ty - 6} textAnchor="end" fontSize="11" fill="#F59E0B">meta {target} kg</text>
      <motion.path d={path} fill="none" stroke="url(#wl)" strokeWidth="3" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }} />
      {data.map((d, i) => d.weight != null && (
        <g key={d.date}>
          <circle cx={X(i)} cy={Y(d.weight)} r="4" fill="#10B981" stroke="#070B16" strokeWidth="2" />
          <text x={X(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#9CA3AF">{d.date.slice(5)}</text>
        </g>
      ))}
    </svg>
  );
}

export default function Progress() {
  const { history, profile, targets, setWeight, streak, weekWorkouts, user, unlockMedal } = useStore();
  const [monthShift, setMonthShift] = useState(0);
  const [range, setRange] = useState<14 | 30>(14);
  const [weightInput, setWeightInput] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [photos, setPhotos] = useState<ProgressPhoto[]>(() => user?.id ? listPhotos(user.id) : []);
  const [compare, setCompare] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);

  const data = history.slice(-range);
  const avgKcal = data.length ? Math.round(data.reduce((a, d) => a + d.kcal, 0) / data.length) : 0;
  const activeDays = data.filter((d) => d.kcal > 0 || d.waterMl > 0 || d.exercises > 0).length;
  const totalWorkouts = data.reduce((a, d) => a + d.exercises, 0);
  const lastWeight = [...history].reverse().find((d) => d.weight != null)?.weight ?? null;

  // Semana visible (paso ±7 días)
  const ref = new Date();
  ref.setDate(ref.getDate() + weekOffset * 7);
  const dow = (ref.getDay() + 6) % 7;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - dow);
  const weekDays: DayHistory[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    weekDays.push(history.find((h) => h.date === key) || { date: key, kcal: 0, protein: 0, carbs: 0, fat: 0, waterMl: 0, exercises: 0, weight: null });
  }

  const saveWeight = async () => {
    const v = Number(weightInput.replace(',', '.'));
    if (!Number.isFinite(v)) return;
    await setWeight(v, todayStr());
    setWeightInput('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Tu <span className="text-gradient-emerald">progreso</span></h1>
          <p className="text-sm text-muted">Racha actual: <b className="text-fire">{streak} días 🔥</b> · {weekWorkouts} ejercicios esta semana</p>
        </div>
        <div className="ml-auto flex gap-1.5">
          <Link to="/informe" className="chip !py-1.5 !text-xs !border-fire/40 text-fire">Informe / PDF</Link>
          {([14, 30] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`chip !py-1.5 !text-xs ${range === r ? 'border-emerald/60 bg-emerald/15 text-white' : 'text-muted'}`}>{r} días</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Flame, label: 'Promedio kcal', value: avgKcal.toLocaleString('es'), grad: 'text-gradient-fire' },
          { icon: Dumbbell, label: 'Días activos', value: `${activeDays}/${data.length}`, grad: 'text-gradient-emerald' },
          { icon: Droplet, label: 'Ejercicios', value: String(totalWorkouts), grad: 'text-white' },
        ].map((s) => (
          <GlassCard key={s.label} className="!p-4 text-center">
            <s.icon size={18} className="mx-auto text-muted" />
            <p className={`mt-1 font-display text-2xl font-extrabold ${s.grad}`}>{s.value}</p>
            <p className="text-[11px] text-muted">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard glow>
        <div className="flex items-center gap-2">
          <Award size={17} className="text-fire" />
          <p className="text-sm font-bold">Récords personales</p>
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {(() => {
            let best = 0, cur = 0;
            for (const d of history) {
              if (d.kcal > 0 || d.waterMl > 0 || d.exercises > 0) { cur++; best = Math.max(best, cur); }
              else cur = 0;
            }
            let bestDay: DayHistory | null = null;
            for (const d of history) if (!bestDay || d.kcal > bestDay.kcal) bestDay = d;
            const totEx = history.reduce((a, d) => a + d.exercises, 0);
            return [
              ['Mejor racha', `${best} días`],
              ['Día top kcal', bestDay && bestDay.kcal > 0 ? `${Math.round(bestDay.kcal)} · ${bestDay.date.slice(5)}` : '—'],
              ['Ejercicios (60d)', `${totEx}`],
              ['Horas de ayuno', `${Math.round(totalFastedHours(user?.id ?? 0))} h`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/[0.04] border border-white/5 p-3">
                <p className="text-[11px] text-muted">{k}</p>
                <p className="font-display text-lg font-extrabold">{v}</p>
              </div>
            ));
          })()}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-2">
          <CalendarDays size={17} className="text-emerald" />
          <p className="text-sm font-bold">Calendario</p>
          <div className="ml-auto flex gap-1">
            <button onClick={() => setMonthShift((o) => o - 1)} className="chip !p-1.5"><ChevronLeft size={15} /></button>
            <button onClick={() => setMonthShift(0)} className={`chip !py-1.5 !text-xs ${monthShift === 0 ? 'border-emerald/50 text-emerald' : 'text-muted'}`}>
              {(() => { const d = new Date(); d.setMonth(d.getMonth() + monthShift); return d.toLocaleDateString('es', { month: 'long', year: 'numeric' }); })()}
            </button>
            <button onClick={() => setMonthShift((o) => Math.min(0, o + 1))} disabled={monthShift >= 0} className="chip !p-1.5 disabled:opacity-30"><ChevronRight size={15} /></button>
          </div>
        </div>
        {(() => {
          const base = new Date();
          base.setMonth(base.getMonth() + monthShift, 1);
          const startOffset = (base.getDay() + 6) % 7;
          const dim = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
          const active = new Set(history.filter((d) => d.kcal > 0 || d.waterMl > 0 || d.exercises > 0).map((d) => d.date));
          const cells: (string | null)[] = [...Array<string | null>(startOffset).fill(null)];
          for (let d = 1; d <= dim; d++) {
            cells.push(`${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
          }
          const todayK = todayStr();
          return (
            <div className="mt-3 grid grid-cols-7 gap-1 text-center">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((l) => <p key={l} className="text-[10px] font-bold text-muted">{l}</p>)}
              {cells.map((c, i) => c === null ? <span key={`e${i}`} /> : (
                <span key={c}
                  className={`rounded-lg py-1.5 text-[11px] font-bold ${active.has(c) ? 'bg-gradient-to-br from-[#10B981]/40 to-[#F59E0B]/30 text-white' : 'text-muted/50'} ${c === todayK ? 'ring-1 ring-fire' : ''}`}>
                  {Number(c.slice(8))}
                </span>
              ))}
            </div>
          );
        })()}
      </GlassCard>

      <GlassCard glow>
        <div className="flex items-center gap-2">
          <Scale size={17} className="text-emerald" />
          <p className="text-sm font-bold">Peso corporal</p>
          {lastWeight != null && <span className="ml-auto text-sm font-extrabold">{lastWeight} kg</span>}
        </div>
        <div className="mt-3"><WeightLine data={data} target={profile?.targetWeightKg ?? 0} /></div>
        <div className="mt-3 flex gap-2">
          <input value={weightInput} onChange={(e) => setWeightInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveWeight(); }}
            type="number" min={20} max={400} step="0.1" className="input-kalory !py-2 text-sm" placeholder={`Peso de hoy en kg${profile ? ` (meta ${profile.targetWeightKg})` : ''}`} />
          <motion.button whileTap={{ scale: 0.97 }} onClick={saveWeight} className="btn-emerald !py-2 text-sm whitespace-nowrap">Registrar</motion.button>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <p className="text-xs uppercase tracking-widest text-muted">Calorías por día</p>
          <div className="mt-3"><Bars data={data} getValue={(d) => Math.round(d.kcal)} format={(v) => `${v} kcal`} color="from-[#F59E0B] to-[#EF4444]" target={targets?.calories} /></div>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-widest text-muted">Agua por día (L)</p>
          <div className="mt-3"><Bars data={data} getValue={(d) => Math.round(d.waterMl / 100) / 10} format={(v) => `${v.toFixed(1)} L`} color="from-[#10B981] to-[#059669]" target={targets ? Math.round(targets.waterMl / 100) / 10 : undefined} /></div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center gap-2">
          <TrendingDown size={17} className="text-fire" />
          <p className="text-sm font-bold">Semana</p>
          <div className="ml-auto flex gap-1">
            <button onClick={() => setWeekOffset((o) => o - 1)} className="chip !p-1.5"><ChevronLeft size={15} /></button>
            <button onClick={() => setWeekOffset(0)} className={`chip !py-1.5 !text-xs ${weekOffset === 0 ? 'border-emerald/50 text-emerald' : 'text-muted'}`}>Hoy</button>
            <button onClick={() => setWeekOffset((o) => Math.min(0, o + 1))} disabled={weekOffset >= 0} className="chip !p-1.5 disabled:opacity-30"><ChevronRight size={15} /></button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((l, i) => {
            const d = weekDays[i];
            const active = d.kcal > 0 || d.waterMl > 0 || d.exercises > 0;
            return (
              <div key={l + i} className={`rounded-xl border p-2 text-center ${active ? 'border-emerald/40 bg-emerald/10' : 'border-white/5 bg-white/[0.02]'}`}>
                <p className="text-[10px] font-bold text-muted">{l} {d.date.slice(8)}</p>
                <p className="mt-1 text-xs font-extrabold">{active ? '●' : '·'}</p>
                <p className="text-[10px] text-muted">{d.kcal > 0 ? `${Math.round(d.kcal)}` : d.exercises > 0 ? `${d.exercises}ej` : '—'}</p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard glow>
        <div className="flex items-center gap-2">
          <Camera size={17} className="text-fire" />
          <p className="text-sm font-bold">Fotos de progreso</p>
          <label className="ml-auto chip !py-1.5 !text-xs cursor-pointer !border-emerald/40 text-emerald">
            + Añadir foto
            <input type="file" accept="image/*" className="hidden" disabled={photoBusy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f || !user) return;
                setPhotoBusy(true);
                try {
                  const w = [...history].reverse().find((d) => d.weight != null)?.weight ?? null;
                  await addPhoto(user.id, todayStr(), w, f);
                  setPhotos(listPhotos(user.id));
                  await unlockMedal('foto_1');
                } finally { setPhotoBusy(false); }
              }} />
          </label>
        </div>
        {photos.length === 0 ? (
          <p className="mt-3 text-xs text-muted text-center py-4">Sin fotos aún. Añade la primera para ver tu evolución visual.</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((p) => {
                const sel = compare.includes(p.id);
                return (
                  <div key={p.id} className={`relative overflow-hidden rounded-xl border ${sel ? 'border-fire/60' : 'border-white/10'}`}>
                    <img src={p.img} alt={p.date} className="h-28 w-full object-cover" loading="lazy" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-black/60 px-1.5 py-1 text-[10px]">
                      <span className="flex-1">{p.date.slice(5)}{p.weight != null ? ` · ${p.weight}kg` : ''}</span>
                      <button title="Comparar" onClick={() => setCompare((c) => c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c.slice(-1), p.id])}>
                        <Columns2 size={13} className={sel ? 'text-fire' : 'text-muted'} />
                      </button>
                      <button title="Borrar" onClick={() => { if (user && window.confirm('¿Borrar esta foto?')) { deletePhoto(p.id); setPhotos(listPhotos(user.id)); setCompare((c) => c.filter((x) => x !== p.id)); } }}>
                        <Trash2 size={13} className="text-muted hover:text-fire-hot" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {compare.length === 2 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {compare.map((id) => {
                  const p = photos.find((x) => x.id === id)!;
                  return (
                    <div key={id} className="overflow-hidden rounded-xl border border-fire/40">
                      <img src={p.img} alt={p.date} className="w-full object-cover" />
                      <p className="bg-black/60 px-2 py-1 text-center text-[11px] font-bold">{p.date}{p.weight != null ? ` · ${p.weight} kg` : ''}</p>
                    </div>
                  );
                })}
              </div>
            )}
            {photos.length >= 2 && compare.length < 2 && (
              <p className="mt-2 text-[11px] text-muted text-center">Marca ⧉ en dos fotos para compararlas lado a lado.</p>
            )}
          </>
        )}
      </GlassCard>
    </div>
  );
}
