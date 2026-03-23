import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Package, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { login } from '../lib/auth-api';
import { setAuthSession } from '../lib/auth';

type PublicLoginConfig = {
  negocio?: {
    nombreComercial?: string | null;
    logoUrl?: string | null;
  };
};

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nombreComercial, setNombreComercial] = useState('Vidriería');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicConfig() {
      try {
        const response = await fetch('/api/configuracion/publica');

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as PublicLoginConfig;

        if (!isMounted) {
          return;
        }

        setNombreComercial(data.negocio?.nombreComercial || 'Vidriería');
        setLogoUrl(data.negocio?.logoUrl || null);
      } catch {
        // Si falla esta carga, dejamos el branding por defecto sin bloquear el login.
      }
    }

    void loadPublicConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const session = await login({ identifier, password });
      setAuthSession(session);
      toast.success('Bienvenido al sistema');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        backgroundImage: 'linear-gradient(135deg, var(--hero-from), color-mix(in srgb, var(--hero-via) 78%, #0f172a), var(--hero-to))',
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={nombreComercial}
              className="mx-auto mb-5 h-28 w-28 rounded-3xl border border-white/10 bg-white object-cover shadow-xl sm:h-32 sm:w-32 lg:h-36 lg:w-36"
            />
          ) : (
            <div className="mb-5 inline-flex h-28 w-28 items-center justify-center rounded-3xl bg-[var(--brand-600)] text-[var(--brand-contrast)] shadow-xl sm:h-32 sm:w-32 lg:h-36 lg:w-36">
              <Package className="h-16 w-16 text-white sm:h-[4.5rem] sm:w-[4.5rem] lg:h-20 lg:w-20" />
            </div>
          )}
          <h1 className="mb-2 text-3xl font-bold text-white">Sistema de Gestión</h1>
          <p className="text-white/75">{nombreComercial}</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="mb-2 text-2xl font-semibold text-gray-900">Iniciar sesión</h2>
            <p className="text-sm text-gray-600">Ingrese sus credenciales para acceder</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Usuario o correo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="login_identifier"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="Ingrese su usuario o correo"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-600)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="login_password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Ingrese su contraseña"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-12 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-600)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full py-2.5" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-white/75">Versión 1.0.0 - 2026</p>
      </div>
    </div>
  );
}
