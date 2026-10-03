import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Trash2, ScanBarcode, Loader2, History, Star, BookOpen, ShoppingCart, CalendarDays, Camera, X } from 'lucide-react';
import { GlassCard } from '../components/ui';
import { useStore } from '../lib/store';
import { getDb } from '../lib/db';
import { isNative } from '../lib/steps';
import { analyzeFood, downscale, pickPhoto, takePhoto, FOOD_ERRORS, type FoodEstimate } from '../lib/foodLens';
import { buildWeekMenu, shoppingList } from '../lib/recipes';

/** Escáner con la cámara (solo móvil): detecta el código en vivo. */
function BarcodeScanner({ onCode, onClose }: { onCode: (c: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let stopped = false;
    let resetFn: (() => void) | null = null;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader() as unknown as {
          reset?: () => void;
          decodeFromVideoDevice: (id: string, el: HTMLVideoElement, cb: (r: { getText: () => string } | undefined) => void) => Promise<void>;
        };
        resetFn = () => { try { reader.reset?.(); } catch { /* ignore */ } };
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const back = devices.find((d) => /back|rear|trasera|environment/i.test(d.label)) ?? devices[0];
        if (!back) { setError('Sin cámara disponible.'); return; }
        await reader.decodeFromVideoDevice(back.deviceId, videoRef.current!, (result) => {
          if (result && !stopped) {
            stopped = true;
            onCode(result.getText());
          }
        });
      } catch {
        if (!stopped) setError('No se pudo abrir la cámara. Revisa el permiso.');
      }
    })();
    return () => { stopped = true; try { resetFn?.(); } catch { /* ignore */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="relative mt-2 overflow-hidden rounded-xl border border-emerald/30 bg-black">
      <video ref={videoRef} className="h-52 w-full object-cover" playsInline muted />
      <div className="pointer-events-none absolute inset-x-8 top-1/2 h-20 -translate-y-1/2 rounded-lg border-2 border-fire" />
      <button onClick={onClose} className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white"><X size={16} /></button>
      {error ? <p className="absolute inset-x-0 bottom-2 text-center text-xs text-fire">{error}</p>
        : <p className="absolute inset-x-0 bottom-2 text-center text-[11px] text-white/80">Apunta al código de barras…</p>}
    </div>
  );
}

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

/** Lector de calorías (solo móvil nativo): foto del plato → análisis IA → registro. */
function FoodLens({ meal, onAdd }: { meal: string; onAdd: (f: { name: string; kcal: number; protein?: number; carbs?: number; fat?: number; meal?: string }) => Promise<void> }) {
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [food, setFood] = useState<FoodEstimate | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const fromDataUrl = async (dataUrl: string) => {
    setError('');
    setSaved('');
    setAnalysis('');
    setFood(null);
    setPhoto(dataUrl);
    setBusy(true);
    try {
      const { base64, mime } = await downscale(dataUrl);
      const r = await analyzeFood(base64, mime);
      setAnalysis(r.analysis);
      setFood(r.food);
    } catch (e) {
      const code = (e as { code?: string })?.code || (e as Error)?.message || 'server_error';
      setError(FOOD_ERRORS[code] ?? 'No se pudo analizar. Reintenta.');
    } finally {
      setBusy(false);
    }
  };

  const shoot = async () => {
    setError('');
    try {
      const d = await takePhoto();
      await fromDataUrl(d);
    } catch (e) {
      const code = (e as { code?: string })?.code || 'camera_error';
      setError(FOOD_ERRORS[code] ?? FOOD_ERRORS.camera_error);
    }
  };

  const gallery = async () => {
    setError('');
    try {
      const d = await pickPhoto();
      await fromDataUrl(d);
    } catch (e) {
      const code = (e as { code?: string })?.code || 'camera_error';
      setError(FOOD_ERRORS[code] ?? FOOD_ERRORS.camera_error);
    }
  };

  const save = async () => {
    if (!food) return;
    await onAdd({ name: `${food.name}`, kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat, meal });
    setSaved(`Registrado en ${meal}: ${food.name} · ${food.kcal} kcal.`);
  };

  return (
    <GlassCard glow>
      <div className="flex items-center gap-2"><Camera size={16} className="text-fire" /><p className="text-xs uppercase tracking-widest text-muted">Lector de calorías · {meal}</p></div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={shoot} disabled={busy} className="btn-fire !py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          <Camera size={15} /> {busy ? 'Analizando…' : 'Tomar foto'}
        </button>
        <button onClick={gallery} disabled={busy} className="chip !py-2.5 text-xs flex items-center justify-center gap-2 disabled:opacity-50">
          Galería
        </button>
      </div>
      {photo && <img src={photo} alt="Plato" className="mt-2 h-44 w-full rounded-xl border border-white/10 object-cover" />}
      {busy && <p className="mt-2 flex items-center gap-2 text-xs text-muted"><Loader2 size={14} className="animate-spin" /> Analizando tu plato…</p>}
      {error && <p className="mt-2 text-xs text-fire">{error}</p>}
      {analysis && (
        <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed">{analysis.replace(/<!--FOOD_JSON.*?-->/s, '').trim()}</pre>
      )}
      {food && (
        <div className="mt-2 rounded-xl border border-emerald/30 bg-emerald/10 p-3">
          <p className="text-xs font-bold">{food.name}</p>
          <p className="mt-1 text-[11px] text-muted">{food.kcal} kcal · P {food.protein}g · C {food.carbs}g · G {food.fat}g</p>
          <button onClick={save} className="btn-emerald mt-2 w-full !py-2 text-sm">Registrar en {meal}</button>
        </div>
      )}
      {saved && <p className="mt-2 text-xs text-emerald">{saved}</p>}
    </GlassCard>
  );
}

