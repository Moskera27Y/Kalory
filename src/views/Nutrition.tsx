import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Trash2, ScanBarcode, Loader2 } from 'lucide-react';
import { GlassCard } from '../components/ui';
import { useStore } from '../lib/store';

const CATALOG = [
  { name: 'Pechuga de pollo 150g', kcal: 248, p: 46, c: 0, f: 5 },
  { name: 'Arroz integral 1 taza', kcal: 216, p: 5, c: 45, f: 1.8 },
  { name: 'Aguacate ½ unidad', kcal: 160, p: 2, c: 9, f: 15 },
  { name: 'Avena 60g + plátano', kcal: 320, p: 9, c: 62, f: 5 },
  { name: 'Salmón 150g', kcal: 310, p: 34, c: 0, f: 18 },
  { name: 'Yogur griego 200g + miel', kcal: 220, p: 20, c: 22, f: 5 },
  { name: 'Huevo cocido 2 uds', kcal: 155, p: 13, c: 1, f: 11 },
  { name: 'Ensalada verde grande', kcal: 120, p: 4, c: 12, f: 7 },
];

const MEALS = ['Desayuno', 'Almuerzo', 'Cena', 'Snack', 'Extra'];

export default function Nutrition() {
  const { day, logFood, deleteFood, consumed } = useStore();
  const [q, setQ] = useState('');
  const [meal, setMeal] = useState('Almuerzo');
  const [custom, setCustom] = useState({ name: '', kcal: '', p: '', c: '', f: '' });
  const [code, setCode] = useState('');
  const [grams, setGrams] = useState('100');
  const [looking, setLooking] = useState(false);
  const [found, setFound] = useState<null | { name: string; kcal100: number; p100: number; c100: number; f100: number }>(null);
  const [codeError, setCodeError] = useState('');

  const results = CATALOG.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));

  const addCustom = async () => {
    const kcal = Number(custom.kcal);
    if (!custom.name.trim() || !Number.isFinite(kcal) || kcal <= 0) return;
    await logFood({
      name: custom.name.trim(), kcal: Math.round(kcal),
      protein: Number(custom.p) || 0, carbs: Number(custom.c) || 0, fat: Number(custom.f) || 0,
      meal,
    });
    setCustom({ name: '', kcal: '', p: '', c: '', f: '' });
  };

  const grouped = MEALS.map((m) => ({ meal: m, items: day.foods.filter((f) => f.meal === m) })).filter((g) => g.items.length > 0);

  /** Busca el código de barras en Open Food Facts (datos reales del producto). */
  const lookupCode = async () => {
    const c = code.trim();
    if (!c) return;
    setLooking(true);
    setFound(null);
    setCodeError('');
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(c)}.json?fields=product_name,brands,nutriments`);
      const d = await r.json();
      if (d.status !== 1 || !d.product?.nutriments) {
        setCodeError('Producto no encontrado. Revisa el código.');
        return;
      }
      const n = d.product.nutriments;
      const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
      setFound({
        name: [d.product.product_name, d.product.brands].filter(Boolean).join(' · ') || `Producto ${c}`,
        kcal100: num(n['energy-kcal_100g'] ?? n.energy_100g / 4.184),
        p100: num(n.proteins_100g),
        c100: num(n.carbohydrates_100g),
        f100: num(n.fat_100g),
      });
    } catch {
      setCodeError('Sin conexión a la base de productos.');
    } finally {
      setLooking(false);
    }
  };

  const addFound = async () => {
    if (!found) return;
    const g = Math.max(1, Number(grams) || 100);
    const k = g / 100;
    await logFood({
      name: `${found.name} (${g}g)`,
      kcal: Math.round(found.kcal100 * k),
      protein: Math.round(found.p100 * k * 10) / 10,
      carbs: Math.round(found.c100 * k * 10) / 10,
      fat: Math.round(found.f100 * k * 10) / 10,
      meal,
    });
    setFound(null);
    setCode('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Diario de <span className="text-gradient-emerald">nutrición</span></h1>
        <p className="text-sm text-muted">Hoy llevas <b className="text-white">{Math.round(consumed).toLocaleString('es')} kcal</b> en {day.foods.length} registros</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {MEALS.map((m) => (
          <button key={m} onClick={() => setMeal(m)}
            className={`chip !text-xs ${meal === m ? 'border-emerald/60 bg-emerald/15 text-white' : 'text-muted'}`}>{m}</button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard glow>
          <p className="text-xs uppercase tracking-widest text-muted">Añadir comida personalizada · {meal}</p>
          <div className="mt-3 grid gap-2">
            <input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} className="input-kalory text-sm" placeholder="Nombre del plato o alimento" />
            <div className="grid grid-cols-4 gap-2">
              <input value={custom.kcal} onChange={(e) => setCustom({ ...custom, kcal: e.target.value })} type="number" min={1} className="input-kalory text-sm" placeholder="kcal *" />
              <input value={custom.p} onChange={(e) => setCustom({ ...custom, p: e.target.value })} type="number" min={0} className="input-kalory text-sm" placeholder="Prot g" />
              <input value={custom.c} onChange={(e) => setCustom({ ...custom, c: e.target.value })} type="number" min={0} className="input-kalory text-sm" placeholder="Carb g" />
              <input value={custom.f} onChange={(e) => setCustom({ ...custom, f: e.target.value })} type="number" min={0} className="input-kalory text-sm" placeholder="Grasa g" />
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={addCustom} className="btn-emerald text-sm">Registrar en {meal}</motion.button>
          </div>

          <p className="mt-5 text-xs uppercase tracking-widest text-muted">Código de barras · {meal}</p>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={code} onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') lookupCode(); }}
                inputMode="numeric" placeholder="Ej. 8410076470903" className="input-kalory !pl-9 text-sm" />
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={lookupCode} disabled={looking} className="btn-emerald !px-4 !py-2 text-sm disabled:opacity-50">
              {looking ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
            </motion.button>
          </div>
          {codeError && <p className="mt-2 text-xs text-fire">{codeError}</p>}
          {found && (
            <div className="mt-2 rounded-xl border border-emerald/30 bg-emerald/10 p-3">
              <p className="text-xs font-bold">{found.name}</p>
              <p className="mt-1 text-[11px] text-muted">Por 100g: {Math.round(found.kcal100)} kcal · P {found.p100}g · C {found.c100}g · G {found.f100}g</p>
              <div className="mt-2 flex gap-2">
                <input value={grams} onChange={(e) => setGrams(e.target.value)} type="number" min={1} className="input-kalory !py-2 text-sm" placeholder="Gramos" />
                <motion.button whileTap={{ scale: 0.97 }} onClick={addFound} className="btn-emerald !py-2 text-sm whitespace-nowrap">Añadir a {meal}</motion.button>
              </div>
            </div>
          )}

          <p className="mt-5 text-xs uppercase tracking-widest text-muted">Catálogo de alimentos</p>
          <div className="relative mt-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alimento…" className="input-kalory !pl-9 text-sm" />
          </div>
          <div className="mt-3 flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1">
            {results.map((f) => (
              <div key={f.name} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold flex-1">{f.name}</p>
                  <button onClick={() => logFood({ name: f.name, kcal: f.kcal, protein: f.p, carbs: f.c, fat: f.f, meal })} className="rounded-lg bg-emerald/15 p-1.5 text-emerald hover:bg-emerald/25 transition-all"><Plus size={15} /></button>
                </div>
                <p className="mt-1 text-[11px] text-muted">{f.kcal} kcal · P {f.p}g · C {f.c}g · G {f.f}g</p>
              </div>
            ))}
            {results.length === 0 && <p className="text-xs text-muted text-center py-6">Sin resultados para “{q}”</p>}
          </div>
        </GlassCard>

        <div className="flex flex-col gap-3">
          {grouped.length === 0 && (
            <GlassCard className="text-center py-10">
              <p className="font-bold">Aún no registraste comidas hoy</p>
              <p className="mt-1 text-xs text-muted">Todo parte de cero: añade tu primera comida con el formulario.</p>
            </GlassCard>
          )}
          {grouped.map((g) => (
            <GlassCard key={g.meal}>
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm">{g.meal}</p>
                <span className="ml-auto text-xs font-bold text-fire">{Math.round(g.items.reduce((a, x) => a + x.kcal, 0))} kcal</span>
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                {g.items.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 px-3 py-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{f.name}</p>
                      <p className="text-muted">{Math.round(f.kcal)} kcal · P {Math.round(f.protein)}g · C {Math.round(f.carbs)}g · G {Math.round(f.fat)}g</p>
                    </div>
                    <button onClick={() => deleteFood(f.id)} className="text-muted hover:text-fire-hot transition-all"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
