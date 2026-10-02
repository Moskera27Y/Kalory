/** Lector de calorías (solo móvil): foto → análisis IA vía servidor. */

export interface FoodEstimate {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodAnalysis {
  analysis: string;
  food: FoodEstimate | null;
  model?: string;
}

const LS_KEY = 'kalory-server-v1';

function server(): { url: string; token: string } {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    return { url: String(raw?.url || '').replace(/\/+$/, ''), token: String(raw?.token || '') };
  } catch {
    return { url: '', token: '' };
  }
}

/** Reduce la foto a máx 1024px JPEG para no saturar la IA ni el plan gratuito. */
export function downscale(dataUrl: string, maxDim = 1024, quality = 0.82): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * k));
      const h = Math.max(1, Math.round(img.height * k));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d')?.drawImage(img, 0, 0, w, h);
      const out = c.toDataURL('image/jpeg', quality);
      const [head, b64] = out.split(',');
      if (!b64) return reject(new Error('resize'));
      resolve({ base64: b64, mime: /png/i.test(head) ? 'image/png' : 'image/jpeg' });
    };
    img.onerror = () => reject(new Error('resize'));
    img.src = dataUrl;
  });
}

/** Toma foto con la cámara nativa (Capacitor). Devuelve dataURL para vista previa. */
export async function takePhoto(): Promise<string> {
  const { Camera, CameraSource, CameraResultType } = await import('@capacitor/camera');
  const p = await Camera.getPhoto({
    quality: 85,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Camera,
    correctOrientation: true,
  });
  if (!p.dataUrl) throw new Error('sin_foto');
  return p.dataUrl;
}

/** Elige foto de la galería nativa. */
export async function pickPhoto(): Promise<string> {
  const { Camera, CameraSource, CameraResultType } = await import('@capacitor/camera');
  const p = await Camera.getPhoto({
    quality: 85,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Photos,
    correctOrientation: true,
  });
  if (!p.dataUrl) throw new Error('sin_foto');
  return p.dataUrl;
}

export async function analyzeFood(base64: string, mime: string): Promise<FoodAnalysis> {
  const { url, token } = server();
  if (!url) throw Object.assign(new Error('sin servidor'), { code: 'server_error' });
  const r = await fetch(`${url}/api/food/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify({ imageBase64: base64, mime }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.ok === false) {
    throw Object.assign(new Error(d.error || 'server_error'), { code: d.error || 'server_error' });
  }
  return { analysis: String(d.analysis || ''), food: (d.food as FoodEstimate) || null, model: d.model };
}

export const FOOD_ERRORS: Record<string, string> = {
  sin_imagen: 'No llegó la foto. Tómala de nuevo.',
  imagen_grande: 'Foto muy pesada. Reintenta.',
  sin_ia: 'Falta la clave gratuita en el servidor (OPENROUTER_API_KEY). Avísame y la configuramos.',
  ia_no_disponible: 'IA ocupada ahora. Reintenta en 1 min.',
  ia_vacia: 'La IA no devolvió análisis. Reintenta.',
  server_error: 'No se pudo contactar al servidor. Revisa tu conexión.',
};
