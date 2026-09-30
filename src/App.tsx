import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, Dumbbell, Salad, User } from 'lucide-react';
import SplashScreen from './components/SplashScreen';
import LoginCelebration from './components/LoginCelebration';
import Sidebar from './components/Sidebar';
import { PageTransition } from './components/ui';
import Welcome from './views/Welcome';
import Onboarding from './views/Onboarding';
import Dashboard from './views/Dashboard';
import Workouts from './views/Workouts';
import Nutrition from './views/Nutrition';
import Profile from './views/Profile';
import { StoreProvider, useStore } from './lib/store';

/** Resplandores ambientales animados con los colores del logo */
function Aurora() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-emerald/20 blur-[120px]"
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ repeat: Infinity, duration: 22, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-28 h-[460px] w-[460px] rounded-full bg-fire/15 blur-[130px]"
        animate={{ x: [0, -70, 0], y: [0, 50, 0] }}
        transition={{ repeat: Infinity, duration: 26, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 left-1/3 h-[380px] w-[520px] rounded-full bg-fire-hot/10 blur-[130px]"
        animate={{ x: [0, 50, 0] }}
        transition={{ repeat: Infinity, duration: 30, ease: 'easeInOut' }}
      />
    </div>
  );
}

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
      <main className="relative flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
            <Route path="/rutinas" element={<PageTransition><Workouts /></PageTransition>} />
            <Route path="/dieta" element={<PageTransition><Nutrition /></PageTransition>} />
            <Route path="/perfil" element={<PageTransition><Profile /></PageTransition>} />
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
      <Aurora />
      <div className="noise" aria-hidden />
      <div className="relative z-10 h-full">
        <AnimatePresence>{splash && <SplashScreen key="splash" />}</AnimatePresence>
        <HashRouter><AnimatedRoutes /></HashRouter>
      </div>
    </div>
  );
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
