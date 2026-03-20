import { getAuthSession, setAuthSession, type AuthUser } from './auth';

export interface ConfiguracionNegocio {
  id: string;
  nombreComercial: string;
  moneda: string;
  logoUrl?: string | null;
  stockMinimoPorDefecto: number;
  contentPalette: string;
  sidebarPalette: string;
  contentCustomColor?: string | null;
  sidebarCustomColor?: string | null;
}

export interface UsuarioSistema {
  id: string;
  nombre: string;
  email: string;
  telefono?: string | null;
  rol: string;
  activo?: boolean;
}

function getAuthHeaders() {
  const session = getAuthSession();

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.token || ''}`,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  throw new Error(data?.message || 'Ocurrió un error inesperado.');
}

export async function getConfiguracion() {
  const response = await fetch('/api/configuracion', {
    headers: getAuthHeaders(),
  });

  return parseResponse<{ negocio: ConfiguracionNegocio; user: AuthUser }>(response);
}

export async function updateConfiguracion(payload: {
  nombreComercial: string;
  moneda: string;
  logoUrl?: string;
  stockMinimoPorDefecto: string;
  contentPalette?: string;
  sidebarPalette?: string;
  contentCustomColor?: string;
  sidebarCustomColor?: string;
}) {
  const response = await fetch('/api/configuracion', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse<{ negocio: ConfiguracionNegocio }>(response);
}

export async function updatePerfil(payload: {
  nombre: string;
  email: string;
  telefono: string;
}) {
  const response = await fetch('/api/auth/profile', {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const result = await parseResponse<{ user: AuthUser }>(response);
  const session = getAuthSession();

  if (session) {
    setAuthSession({ ...session, user: result.user });
  }

  return result;
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  const response = await fetch('/api/auth/password', {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse<{ ok: true }>(response);
}

export async function getUsuarios() {
  const response = await fetch('/api/usuarios', {
    headers: getAuthHeaders(),
  });

  return parseResponse<UsuarioSistema[]>(response);
}

export async function createUsuario(payload: {
  nombre: string;
  email: string;
  telefono: string;
  password: string;
  rol: string;
}) {
  const response = await fetch('/api/usuarios', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse<UsuarioSistema>(response);
}

export async function updateUsuario(
  id: string,
  payload: { nombre: string; email: string; telefono: string; rol: string; activo: boolean },
) {
  const response = await fetch(`/api/usuarios/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse<UsuarioSistema>(response);
}
