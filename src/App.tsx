import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Dumbbell, Salad, User } from 'lucide-react';
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
import { Reminders } from './lib/reminders';
import { checkUpdate, type VersionInfo } from './lib/report';
import { DEFAULT_SERVER_URL } from './lib/serverApi';
import { Download, X } from 'lucide-react';

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
      <main className="relative flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
            <Route path="/rutinas" element={<PageTransition><Workouts /></PageTransition>} />
            <Route path="/dieta" element={<PageTransition><Nutrition /></PageTransition>} />
            <Route path="/perfil" element={<PageTransition><Profile /></PageTransition>} />
            <Route path="/progreso" element={<PageTransition><Progress /></PageTransition>} />
            <Route path="/informe" element={<PageTransition><Informe /></PageTransition>} />
            <Route path="/onboarding" element={<PageTransition><Onboarding mode="edit" /></PageTransition>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-40 glass-strong flex justify-around p-2 [margin-bottom:env(safe-area-inset-bottom)]">
        {[
          { to: '/', icon: LayoutDashboard, label: 'Inicio' },
          { to: '/rutinas', icon: Dumbbell, label: 'Rutinas' },
          { to: '/dieta', icon: Salad, label: 'Dieta' },
          { to: '/perfil', icon: User, label: 'Perfil' },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-[11px] ${isActive ? 'text-emerald bg-emerald/10' : 'text-muted'}`}>
            <Icon size={19} />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Shell() {
  const [splash, setSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 2100);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="app-bg h-screen w-screen overflow-hidden text-mist">
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
