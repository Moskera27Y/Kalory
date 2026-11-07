import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Trash2, ScanBarcode, Loader2, History, Star, BookOpen, ShoppingCart, CalendarDays, Camera, X, Sparkles } from 'lucide-react';
import { GlassCard } from '../components/ui';
import { useStore } from '../lib/store';
import { getDb } from '../lib/db';
import { isNative } from '../lib/steps';
import { analyzeFood, downscale, pickPhoto, takePhoto, FOOD_ERRORS, type FoodEstimate } from '../lib/foodLens';
import { buildWeekMenu, shoppingList, RECIPES } from '../lib/recipes';
import { MEALS } from '../lib/meals';

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
  { name: 'Pechuga de pollo 150g', kcal: 248, p: 46, c: 0, f: 5, meal: 'Almuerzo' },
  { name: 'Arroz integral 1 taza', kcal: 216, p: 5, c: 45, f: 1.8, meal: 'Almuerzo' },
  { name: 'Aguacate ½ unidad', kcal: 160, p: 2, c: 9, f: 15, meal: 'Snack' },
  { name: 'Avena 60g + plátano', kcal: 320, p: 9, c: 62, f: 5, meal: 'Desayuno' },
  { name: 'Salmón 150g', kcal: 310, p: 34, c: 0, f: 18, meal: 'Almuerzo' },
  { name: 'Yogur griego 200g + miel', kcal: 220, p: 20, c: 22, f: 5, meal: 'Snack' },
  { name: 'Huevo cocido 2 uds', kcal: 155, p: 13, c: 1, f: 11, meal: 'Desayuno' },
  { name: 'Ensalada verde grande', kcal: 120, p: 4, c: 12, f: 7, meal: 'Almuerzo' },
];



