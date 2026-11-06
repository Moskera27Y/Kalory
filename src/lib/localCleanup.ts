/**
 * Borra todo rastro local de datos de usuario en este equipo.
 * Se usa al "Borrar datos": sin esto, la sombra offline resucitaba comidas,
 * sueños, ayunos o fotos ya borrados en el siguiente uso sin conexión.
 *
 * Se conserva `kalory-reminders-v1` (preferencias de avisos, no datos)
 * y `kalory-server-v1` (URL del servidor elegida / sesión: se cierra aparte).
 */
export function clearLocalUserData(): void {
  const exact = [
    'kalory-fasting-v1',
    'kalory-sleep-v1',
    'kalory-steps-v1',
    'kalory-photos-v1',
    'kalory-fallback-v2',
  ];
  const prefixes = [
    'kalory-shadow-',       // día, perfil, logros, historia, pesos
    'kalory-sync-queue:',   // cola offline pendiente
    'kalory-sync-idmap:',   // relación id local → id servidor
    'kalory-reminder-last:',
  ];
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (exact.includes(k) || prefixes.some((p) => k.startsWith(p)))) doomed.push(k);
    }
    for (const k of doomed) localStorage.removeItem(k);
  } catch { /* sin localStorage: nada que limpiar */ }
}
