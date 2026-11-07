import type { Diet } from '../types';

/** Recetas con macros + menú semanal automático + lista de compras. */

export type MealKind = 'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack';

export interface Recipe {
  name: string;
  diets: Diet[]; // dietas compatibles
  meal: MealKind;
  kcal: number;
  p: number;
  c: number;
  f: number;
  ingredients: string[];
  prep?: string;
}

const ALL: Diet[] = ['omnivoro', 'vegetariano', 'vegano', 'sin_gluten', 'keto'];
const VEG = (d: Diet[]) => d as Diet[];

export const RECIPES: Recipe[] = [
  { name: 'Avena con plátano y miel', diets: VEG(['omnivoro', 'vegetariano', 'sin_gluten']), meal: 'Desayuno', kcal: 380, p: 11, c: 72, f: 7, prep: 'Cocina la avena con la leche a fuego medio 3 min. Agrega el plátano en rodajas y la miel. Sirve caliente.', ingredients: ['avena 70g', 'plátano 1', 'miel 1 cda', 'leche 200ml'] },
  { name: 'Tostadas integrales con huevo', diets: VEG(['omnivoro']), meal: 'Desayuno', kcal: 340, p: 22, c: 30, f: 14, prep: 'Tuesta el pan. Cocina los huevos a la plancha. Unta aguacate y monta el huevo encima.', ingredients: ['pan integral 2 reb', 'huevo 2', 'aguacate 40g'] },
  { name: 'Smoothie verde proteico', diets: VEG(['vegano', 'vegetariano', 'sin_gluten']), meal: 'Desayuno', kcal: 290, p: 18, c: 40, f: 6, prep: 'Licúa espinaca, plátano, proteína y agua hasta obtener mezcla homogénea. Sirve frío.', ingredients: ['espinaca 50g', 'plátano 1', 'proteína vegetal 1 scoop', 'agua 300ml'] },
  { name: 'Huevos revueltos con queso', diets: VEG(['keto', 'omnivoro', 'sin_gluten', 'vegetariano']), meal: 'Desayuno', kcal: 420, p: 28, c: 4, f: 32, prep: 'Bate los huevos, cuaja en mantequilla a fuego bajo, agrega queso al final. Sirve.', ingredients: ['huevo 3', 'queso 40g', 'mantequilla 10g'] },
  { name: 'Yogur griego con granola', diets: VEG(['omnivoro', 'vegetariano']), meal: 'Desayuno', kcal: 350, p: 24, c: 42, f: 8, prep: 'Mezcla yogur con miel, cubre con granola. Sirve frío.', ingredients: ['yogur griego 200g', 'granola 40g', 'miel 1 cda'] },
  { name: 'Pollo con arroz y verduras', diets: VEG(['omnivoro', 'sin_gluten']), meal: 'Almuerzo', kcal: 560, p: 45, c: 55, f: 14, prep: 'Cocina el arroz. Saltea el pollo en aceite hasta dorar. Añade verduras y cocina 5 min. Sirve con arroz.', ingredients: ['pechuga 150g', 'arroz 80g crudo', 'verduras 200g', 'aceite 1 cda'] },
  { name: 'Lentejas con arroz', diets: VEG(['vegano', 'vegetariano', 'sin_gluten']), meal: 'Almuerzo', kcal: 520, p: 24, c: 82, f: 8, prep: 'Cocina lentejas con cebolla y zanahoria. Sirve con arroz blanco.', ingredients: ['lentejas 90g', 'arroz 60g', 'cebolla', 'zanahoria'] },
  { name: 'Salmón con quinoa', diets: VEG(['omnivoro', 'sin_gluten', 'keto']), meal: 'Almuerzo', kcal: 540, p: 40, c: 32, f: 26, prep: 'Cocina la quinoa. Hornea el salmón 12 min a 180°C. Saltea brócoli. Sirve junto.', ingredients: ['salmón 150g', 'quinoa 70g', 'brócoli 150g'] },
  { name: 'Bowl de atún y garbanzos', diets: VEG(['omnivoro']), meal: 'Almuerzo', kcal: 480, p: 38, c: 48, f: 12, prep: 'Mezcla atún, garbanzos, maíz y lechuga. Adereza al gusto.', ingredients: ['atún 1 lata', 'garbanzos 100g', 'maíz 50g', 'lechuga'] },
  { name: 'Ensalada César con pollo', diets: VEG(['keto', 'omnivoro']), meal: 'Cena', kcal: 420, p: 38, c: 10, f: 24, prep: 'Cocina el pollo a la plancha. Mezcla lechuga con parmesano y aderezo. Monta el pollo encima.', ingredients: ['pollo 150g', 'lechuga', 'parmesano 20g', 'aderezo 1 cda'] },
  { name: 'Tortilla de verduras', diets: VEG(['vegetariano', 'keto', 'sin_gluten', 'omnivoro']), meal: 'Cena', kcal: 360, p: 22, c: 12, f: 24, prep: 'Saltea verduras, agrega huevos batidos y queso. Cuaja a fuego medio. Sirve.', ingredients: ['huevo 3', 'pimentón', 'cebolla', 'queso 30g'] },
  { name: 'Tofu salteado con arroz', diets: VEG(['vegano', 'vegetariano']), meal: 'Cena', kcal: 450, p: 22, c: 58, f: 12, prep: 'Saltea tofu en soja con verduras. Sirve con arroz cocido.', ingredients: ['tofu 150g', 'arroz 60g', 'soja', 'verduras 150g'] },
  { name: 'Crema de calabaza', diets: VEG(['vegano', 'vegetariano', 'sin_gluten', 'keto']), meal: 'Cena', kcal: 280, p: 8, c: 24, f: 16, prep: 'Cocina calabaza, licúa con crema. Calienta y sirve con semillas.', ingredients: ['calabaza 300g', 'crema 50ml', 'semillas'] },
  { name: 'Sándwich de pavo integral', diets: VEG(['omnivoro']), meal: 'Cena', kcal: 380, p: 28, c: 40, f: 10, prep: 'Tuesta el pan, monta pavo, queso y tomate. Sirve.', ingredients: ['pan integral 2 reb', 'pavo 80g', 'queso 20g', 'tomate'] },
  { name: 'Puñado de frutos secos', diets: ALL, meal: 'Snack', kcal: 180, p: 6, c: 6, f: 16, prep: 'Servir directamente. Porción de 30g.', ingredients: ['almendras 30g'] },
  { name: 'Manzana con mantequilla de maní', diets: VEG(['vegano', 'vegetariano', 'sin_gluten']), meal: 'Snack', kcal: 220, p: 6, c: 26, f: 12, prep: 'Corta la manzana y unta mantequilla de maní.', ingredients: ['manzana 1', 'mantequilla de maní 20g'] },
  { name: 'Batido de proteína', diets: ALL, meal: 'Snack', kcal: 160, p: 25, c: 8, f: 3, prep: 'Mezcla proteína con agua o leche. Agita bien.', ingredients: ['proteína 1 scoop', 'agua/leche 300ml'] },
  { name: 'Queso cottage con fruta', diets: VEG(['vegetariano', 'keto', 'omnivoro', 'sin_gluten']), meal: 'Snack', kcal: 200, p: 18, c: 14, f: 6, prep: 'Sirve cottage con fresas encima.', ingredients: ['cottage 150g', 'fresas 80g'] },
];