export default function Nutrition() {
  const { day, logFood, deleteFood, consumed, profile } = useStore();
  const [view, setView] = useState<'diario' | 'menu'>('diario');
  const [q, setQ] = useState('');
  const [meal, setMeal] = useState('Almuerzo');
  const [custom, setCustom] = useState({ name: '', kcal: '', p: '', c: '', f: '' });
  const [code, setCode] = useState('');
  const [grams, setGrams] = useState('100');
  const [looking, setLooking] = useState(false);
  const [found, setFound] = useState<null | { name: string; kcal100: number; p100: number; c100: number; f100: number }>(null);
  const [codeError, setCodeError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [favs, setFavs] = useState<{ name: string; kcal: number; protein: number; carbs: number; fat: number; n: number }[]>([]);
  const [repeatMsg, setRepeatMsg] = useState('');
  const [repeating, setRepeating] = useState(false);

  useEffect(() => {
    // Tus frecuentes: lo que más registraste (últimos datos disponibles)
    getDb().exportData().then((d) => {
      const foods = (d as { foods?: { name: string; kcal: number; protein: number; carbs: number; fat: number }[] }).foods ?? [];
      const map = new Map<string, { n: number; kcal: number; protein: number; carbs: number; fat: number }>();
      for (const f of foods) {
        const e = map.get(f.name) || { n: 0, kcal: 0, protein: 0, carbs: 0, fat: 0 };
        e.n++; e.kcal += f.kcal; e.protein += f.protein; e.carbs += f.carbs; e.fat += f.fat;
        map.set(f.name, e);
      }
      setFavs([...map.entries()]
        .sort((a, b) => b[1].n - a[1].n)
        .slice(0, 5)
        .map(([name, e]) => ({
          name, n: e.n,
          kcal: Math.round(e.kcal / e.n),
          protein: Math.round((e.protein / e.n) * 10) / 10,
          carbs: Math.round((e.carbs / e.n) * 10) / 10,
          fat: Math.round((e.fat / e.n) * 10) / 10,
        })));
    }).catch(() => undefined);
  }, []);

  /** Copia las comidas de ayer al día de hoy de un toque. */
  const repeatYesterday = async () => {
    if (repeating) return;
    setRepeating(true);
    try {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const key = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      const d = await getDb().getDay(key);
      if (d.foods.length === 0) {
        setRepeatMsg('Ayer no registraste comidas.');
        return;
      }
      for (const f of d.foods) {
        await logFood({ name: f.name, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, meal: f.meal });
      }
      setRepeatMsg(`Copiadas ${d.foods.length} comidas de ayer.`);
    } finally {
      setRepeating(false);
    }
  };

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
  const lookupCode = async (raw?: string) => {
    const c = (raw ?? code).trim();
    if (!c) return;
    setLooking(true);
    setFound(null);
    setCodeError('');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(c)}.json?fields=product_name,brands,nutriments`, { signal: ctrl.signal });
      if (!r.ok) {
        setCodeError('La base de productos no responde. Reintenta.');
        return;
      }
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
      clearTimeout(timer);
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

      <div className="flex gap-2">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
          <button onClick={() => setView('diario')} className={`rounded-lg px-4 py-2 text-xs font-bold ${view === 'diario' ? 'bg-emerald/20 text-white' : 'text-muted'}`}>Diario</button>
          <button onClick={() => setView('menu')} className={`rounded-lg px-4 py-2 text-xs font-bold ${view === 'menu' ? 'bg-fire/20 text-white' : 'text-muted'}`}>Menú semanal</button>
        </div>
      </div>

      {view === 'menu' ? (
        <MenuSemanal />
      ) : (
      <>
      <div className="flex gap-2 flex-wrap">
        {MEALS.map((m) => (
          <button key={m} onClick={() => setMeal(m)}
            className={`chip !text-xs ${meal === m ? 'border-emerald/60 bg-emerald/15 text-white' : 'text-muted'}`}>{m}</button>
        ))}
        <button onClick={repeatYesterday} disabled={repeating} className="chip !text-xs !border-fire/40 text-fire flex items-center justify-center gap-1.5 disabled:opacity-50">
          <History size={13} /> {repeating ? 'Copiando…' : 'Repetir ayer'}
        </button>
      </div>
      {repeatMsg && <p className="text-xs text-emerald">{repeatMsg}</p>}

      {isNative() && <FoodLens meal={meal} onAdd={logFood} />}

      {favs.length > 0 && (
        <GlassCard className="!p-4">
          <div className="flex items-center gap-2">
            <Star size={15} className="text-fire" />
            <p className="text-xs uppercase tracking-widest text-muted">Tus frecuentes · un toque y listo</p>
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {favs.map((f) => (
              <button key={f.name} onClick={() => logFood({ name: f.name, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, meal })}
                className="chip !text-xs whitespace-nowrap hover:border-emerald/50 shrink-0">
                + {f.name.length > 26 ? f.name.slice(0, 26) + '…' : f.name} <span className="text-muted">· {f.kcal}</span>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

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
          {isNative() && (
            scanning ? (
              <BarcodeScanner onCode={(c) => { setCode(c); setScanning(false); lookupCode(c); }} onClose={() => setScanning(false)} />
            ) : (
              <button onClick={() => setScanning(true)} className="chip mt-2 !text-xs w-full flex items-center justify-center gap-2 !border-emerald/40 text-emerald">
                <Camera size={14} /> Escanear con la cámara
              </button>
            )
          )}
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={code} onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') lookupCode(); }}
                inputMode="numeric" placeholder="Ej. 8410076470903" className="input-kalory !pl-9 text-sm" />
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => lookupCode()} disabled={looking} className="btn-emerald !px-4 !py-2 text-sm disabled:opacity-50">
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
      </>
      )}
    </div>
  );
}

function MenuSemanal() {
  const { profile, targets, logFood } = useStore();
  const [dayIdx, setDayIdx] = useState(0);
  const [added, setAdded] = useState('');
  const menu = useMemo(
    () => buildWeekMenu(profile?.diet ?? 'omnivoro', profile?.mealsPerDay ?? 4),
    [profile?.diet, profile?.mealsPerDay],
  );
  const list = useMemo(() => shoppingList(menu), [menu]);
  const d = menu[dayIdx];

  const addDay = async () => {
    for (const it of d.items) {
      await logFood({
        name: it.recipe.name, kcal: it.recipe.kcal,
        protein: it.recipe.p, carbs: it.recipe.c, fat: it.recipe.f,
        meal: it.meal === 'Extra' ? 'Extra' : it.meal,
      });
    }
    setAdded(`Añadido el ${d.day} al diario de hoy.`);
    setTimeout(() => setAdded(''), 3000);
  };

  return (
    <div className="flex flex-col gap-4">
      <GlassCard glow>
        <div className="flex items-center gap-2">
          <BookOpen size={17} className="text-fire" />
          <p className="text-sm font-bold">Menú según tu dieta ({profile?.diet}) y {profile?.mealsPerDay} comidas/día</p>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {menu.map((m, i) => (
            <button key={m.day} onClick={() => setDayIdx(i)}
              className={`chip !text-xs whitespace-nowrap shrink-0 ${i === dayIdx ? 'border-fire/60 bg-fire/15 text-white' : 'text-muted'}`}>
              {m.day.slice(0, 3)} · {m.kcal}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          {d.items.map((it, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
              <div className="flex justify-between text-xs">
                <b>{it.recipe.name}</b>
                <b className="tabular-nums ml-2">{it.recipe.kcal} kcal</b>
              </div>
              <p className="mt-0.5 text-[11px] text-muted">{it.meal} · P {it.recipe.p}g · C {it.recipe.c}g · G {it.recipe.f}g</p>
              <p className="text-[11px] text-muted/70 truncate">{it.recipe.ingredients.join(' · ')}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <motion.button whileTap={{ scale: 0.97 }} onClick={addDay} className="btn-emerald !py-2.5 text-sm flex-1">
            Añadir {d.day} al diario de hoy ({d.kcal} kcal)
          </motion.button>
        </div>
        {added && <p className="mt-2 text-xs text-emerald">{added}</p>}
        {targets && <p className="mt-2 text-[11px] text-muted">Tu meta: {targets.calories} kcal · P {targets.protein}g · C {targets.carbs}g · G {targets.fat}g</p>}
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-2">
          <ShoppingCart size={17} className="text-emerald" />
          <p className="text-sm font-bold">Lista de compras semanal</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {list.slice(0, 30).map((l) => (
            <span key={l.item} className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-[11px]">
              {l.item} {l.n > 1 && <b className="text-emerald">×{l.n}</b>}
            </span>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-2">
          <CalendarDays size={17} className="text-muted" />
          <p className="text-xs uppercase tracking-widest text-muted">Toda la semana</p>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1 text-center max-sm:grid-cols-4">
          {menu.map((m) => (
            <div key={m.day} className="rounded-lg bg-white/[0.03] border border-white/5 p-1.5">
              <p className="text-[10px] font-bold">{m.day.slice(0, 3)}</p>
              <p className="text-[11px] font-extrabold tabular-nums">{m.kcal}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
