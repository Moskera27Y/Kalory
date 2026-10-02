import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Droplet, Trophy, ArrowRight, Loader2 } from 'lucide-react';
import Logo from '../components/Logo';
import { useStore } from '../lib/store';
import { AUTH_ERRORS } from '../lib/db';

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.3h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.4 7.5 24 12 24z" />
      <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8-.1.1C.5 8.6 0 10.2 0 12s.5 3.4 1.4 4.9l3.8-2.5z" />
      <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.6 1.4 6.6l3.8 2.9c1-2.8 3.7-4.8 6.8-4.8z" />
    </svg>
  );
}

const FEATURES = [
  { icon: Flame, title: 'Plan semanal a tu medida', desc: 'Rutinas según tus días, nivel y lugar de entreno.', grad: 'from-[#F59E0B] to-[#EF4444]' },
  { icon: Droplet, title: 'Nutrición y agua al día', desc: 'Registra comidas, macros e hidratación.', grad: 'from-[#10B981] to-[#059669]' },
  { icon: Trophy, title: 'Medallas por tus logros', desc: 'Desbloquea logros mientras avanzas.', grad: 'from-violet-500 to-fuchsia-500' },
];

export default function Welcome() {
  const { register, login, googleSignIn } = useStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const r = tab === 'login'
        ? await login({ email, password })
        : await register({ name, email, password });
      if (!r.ok) setError(AUTH_ERRORS[r.error] ?? 'Ocurrió un error. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const withGoogle = async () => {
    setError('');
    setGoogleBusy(true);
    try {
      const r = await googleSignIn();
      if (!r.ok) setError((AUTH_ERRORS[r.error] ?? 'No se pudo completar el acceso con Google.') + (r.detail ? ` Detalle: ${r.detail}` : ''));
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div className="min-h-full">
      <div className="mx-auto grid min-h-full max-w-6xl items-center gap-6 px-4 py-6 sm:gap-10 sm:px-6 sm:py-10 lg:grid-cols-2">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, x: -32 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}>
          <Logo size={44} />
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:mt-8 sm:text-5xl">
            Tu energía,<br />
            <span className="text-gradient-emerald">tu progreso.</span>
          </h1>
          <p className="mt-3 max-w-md text-base text-muted sm:mt-4 sm:text-lg">
            Entrena, come y avanza con un plan hecho a tu medida.
            Registra tu día, completa tus rutinas y colecciona medallas.
          </p>
          <div className="mt-5 hidden sm:mt-8 sm:flex sm:flex-col sm:gap-3">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.1 }}
                className="glass flex items-center gap-4 p-4">
                <span className={`rounded-xl bg-gradient-to-br p-2.5 text-white ${f.grad}`}><f.icon size={20} /></span>
                <div>
                  <p className="font-bold text-sm">{f.title}</p>
                  <p className="text-xs text-muted">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Auth card */}
        <motion.div initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.1 }}
          className="glass card-glow-emerald w-full max-w-md justify-self-center p-5 sm:p-8 lg:justify-self-end">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
            {(['login', 'register'] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(''); }}
                className={`rounded-lg py-2.5 text-sm font-bold transition-all ${tab === t ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-glow-emerald' : 'text-muted hover:text-white'}`}>
                {t === 'login' ? 'Entrar' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-5 grid gap-3">
              {tab === 'register' && (
                <input value={name} onChange={(e) => setName(e.target.value)} className="input-kalory text-sm" placeholder="Tu nombre" />
              )}
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="input-kalory text-sm" placeholder="Correo electrónico" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password"
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                className="input-kalory text-sm" placeholder="Contraseña (mín. 6 caracteres)" />
              {error && <p className="rounded-xl border border-fire-hot/30 bg-fire-hot/10 px-4 py-2.5 text-xs text-fire">{error}</p>}
              <motion.button whileTap={{ scale: 0.98 }} onClick={submit} disabled={busy} className="btn-emerald flex items-center justify-center gap-2 text-sm">
                {busy ? <Loader2 size={17} className="animate-spin" /> : <>{tab === 'login' ? 'Entrar' : 'Crear mi cuenta'} <ArrowRight size={16} /></>}
              </motion.button>
            </motion.div>
          </AnimatePresence>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted">
            <span className="h-px flex-1 bg-white/10" /> o <span className="h-px flex-1 bg-white/10" />
          </div>

          <motion.button whileTap={{ scale: 0.98 }} onClick={withGoogle} disabled={googleBusy}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-5 py-3 text-sm font-bold text-slate-900 transition-all hover:brightness-95 disabled:opacity-60">
            {googleBusy ? <Loader2 size={18} className="animate-spin" /> : <GoogleG />}
            {googleBusy ? 'Abriendo Google…' : 'Continuar con Google'}
          </motion.button>
          {googleBusy && <p className="mt-2 text-center text-xs text-muted">Completa el acceso en tu navegador…</p>}

          <p className="mt-5 text-center text-[11px] text-muted">Tu cuenta funciona en todos tus equipos.</p>
        </motion.div>
      </div>
    </div>
  );
}