const SLOT_ORDER: MealKind[] = ['Desayuno', 'Almuerzo', 'Snack', 'Cena', 'Snack', 'Snack'];

export interface DayMenu {
  day: string;
  items: { meal: string; recipe: Recipe }[];
  kcal: number;
}

export function buildWeekMenu(diet: Diet, mealsPerDay: number, seed = 0, excluded: string[] = [], startDayOffset = 0): DayMenu[] {
  const weekSeed = seed || Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const slots = SLOT_ORDER.slice(0, Math.max(1, Math.min(6, mealsPerDay)));
  const ex = excluded.map((x) => x.toLowerCase().trim()).filter(Boolean);
  const pool = (meal: MealKind) => {
    const base = RECIPES.filter((r) => r.meal === meal && r.diets.includes(diet));
    const filtered = ex.length
      ? base.filter((r) => !ex.some((e) => r.name.toLowerCase().includes(e) || r.ingredients.some((i) => i.toLowerCase().includes(e))))
      : base;
    return filtered.length > 0 ? filtered : base.length > 0 ? base : RECIPES.filter((r) => r.meal === meal);
  };
  const allDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const todayIdx = new Date().getDay(); // 0=Sun
  const mondayIdx = (todayIdx + 6) % 7; // 0=Mon
  const startIdx = (mondayIdx + startDayOffset) % 7;
  const days = [...allDays.slice(startIdx), ...allDays.slice(0, startIdx)];
  return days.map((day, d) => {
    const items = slots.map((meal, s) => {
      const list = pool(meal);
      const recipe = list[(d + s + weekSeed) % list.length];
      return { meal: s >= 4 ? 'Snack' : meal, recipe };
    });
    return { day, items, kcal: Math.round(items.reduce((a, x) => a + x.recipe.kcal, 0)) };
  });
}

export function shoppingList(menu: DayMenu[]): { item: string; n: number }[] {
  const map = new Map<string, number>();
  for (const d of menu) {
    for (const it of d.items) {
      for (const ing of it.recipe.ingredients) {
        // Normaliza: quita cantidad inicial (ej. "avena 70g" -> "avena")
        const key = ing.replace(/\s+\d+(\.\d+)?\s*(g|ml|cda|reb|scoop|lata|unidad|ud|cdas?)?\s*$/i, '').trim() || ing.trim();
        const norm = key.toLowerCase();
        map.set(norm, (map.get(norm) || 0) + 1);
      }
    }
  }
  return [...map.entries()].map(([item, n]) => ({ item, n })).sort((a, b) => b.n - a.n);
}
