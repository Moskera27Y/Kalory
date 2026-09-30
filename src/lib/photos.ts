/** Fotos de progreso: comprimidas y guardadas en este equipo (válido en ambos modos). */

export interface ProgressPhoto {
  id: string;
  userId: number;
  date: string; // YYYY-MM-DD
  weight: number | null;
  img: string; // dataURL JPEG
}

const KEY = 'kalory-photos-v1';
const MAX = 60;

function loadAll(): ProgressPhoto[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as ProgressPhoto[];
  } catch { /* ignore */ }
  return [];
}

function saveAll(list: ProgressPhoto[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch { /* cuota llena: conserva lo que quepa */ }
}

export function listPhotos(userId: number): ProgressPhoto[] {
  return loadAll().filter((p) => p.userId === userId).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function deletePhoto(id: string) {
  saveAll(loadAll().filter((p) => p.id !== id));
}

function compress(file: File, maxSide = 720, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const k = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * k));
        const h = Math.max(1, Math.round(img.height * k));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const out = c.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(url);
        resolve(out);
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('bad_image'));
    img.src = url;
  });
}

export async function addPhoto(userId: number, date: string, weight: number | null, file: File): Promise<ProgressPhoto> {
  const img = await compress(file);
  const entry: ProgressPhoto = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, userId, date, weight, img };
  const all = loadAll();
  all.push(entry);
  saveAll(all);
  return entry;
}
