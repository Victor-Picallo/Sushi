import { backendUrl } from './socket';
import { ensurePlayerToken } from '../utils/session';

const AUTH_BASE_URL =
  import.meta.env.VITE_NEON_AUTH_URL ||
  'https://ep-lucky-wind-b9o5h0dw.neonauth.c-7.eu-central-1.aws.neon.tech/neondb/auth';

const TOKEN_STORAGE_KEY = 'neon_auth_token';
const ROLE_STORAGE_KEY = 'sushi_user_role';
const EMAIL_STORAGE_KEY = 'sushi_user_email';

export type UserRole = 'user' | 'superuser';

export type AuthSession = {
  token: string;
  email: string;
  role: UserRole;
};

export function getStoredAuthToken(): string {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
}

export function getStoredRole(): UserRole {
  return localStorage.getItem(ROLE_STORAGE_KEY) === 'superuser' ? 'superuser' : 'user';
}

export function getStoredEmail(): string {
  return localStorage.getItem(EMAIL_STORAGE_KEY) || '';
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(ROLE_STORAGE_KEY);
  localStorage.removeItem(EMAIL_STORAGE_KEY);
}

async function syncWithBackend(token: string, email: string): Promise<AuthSession> {
  const res = await fetch(`${backendUrl}/api/auth/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ playerToken: ensurePlayerToken() }),
  });

  let role: UserRole = 'user';
  if (res.ok) {
    const profile = (await res.json()) as { role?: string };
    if (profile?.role === 'superuser') {
      role = 'superuser';
    }
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(ROLE_STORAGE_KEY, role);
  localStorage.setItem(EMAIL_STORAGE_KEY, email);
  return { token, email, role };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${AUTH_BASE_URL.replace(/\/+$/, '')}/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    token?: string;
    session?: { token?: string };
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.message || 'Credenciales incorrectas.');
  }

  const token = data.token || data.session?.token || '';
  if (!token) {
    throw new Error('No se recibió token de sesión desde Neon Auth.');
  }

  return syncWithBackend(token, email);
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  const res = await fetch(`${AUTH_BASE_URL.replace(/\/+$/, '')}/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    token?: string;
    session?: { token?: string };
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.message || 'No se pudo crear la cuenta.');
  }

  const token = data.token || data.session?.token || '';
  if (!token) {
    throw new Error('Cuenta creada, inicia sesión para continuar.');
  }

  return syncWithBackend(token, email);
}
