import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Wheat, Truck, LogOut, Moon, Sun, Factory, Users, ShoppingCart, BookOpen, History as HistoryIcon, PackagePlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const nav = [
  { to: '/dashboard',  label: 'Tableau de bord',     icon: LayoutDashboard },
  { to: '/materials',  label: 'Matières premières',  icon: Wheat },
  { to: '/purchases',  label: 'Achats',              icon: PackagePlus },
  { to: '/products',   label: 'Produits finis',      icon: Package },
  { to: '/suppliers',  label: 'Fournisseurs',        icon: Truck },
  { to: '/customers',  label: 'Clients',             icon: Users },
  { to: '/sales',      label: 'Ventes',              icon: ShoppingCart },
  { to: '/history',    label: 'Historique',          icon: HistoryIcon },
  { to: '/production', label: 'Production',          icon: Factory },
  { to: '/recipes',    label: 'Recettes',            icon: BookOpen },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-slate-100 dark:bg-slate-950">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
            <Factory size={20} />
          </div>
          <div>
            <div className="font-bold text-lg leading-none">MoniaGauf</div>
            <div className="text-xs text-slate-400">Stock Management</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <div className="text-sm">
            <div className="font-medium">{user?.fullName}</div>
            <div className="text-xs text-slate-400">{user?.role}</div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3">
          <div className="md:hidden font-bold text-lg">MoniaGauf</div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Toggle theme"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={handleLogout}
              className="btn-secondary"
              title="Logout"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
