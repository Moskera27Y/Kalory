import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Trophy, Plus, Medal, Flame, Dumbbell } from 'lucide-react';
import { GlassCard } from '../components/ui';
import { useStore } from '../lib/store';
import type { BoardRow, FriendInfo } from '../types';

/** Comunidad: amigos por código + ranking semanal. Solo en modo online. */
export default function Comunidad() {
  const { serverUrl, getInviteCode, addFriend, getFriends, getLeaderboard, unlockMedal } = useStore();
  const [code, setCode] = useState('');
  const [myCode, setMyCode] = useState('');
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [c, f, b] = await Promise.all([getInviteCode(), getFriends(), getLeaderboard()]);
      setMyCode(c);
      setFriends(f);
      setBoard(b);
      if (b.length > 0 && b[0].me) unlockMedal('top_1').catch(() => undefined);
    } catch {
      setMsg('Solo disponible en modo online.');
    }
  };

  useEffect(() => {
    if (serverUrl) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl]);

  if (!serverUrl) {
    return (
      <GlassCard className="mx-auto max-w-md text-center py-10">
        <Users size={32} className="mx-auto text-muted" />
        <p className="mt-3 font-bold">Comunidad solo en modo online</p>
        <p className="mt-1 text-xs text-muted">Conéctate al servidor para retar amigos.</p>
      </GlassCard>
    );
  }

  const add = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setMsg('');
    try {
      const f = await addFriend(code.trim().toUpperCase());
      setMsg(`¡${f.name} ahora es tu amigo!`);
      setCode('');
      unlockMedal('amigo_1').catch(() => undefined);
      await load();
    } catch (e) {
      const c = (e as { code?: string })?.code;
      setMsg(c === 'codigo_invalido' ? 'Código inválido (formato KAL-XXXXXX).'
        : c === 'eres_tu' ? 'Ese es tu propio código.'
        : c === 'no_existe' ? 'Nadie usa ese código todavía.'
        : 'No se pudo añadir. Revisa tu conexión.');
    } finally {
      setBusy(false);
    }
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Comunidad <span className="text-gradient-fire">y retos</span></h1>
        <p className="text-sm text-muted">Puntos semanales: día activo ×10 · ejercicio ×5 · medalla ×2</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard glow>
          <div className="flex items-center gap-2">
            <Trophy size={17} className="text-fire" />
            <p className="text-sm font-bold">Ranking de la semana</p>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {board.length === 0 && <p className="text-xs text-muted text-center py-4">Sin datos aún. Registra actividad para puntuar.</p>}
            {board.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${r.me ? 'border-emerald/50 bg-emerald/10' : 'border-white/5 bg-white/[0.03]'}`}>
                <span className="text-xl w-8 text-center">{medals[i] ?? `#${i + 1}`}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] text-sm font-extrabold text-white">
                  {r.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{r.name}{r.me ? ' (tú)' : ''}</p>
                  <p className="text-[11px] text-muted flex gap-2">
                    <span className="flex items-center gap-1"><Flame size={11} />{r.week.days}d</span>
                    <span className="flex items-center gap-1"><Dumbbell size={11} />{r.week.works}</span>
                    <span className="flex items-center gap-1"><Medal size={11} />{r.week.medals}</span>
                  </p>
                </div>
                <b className="font-display text-lg">{r.week.score}</b>
              </motion.div>
            ))}
          </div>
        </GlassCard>

        <div className="flex flex-col gap-4">
          <GlassCard>
            <p className="text-xs uppercase tracking-widest text-muted">Tu código de amigo</p>
            <p className="mt-2 font-display text-3xl font-extrabold tracking-widest text-gradient-emerald">{myCode || '···'}</p>
            <p className="mt-1 text-xs text-muted">Compártelo para que te añadan.</p>
            <div className="mt-3 flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
                className="input-kalory !py-2 text-sm uppercase" placeholder="KAL-XXXXXX" />
              <motion.button whileTap={{ scale: 0.97 }} onClick={add} disabled={busy} className="btn-emerald !py-2 text-sm whitespace-nowrap disabled:opacity-50">
                <span className="flex items-center gap-1"><Plus size={15} /> Añadir</span>
              </motion.button>
            </div>
            {msg && <p className="mt-2 text-xs text-fire">{msg}</p>}
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-2">
              <Users size={17} className="text-emerald" />
              <p className="text-sm font-bold">Amigos · {friends.length}</p>
            </div>
            <div className="mt-2 flex flex-col gap-1.5 max-h-[260px] overflow-y-auto">
              {friends.length === 0 && <p className="text-xs text-muted text-center py-4">Aún no tienes amigos. ¡Comparte tu código!</p>}
              {friends.map((f) => (
                <div key={f.id} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#F59E0B] to-[#EF4444] text-xs font-extrabold text-white">
                    {f.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{f.name}</p>
                    <p className="text-[11px] text-muted">{f.week.days}d activos · {f.week.works} ejerc. · {f.week.score} pts</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
