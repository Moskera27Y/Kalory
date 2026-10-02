import type { DayHistory } from '../types';

export const APP_VERSION = '1.3.0';

export function downloadFile(name: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function weeklyCSV(days: DayHistory[]): string {
  const head = 'fecha,kcal,proteina_g,carbos_g,grasa_g,agua_ml,ejercicios,peso_kg';
  const rows = days.map((d) =>
    [d.date, Math.round(d.kcal), Math.round(d.protein), Math.round(d.carbs), Math.round(d.fat), d.waterMl, d.exercises, d.weight ?? ''].join(','));
  return [head, ...rows].join('\n');
}

function cmpVer(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

export interface VersionInfo {
  version: string;
  url: string;
  notes: string;
}

/** Consulta si hay versión nueva en el servidor oficial. null = sin avisos. */
export async function checkUpdate(serverUrl: string): Promise<VersionInfo | null> {
  if (!serverUrl) return null;
  try {
    const r = await fetch(`${serverUrl}/api/version`);
    const d = await r.json();
    if (d?.ok && typeof d.version === 'string' && cmpVer(d.version, APP_VERSION) > 0) {
      return { version: d.version, url: d.url || '', notes: d.notes || '' };
    }
    return null;
  } catch {
    return null;
  }
}
