import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, Dumbbell, Salad, User, TrendingUp, Users, BookOpen } from 'lucide-react';
import SplashScreen from './components/SplashScreen';
import LoginCelebration from './components/LoginCelebration';
import AmbientCanvas from './components/AmbientCanvas';
import Sidebar from './components/Sidebar';
import { PageTransition } from './components/ui';
import Welcome from './views/Welcome';
import Onboarding from './views/Onboarding';
import Dashboard from './views/Dashboard';
import Workouts from './views/Workouts';
import Nutrition from './views/Nutrition';
import Profile from './views/Profile';
import Progress from './views/Progress';
import Informe from './views/Informe';
import Comunidad from './views/Comunidad';
import Biblioteca from './views/Biblioteca';
import { Reminders } from './lib/reminders';
import { checkUpdate, type VersionInfo } from './lib/report';
import { DEFAULT_SERVER_URL } from './lib/serverApi';
import { MEDALS } from './lib/achievements';
import { Download, X, Medal } from 'lucide-react';

function MedalToast() {
  const { achievements } = useStore();
  const [shown, setShown] = useState(0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (achievements.length > shown) {
      setShown(achievements.length);
      if (shown > 0) {
        setVisible(true);
        const t = setTimeout(() => setVisible(false), 4500);
        return () => clearTimeout(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievements.length]);
  const last = MEDALS.find((m) => m.id === achievements[achievements.length - 1]);
  return (
    <AnimatePresence>
      {visible && last && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="no-print fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-fire/50 bg-slate-900/95 px-5 py-3.5 shadow-glow-fire"
        >
          <span className="rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#EF4444] p-2.5 text-white"><Medal size={20} /></span>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-fire font-bold">¡Medalla desbloqueada!</p>
            <p className="font-bold">{last.name} · <span className="text-muted font-normal text-xs">{last.desc}</span></p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function VersionBanner() {
  const { serverUrl } = useStore();
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    checkUpdate(serverUrl || DEFAULT_SERVER_URL).then((v) => { if (v) setInfo(v); });
  }, [serverUrl]);
  if (!info || dismissed) return null;
  return (
    <div className="no-print fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl border border-fire/40 bg-slate-900/90 backdrop-blur px-4 py-2.5 text-xs shadow-glow-fire">
      <Download size={15} className="text-fire" />
      <span><b>Nueva versión {info.version}</b> · {info.notes}</span>
      {info.url && <a href={info.url} target="_blank" rel="noreferrer" className="font-bold text-emerald hover:underline">Descargar</a>}
      <button onClick={() => setDismissed(true)} className="text-muted hover:text-white"><X size={14} /></button>
    </div>
  );
}
import { StoreProvider, useStore } from './lib/store';

function AnimatedRoutes() {
  const location = useLocation();
  const { user, onboarded, loading, celebration, dismissCelebration } = useStore();

  if (loading) {
    return <div className="relative flex h-full items-center justify-center text-sm text-muted">Cargando tus datos…</div>;
  }

  if (!user) {
    return (
      <AnimatePresence mode="wait">
        <PageTransition key="welcome"><Welcome /></PageTransition>
      </AnimatePresence>
    );
  }

  if (!onboarded) {
    return (
      <>
        <AnimatePresence mode="wait">
          <PageTransition key="onboarding"><Onboarding mode="first" /></PageTransition>
        </AnimatePresence>
        <AnimatePresence>
          {celebration && <LoginCelebration key="celebration" name={celebration} onDone={dismissCelebration} />}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="relative flex h-full gap-0">
      <Sidebar />
      <VersionBanner />
      <MedalToast />
      <main className="relative min-h-0 flex-1 overflow-y-auto touch-pan-y p-4 md:p-6 pb-48 md:pb-6">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
            <Route path="/rutinas" element={<PageTransition><Workouts /></PageTransition>} />
            <Route path="/dieta" element={<PageTransition><Nutrition /></PageTransition>} />
            <Route path="/perfil" element={<PageTransition><Profile /></PageTransition>} />
            <Route path="/progreso" element={<PageTransition><Progress /></PageTransition>} />
            <Route path="/informe" element={<PageTransition><Informe /></PageTransition>} />
            <Route path="/comunidad" element={<PageTransition><Comunidad /></PageTransition>} />
            <Route path="/biblioteca" element={<PageTransition><Biblioteca /></PageTransition>} />
            <Route path="/onboarding" element={<PageTransition><Onboarding mode="edit" /></PageTransition>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0A0F1E]/90 backdrop-blur-xl px-1 pt-2 [padding-bottom:calc(env(safe-area-inset-bottom)+10px)]">
        <div className="flex justify-around">
        {[
          { to: '/', icon: LayoutDashboard, label: 'Inicio' },
          { to: '/rutinas', icon: Dumbbell, label: 'Rutinas' },
          { to: '/dieta', icon: Salad, label: 'Dieta' },
          { to: '/progreso', icon: TrendingUp, label: 'Progreso' },
          { to: '/comunidad', icon: Users, label: 'Comunidad' },
          { to: '/biblioteca', icon: BookOpen, label: 'Biblio' },
          { to: '/perfil', icon: User, label: 'Perfil' },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold ${isActive ? 'text-emerald bg-emerald/10' : 'text-muted'}`}>
            <Icon size={19} />{label}
          </NavLink>
        ))}
        </div>
      </nav>
    </div>
  );
}

function Shell() {
  const [splash, setSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="app-bg h-screen h-[100dvh] w-screen overflow-hidden text-mist">
      <AmbientCanvas />
      <div className="noise" aria-hidden />
      <div className="relative z-10 h-full">
        <AnimatePresence>{splash && <SplashScreen key="splash" />}</AnimatePresence>
        <Reminders />
        <HashRouter><AnimatedRoutes /></HashRouter>
      </div>
    </div>
  );
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
