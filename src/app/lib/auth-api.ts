import { getAuthSession, type AuthSession, type AuthUser } from './auth';

interface LoginPayload {
  identifier: string;
  password: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  throw new Error(data?.message || 'Ocurrio un error inesperado.');
}

export async function login(payload: LoginPayload) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<AuthSession>(response);
}

export async function getMe() {
  const session = getAuthSession();

  const response = await fetch('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${session?.token || ''}`,
    },
  });

  return parseResponse<{ user: AuthUser }>(response);
}
