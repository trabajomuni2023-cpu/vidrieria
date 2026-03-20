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
import { getConfiguracion } from '../lib/configuracion-api';
import { applyThemePreferences, type ThemePaletteId } from '../lib/theme-preferences';

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
  { path: '/dashboard/configuracion', icon: Settings, label: 'Configuración' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications] = useState(3);
  const [user, setUser] = useState<AuthUser | null>(() => getAuthSession()?.user || null);
  const [negocio, setNegocio] = useState<{ nombreComercial: string; logoUrl?: string | null }>({
    nombreComercial: 'Vidriería',
    logoUrl: null,
  });

  useEffect(() => {
    const syncUser = async () => {
      try {
        const [response, config] = await Promise.all([getMe(), getConfiguracion()]);
        setUser(response.user);
        setNegocio({
          nombreComercial: config.negocio.nombreComercial || 'Vidriería',
          logoUrl: config.negocio.logoUrl || null,
        });
        applyThemePreferences({
          contentPaletteId: config.negocio.contentPalette as ThemePaletteId,
          sidebarPaletteId: config.negocio.sidebarPalette as ThemePaletteId,
          contentCustomColor: config.negocio.contentCustomColor || undefined,
          sidebarCustomColor: config.negocio.sidebarCustomColor || undefined,
        });
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
      <aside
        className="fixed hidden h-full w-64 flex-col text-white lg:flex"
        style={{
          backgroundImage: 'linear-gradient(180deg, var(--sidebar-from), var(--sidebar-to))',
        }}
      >
        <div className="px-6 py-6" style={{ borderBottom: '1px solid var(--sidebar-border-strong)' }}>
          <div className="flex items-center gap-3">
            {negocio.logoUrl ? (
              <img
                src={negocio.logoUrl}
                alt={negocio.nombreComercial}
                className="h-10 w-10 rounded-lg border border-white/10 bg-white object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-600)] text-[var(--brand-contrast)]">
                <Package className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="font-semibold text-lg">Sistema de Gestión</h1>
              <p className="text-xs text-white/70">{negocio.nombreComercial || 'Vidriería'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.path);

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'bg-[var(--brand-600)] text-[var(--brand-contrast)] shadow-sm' : 'text-white/80 hover:text-white',
                    )}
                    style={!isActive ? { backgroundColor: 'transparent' } : undefined}
                    onMouseEnter={(event) => {
                      if (!isActive) {
                        event.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (!isActive) {
                        event.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--sidebar-border-strong)' }}>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-lg flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar clientes, trabajos, pagos..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-600)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 lg:justify-end">
              <button className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
                <Bell className="w-5 h-5" />
                {notifications > 0 ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" /> : null}
              </button>

              <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.nombre || 'Usuario'}</p>
                  <p className="text-xs text-gray-500">{user?.email || '-'}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-600)] font-medium text-[var(--brand-contrast)]">
                  {(user?.nombre || 'U').charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          <nav className="-mx-1 mt-4 overflow-x-auto lg:hidden">
            <div className="flex min-w-max gap-2 px-1 pb-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                      isActive ? 'border-[var(--brand-600)] bg-[var(--brand-600)] text-[var(--brand-contrast)]' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
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