/** Lector de calorías (solo móvil nativo): foto del plato → análisis IA → registro. */
function FoodLens({ meal, onAdd }: { meal: string; onAdd: (f: { name: string; kcal: number; protein?: number; carbs?: number; fat?: number; meal?: string }) => Promise<void> }) {
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [food, setFood] = useState<FoodEstimate | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);

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
    if (!food || saving) return;
    setSaving(true);
    try {
      await onAdd({ name: `${food.name}`, kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat, meal });
      setSaved(`Registrado en ${meal}: ${food.name} · ${food.kcal} kcal.`);
    } catch {
      setError('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
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
          <button onClick={save} disabled={saving} className="btn-emerald mt-2 w-full !py-2 text-sm disabled:opacity-50">{saving ? 'Guardando…' : `Registrar en ${meal}`}</button>
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
  const [custom, setCustom] = useState({ name: '' });
  const [qty, setQty] = useState('100');
  const [qtyUnit, setQtyUnit] = useState<'g' | 'porcion'>('g');
  const [qtyGrams, setQtyGrams] = useState('100');
  const [code, setCode] = useState('');
  const [grams, setGrams] = useState('100');
  const [unit, setUnit] = useState<'g' | 'ml' | 'ud'>('g');
  const [unitWeight, setUnitWeight] = useState('');
  const [looking, setLooking] = useState(false);
  const [found, setFound] = useState<null | { name: string; kcal100: number; p100: number; c100: number; f100: number }>(null);
  const [manualName, setManualName] = useState('');
  const [codeError, setCodeError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [favs, setFavs] = useState<{ name: string; kcal: number; protein: number; carbs: number; fat: number; n: number }[]>([]);
  const [repeatMsg, setRepeatMsg] = useState('');
  const [repeating, setRepeating] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [confirmData, setConfirmData] = useState<{ name: string; kcal: number; p: number; c: number; f: number } | null>(null);
  const [addingCustom, setAddingCustom] = useState(false);
  const estimateAI = async () => {
    if (!custom.name.trim() || estimating) return;
    setEstimating(true);
    try {
      const food = await getDb().estimateFood?.(custom.name.trim());
      if (food) setCustom((c) => ({ ...c, kcal: String(food.kcal), p: String(food.protein), c: String(food.carbs), f: String(food.fat) }));
    } finally { setEstimating(false); }
  };
  const [catMsg, setCatMsg] = useState('');
  const [diaryMsg, setDiaryMsg] = useState('');
  const [addingFound, setAddingFound] = useState(false);
  const catalogBusyRef = useRef(false);

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
      let copied = 0;
      try {
        for (const f of d.foods) {
          await logFood({ name: f.name, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, meal: f.meal });
          copied++;
        }
        setRepeatMsg(`Copiadas ${copied} comidas de ayer.`);
      } catch {
        setRepeatMsg(copied > 0
          ? `Se copiaron ${copied} de ${d.foods.length} comidas. Revisa tu conexión e inténtalo de nuevo.`
          : 'No se pudo copiar. Revisa tu conexión e inténtalo de nuevo.');
      }
    } finally {
      setRepeating(false);
    }
  };

  const results = CATALOG.filter((f) => (f as { meal?: string }).meal === 'Snack' && f.name.toLowerCase().includes(q.toLowerCase()));

  const addCustom = async () => {
    if (addingCustom) return;
    if (!custom.name.trim()) return;
    setEstimating(true);
    try {
      const food = await getDb().estimateFood?.(custom.name.trim());
      if (!food) { setCatMsg('No se pudo estimar. Intenta de nuevo.'); return; }
      const q = Math.max(1, Number(qty) || 100);
      const gPerUnit = qtyUnit === 'porcion' ? Math.max(1, Number(qtyGrams) || 100) : 1;
      const g = qtyUnit === 'porcion' ? q * gPerUnit : q;
      const k = g / 100;
      setConfirmData({
        name: `${custom.name.trim()} (${qtyUnit === 'porcion' ? `${q} porciones` : `${g}g`})`,
        kcal: Math.round(food.kcal * k),
        p: Math.round(food.protein * k * 10) / 10,
        c: Math.round(food.carbs * k * 10) / 10,
        f: Math.round(food.fat * k * 10) / 10,
      });
    } finally { setEstimating(false); }
  };

  const confirmAdd = async () => {
    if (!confirmData || addingCustom) return;
    setAddingCustom(true);
    try {
      await logFood({ name: confirmData.name, kcal: confirmData.kcal, protein: confirmData.p, carbs: confirmData.c, fat: confirmData.f, meal });
      setCustom({ name: '' });
      setConfirmData(null);
    } catch { setCatMsg('No se pudo guardar. Revisa tu conexión.'); }
    finally { setAddingCustom(false); }
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
    if (!found || addingFound) return;
    setAddingFound(true);
    const qty = Math.max(1, Number(grams) || 100);
    const gramsPerUnit = unit === 'ud' ? Math.max(1, Number(unitWeight) || 100) : 1;
    const g = unit === 'ud' ? qty * gramsPerUnit : qty;
    const k = g / 100;
    const label = unit === 'g' ? `${g}g` : unit === 'ml' ? `${qty}ml` : `${qty} ud (${gramsPerUnit}g c/u)`;
    try {
      await logFood({
        name: `${found.name} (${label})`,
        kcal: Math.round(found.kcal100 * k),
        protein: Math.round(found.p100 * k * 10) / 10,
        carbs: Math.round(found.c100 * k * 10) / 10,
        fat: Math.round(found.f100 * k * 10) / 10,
        meal,
      });
      setFound(null);
      setCode('');
    } catch {
      setCodeError('No se pudo añadir. Revisa tu conexión.');
    } finally {
      setAddingFound(false);
    }
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

      {confirmData && (
        <GlassCard glow>
          <p className="text-sm font-bold">Confirmar registro</p>
          <p className="mt-1 text-xs text-muted">{confirmData.name}</p>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            <div className="rounded-lg bg-white/5 p-2"><p className="text-[10px] text-muted">Kcal</p><p className="font-bold">{confirmData.kcal}</p></div>
            <div className="rounded-lg bg-white/5 p-2"><p className="text-[10px] text-muted">Prot</p><p className="font-bold">{confirmData.p}g</p></div>
            <div className="rounded-lg bg-white/5 p-2"><p className="text-[10px] text-muted">Carb</p><p className="font-bold">{confirmData.c}g</p></div>
            <div className="rounded-lg bg-white/5 p-2"><p className="text-[10px] text-muted">Grasa</p><p className="font-bold">{confirmData.f}g</p></div>
          </div>
          <div className="mt-3 flex gap-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setConfirmData(null)} className="btn-ghost text-sm flex-1">Cancelar</motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={confirmAdd} disabled={addingCustom} className="btn-emerald text-sm flex-1 disabled:opacity-50">{addingCustom ? 'Guardando…' : 'Confirmar y añadir'}</motion.button>
          </div>
        </GlassCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard glow>
          <p className="text-xs uppercase tracking-widest text-muted">Añadir comida personalizada · {meal}</p>
          <div className="mt-3 grid gap-2">
            <input value={custom.name} onChange={(e) => setCustom({ name: e.target.value })} className="input-kalory text-sm" placeholder="Nombre del plato o alimento" />
            <div className="flex gap-2">
              <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min={1} className="input-kalory !py-2 text-sm flex-1" placeholder="Cantidad" />
              <select value={qtyUnit} onChange={(e) => setQtyUnit(e.target.value as 'g' | 'porcion')} className="input-kalory !py-2 text-sm w-28">
                <option value="g">Gramos</option>
                <option value="porcion">Porciones</option>
              </select>
              {qtyUnit === 'porcion' && (
                <input value={qtyGrams} onChange={(e) => setQtyGrams(e.target.value)} type="number" min={1} className="input-kalory !py-2 text-sm w-24" placeholder="g/porción" />
              )}
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.97 }} onClick={estimateAI} disabled={estimating || !custom.name.trim()} className="btn-ghost text-sm disabled:opacity-50">
                {estimating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={addCustom} disabled={addingCustom || estimating} className="btn-emerald text-sm disabled:opacity-50 flex-1">{addingCustom || estimating ? 'Calculando…' : `Registrar en ${meal}`}</motion.button>
            </div>
            <p className="mt-2 text-[11px] text-muted">Solo nombre y cantidad. La app calcula los macros con IA.</p>
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
          {codeError && (
            <div className="mt-2 flex gap-2">
              <input value={manualName} onChange={(e) => setManualName(e.target.value)} className="input-kalory !py-2 text-sm flex-1" placeholder="Nombre del producto (manual)" />
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
                if (!manualName.trim()) return;
                setCustom({ name: manualName.trim() });
                setView('diario');
              }} className="btn-emerald !py-2 text-sm whitespace-nowrap">Usar</motion.button>
            </div>
          )}
          {found && (
            <div className="mt-2 rounded-xl border border-emerald/30 bg-emerald/10 p-3">
              <p className="text-xs font-bold">{found.name}</p>
              <p className="mt-1 text-[11px] text-muted">Por 100g: {Math.round(found.kcal100)} kcal · P {found.p100}g · C {found.c100}g · G {found.f100}g</p>
              <div className="mt-2 flex gap-2">
                <select value={unit} onChange={(e) => setUnit(e.target.value as 'g' | 'ml' | 'ud')} className="input-kalory !py-2 text-sm w-20">
                  <option value="g">Gramos</option>
                  <option value="ml">Ml</option>
                  <option value="ud">Unidades</option>
                </select>
                <input value={grams} onChange={(e) => setGrams(e.target.value)} type="number" min={1} className="input-kalory !py-2 text-sm" placeholder={unit === 'ud' ? 'Cantidad' : unit === 'ml' ? 'Ml' : 'Gramos'} />
                {unit === 'ud' && (
                  <input value={unitWeight} onChange={(e) => setUnitWeight(e.target.value)} type="number" min={1} className="input-kalory !py-2 text-sm" placeholder="g por unidad" />
                )}
                <motion.button whileTap={{ scale: 0.97 }} onClick={addFound} disabled={addingFound} className="btn-emerald !py-2 text-sm whitespace-nowrap disabled:opacity-50">{addingFound ? 'Añadiendo…' : `Añadir a ${meal}`}</motion.button>
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
                  <button onClick={() => {
                      if (catalogBusyRef.current) return;
                      catalogBusyRef.current = true;
                      setCatMsg('');
                      logFood({ name: f.name, kcal: f.kcal, protein: f.p, carbs: f.c, fat: f.f, meal })
                        .catch(() => setCatMsg('No se pudo añadir. Revisa tu conexión.'))
                        .finally(() => { catalogBusyRef.current = false; });
                    }} className="rounded-lg bg-emerald/15 p-1.5 text-emerald hover:bg-emerald/25 transition-all" aria-label={`Añadir ${f.name}`}><Plus size={15} /></button>
                </div>
                <p className="mt-1 text-[11px] text-muted">{f.kcal} kcal · P {f.p}g · C {f.c}g · G {f.f}g</p>
              </div>
            ))}
            {results.length === 0 && <p className="text-xs text-muted text-center py-6">Sin resultados para “{q}”</p>}
            {catMsg && <p role="alert" className="text-xs text-fire">{catMsg}</p>}
          </div>
        </GlassCard>

        <div className="flex flex-col gap-3">
          {grouped.length === 0 && (
            <GlassCard className="text-center py-10">
              <p className="font-bold">Aún no registraste comidas hoy</p>
              <p className="mt-1 text-xs text-muted">Todo parte de cero: añade tu primera comida con el formulario.</p>
            </GlassCard>
          )}
          {diaryMsg && <p role="alert" className="px-1 text-xs text-fire">{diaryMsg}</p>}
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
                    <button onClick={() => deleteFood(f.id).catch(() => setDiaryMsg('No se pudo borrar. Revisa tu conexión.'))} aria-label={`Borrar ${f.name}`} className="text-muted hover:text-fire-hot transition-all"><Trash2 size={15} /></button>
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
  const [adding, setAdding] = useState<string | null>(null);
  const [addingWeek, setAddingWeek] = useState(false);
  const [excluded, setExcluded] = useState('');
  const [detail, setDetail] = useState<{ meal: string; recipe: (typeof RECIPES)[number] } | null>(null);
  const excludedList = useMemo(() => excluded.split(',').map((s) => s.trim()).filter(Boolean), [excluded]);
  const menu = useMemo(
    () => buildWeekMenu(profile?.diet ?? 'omnivoro', profile?.mealsPerDay ?? 4, 0, excludedList),
    [profile?.diet, profile?.mealsPerDay, excludedList],
  );
  const list = useMemo(() => shoppingList(menu), [menu]);
  const d = menu[dayIdx];

  const addOne = async (meal: string, r: (typeof RECIPES)[number]) => {
    if (adding) return;
    setAdding(meal);
    try {
      await logFood({ name: r.name, kcal: r.kcal, protein: r.p, carbs: r.c, fat: r.f, meal });
      setAdded(`Añadido ${r.name} (${meal}) al diario de hoy.`);
    } catch {
      setAdded('No se pudo añadir. Revisa tu conexión.');
    } finally {
      setAdding(null);
      window.setTimeout(() => setAdded(''), 4000);
    }
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
            <button key={i} onClick={() => setDetail(it)}
              className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-left hover:border-emerald/40">
              <div className="flex justify-between text-xs">
                <b>{it.recipe.name}</b>
                <b className="tabular-nums ml-2">{it.recipe.kcal} kcal</b>
              </div>
              <p className="mt-0.5 text-[11px] text-muted">{it.meal} · P {it.recipe.p}g · C {it.recipe.c}g · G {it.recipe.f}g</p>
              <p className="text-[11px] text-muted/70 truncate">{it.recipe.ingredients.join(' · ')}</p>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setAddingWeek(true); (async () => {
            let copied = 0;
            try {
              for (const it of d.items) { await logFood({ name: it.recipe.name, kcal: it.recipe.kcal, protein: it.recipe.p, carbs: it.recipe.c, fat: it.recipe.f, meal: it.meal }); copied++; }
              setAdded(`Añadido el ${d.day} al diario de hoy.`);
            } catch { setAdded(copied > 0 ? `Se añadieron ${copied} de ${d.items.length} platos.` : 'No se pudo añadir.'); }
            finally { setAddingWeek(false); window.setTimeout(() => setAdded(''), 4000); }
          })(); }} disabled={addingWeek} className="btn-emerald !py-2.5 text-sm w-full disabled:opacity-50">
            {addingWeek ? 'Añadiendo…' : `Añadir ${d.day} completo al diario (${d.kcal} kcal)`}
          </motion.button>
        </div>
        {added && <p className="mt-2 text-xs text-emerald">{added}</p>}
        {targets && <p className="mt-2 text-[11px] text-muted">Tu meta: {targets.calories} kcal · P {targets.protein}g · C {targets.carbs}g · G {targets.fat}g</p>}
      </GlassCard>

      {detail && (
        <GlassCard glow>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{detail.recipe.name}</p>
            <button onClick={() => setDetail(null)} className="text-muted hover:text-white"><X size={16} /></button>
          </div>
          <p className="mt-1 text-[11px] text-muted">{detail.meal} · {detail.recipe.kcal} kcal · P {detail.recipe.p}g · C {detail.recipe.c}g · G {detail.recipe.f}g</p>
          <p className="mt-2 text-xs font-semibold text-muted">Ingredientes:</p>
          <p className="text-[11px] text-muted/80">{detail.recipe.ingredients.join(' · ')}</p>
          <p className="mt-2 text-xs font-semibold text-muted">Preparación:</p>
          <p className="text-[11px] text-muted/80">{detail.recipe.prep || 'Preparar y servir.'}</p>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => addOne(detail.meal, detail.recipe)} disabled={!!adding}
            className="btn-emerald !py-2.5 text-sm w-full mt-3 disabled:opacity-50">
            {adding === detail.meal ? 'Añadiendo…' : `Añadir ${detail.meal} del día`}
          </motion.button>
        </GlassCard>
      )}

      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={17} className="text-emerald" />
            <p className="text-sm font-bold">Lista de compras semanal</p>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
            const text = list.map((l) => `[ ] ${l.item}${l.n > 1 ? ` (x${l.n})` : ''}`).join('\\n');
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'lista-compras-kalory.txt'; a.click();
            URL.revokeObjectURL(url);
          }} className="btn-ghost !py-1.5 text-xs">Exportar</motion.button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {list.slice(0, 40).map((l) => (
            <span key={l.item} className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-[11px]">
              {l.item} {l.n > 1 && <b className="text-emerald">×{l.n}</b>}
            </span>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <p className="text-xs uppercase tracking-widest text-muted mb-2">Excluir alimentos (separados por coma)</p>
        <input value={excluded} onChange={(e) => setExcluded(e.target.value)} className="input-kalory text-sm" placeholder="Ej: atún, queso, lentejas" />
        <p className="mt-1 text-[11px] text-muted">El menú se regenera automáticamente excluyendo esos alimentos.</p>
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
