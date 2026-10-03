import { motion } from 'framer-motion';
import { Printer, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { daysAgo, todayStr } from '../lib/db';

/** Informe semanal imprimible (usa el diálogo del sistema para guardar PDF). */
export default function Informe() {
  const { history, profile, targets } = useStore();
  const to = todayStr();
  const from = daysAgo(6);
  const week = history.filter((d) => d.date >= from && d.date <= to);
  const sum = (f: (d: (typeof week)[number]) => number) => week.reduce((a, d) => a + f(d), 0);
  const totKcal = Math.round(sum((d) => d.kcal));
  const avgKcal = week.length ? Math.round(totKcal / week.length) : 0;
  const waters = week.filter((d) => targets && d.waterMl >= targets.waterMl).length;
  const trainDays = week.filter((d) => d.exercises > 0).length;
  const weights = week.map((d) => d.weight).filter((w): w is number => w != null);

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-4">
      <div className="flex items-center gap-3 no-print">
        <Link to="/progreso" className="chip flex items-center gap-2 text-sm text-muted"><ArrowLeft size={15} /> Progreso</Link>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => window.print()} className="btn-emerald !py-2.5 text-sm flex items-center gap-2 ml-auto">
          <Printer size={16} /> Imprimir / Guardar PDF
        </motion.button>
      </div>

      <div className="glass p-8">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold">Informe semanal Kalory</h1>
            <p className="text-sm text-muted">{from} → {to}{profile ? ` · ${profile.name}` : ''}</p>
          </div>
          <span className="ml-auto rounded-xl bg-gradient-to-br from-[#10B981] to-[#F59E0B] px-3 py-2 font-display font-extrabold text-white">K</span>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            ['Kcal promedio', `${avgKcal}`],
            ['Días con entreno', `${trainDays}`],
            [`Días con meta de agua`, `${waters}/${week.length || 7}`],
            ['Peso', weights.length ? `${weights[0]} → ${weights[weights.length - 1]} kg` : '—'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-[11px] text-muted">{k}</p>
              <p className="font-display text-lg font-extrabold">{v}</p>
            </div>
          ))}
        </div>

        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-white/10">
              <th className="py-2">Día</th><th className="text-right">Kcal</th><th className="text-right">Prot.</th>
              <th className="text-right">Agua</th><th className="text-right">Ejerc.</th><th className="text-right">Peso</th>
            </tr>
          </thead>
          <tbody>
            {week.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-muted">Sin datos esta semana: registra comidas, agua o entrenos.</td></tr>
            )}
            {week.map((d) => (
              <tr key={d.date} className="border-b border-white/5">
                <td className="py-2 font-semibold">{d.date}</td>
                <td className="text-right">{Math.round(d.kcal)}</td>
                <td className="text-right">{Math.round(d.protein)}g</td>
                <td className="text-right">{(d.waterMl / 1000).toFixed(2)} L</td>
                <td className="text-right">{d.exercises}</td>
                <td className="text-right">{d.weight != null ? `${d.weight} kg` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-[11px] text-muted">Generado por Kalory · {new Date().toLocaleString('es')}</p>
      </div>
    </div>
  );
}
