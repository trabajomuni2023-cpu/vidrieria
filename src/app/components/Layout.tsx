import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CreditCard,
  Package,
  TrendingDown,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Calendar,
  Bell,
  Search,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import { clearAuthSession, getAuthSession, type AuthUser } from '../lib/auth';
import { getMe } from '../lib/auth-api';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/dashboard/clientes', icon: Users, label: 'Clientes' },
  { path: '/dashboard/trabajos', icon: Briefcase, label: 'Trabajos' },
  { path: '/dashboard/pagos', icon: CreditCard, label: 'Pagos' },
  { path: '/dashboard/inventario', icon: Package, label: 'Inventario' },
  { path: '/dashboard/gastos', icon: TrendingDown, label: 'Gastos' },
  { path: '/dashboard/caja', icon: Wallet, label: 'Caja' },
  { path: '/dashboard/reportes', icon: BarChart3, label: 'Reportes' },
  { path: '/dashboard/calendario', icon: Calendar, label: 'Calendario' },
  { path: '/dashboard/configuracion', icon: Settings, label: 'Configuracion' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications] = useState(3);
  const [user, setUser] = useState<AuthUser | null>(() => getAuthSession()?.user || null);

  useEffect(() => {
    const syncUser = async () => {
      try {
        const response = await getMe();
        setUser(response.user);
      } catch {
        clearAuthSession();
        navigate('/login');
      }
    };

    void syncUser();
  }, [navigate]);

  const isActivePath = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === path;
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden lg:flex w-64 bg-slate-900 text-white flex-col fixed h-full">
        <div className="px-6 py-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Sistema de Gestion</h1>
              <p className="text-xs text-slate-400">Vidrieria</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.path);

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 py-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar clientes, trabajos, pagos..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 lg:justify-end">
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                {notifications > 0 ? <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" /> : null}
              </button>

              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.nombre || 'Usuario'}</p>
                  <p className="text-xs text-gray-500">{user?.email || '-'}</p>
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                  {(user?.nombre || 'U').charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          <nav className="lg:hidden mt-4 -mx-1 overflow-x-auto">
            <div className="flex gap-2 px-1 pb-1 min-w-max">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                      isActive ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
