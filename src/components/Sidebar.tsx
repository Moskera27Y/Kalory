import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, Salad, User, Trash2, LogOut } from 'lucide-react';
import Logo from './Logo';
import { useStore } from '../lib/store';

const links = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/rutinas', label: 'Rutinas', icon: Dumbbell },
  { to: '/dieta', label: 'Dieta', icon: Salad },
  { to: '/perfil', label: 'Perfil', icon: User },
];

export default function Sidebar() {
  const { user, logout, resetAll, serverUrl } = useStore();
  return (
    <aside className="hidden md:flex w-[248px] shrink-0 flex-col gap-2 p-5 glass-strong m-4 mr-0">
      <div className="px-2 py-2"><Logo size={38} /></div>
      {user && (
        <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] text-sm font-extrabold text-white">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="truncate text-[11px] text-muted">{user.email}</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 rounded-xl border border-emerald/20 bg-emerald/10 px-3 py-2.5 text-xs text-emerald">
        <span><b>{serverUrl ? 'En línea' : 'Plan activo'}</b> · {serverUrl ? 'Servidor' : 'Personalizado'}</span>
        <span className="ml-auto relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald" />
        </span>
      </div>
      <nav className="mt-4 flex flex-col gap-1.5">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#10B981]/20 to-[#059669]/10 text-white border border-emerald/30 shadow-glow-emerald'
                  : 'text-muted hover:text-white hover:bg-white/5 border border-transparent'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1.5">
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted hover:text-white hover:bg-white/5 transition-all"
        >
          <LogOut size={18} /> Cerrar sesión
        </button>
        <button
          onClick={() => { if (window.confirm('¿Borrar todos tus datos y empezar de cero? (Tu cuenta se mantiene)')) resetAll(); }}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted hover:text-fire-hot hover:bg-fire-hot/10 transition-all"
        >
          <Trash2 size={18} /> Borrar datos
        </button>
      </div>
    </aside>
  );
}
