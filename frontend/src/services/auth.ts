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
  displayName: string;
  avatarUrl?: string | null;
};

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

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

async function syncWithBackend(
  token: string,
  email: string,
  fallbackName?: string,
): Promise<AuthSession> {
  const res = await fetch(`${backendUrl}/api/auth/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ playerToken: ensurePlayerToken() }),
  });

  let role: UserRole = 'user';
  let displayName = fallbackName || email.split('@')[0] || 'Sushi Lover';
  let avatarUrl: string | null = null;

  if (res.ok) {
    const profile = (await res.json()) as {
      role?: string;
      displayName?: string;
      avatarUrl?: string | null;
    };
    if (profile?.role === 'superuser') role = 'superuser';
    if (profile?.displayName) displayName = profile.displayName;
    if (profile?.avatarUrl) avatarUrl = profile.avatarUrl;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(ROLE_STORAGE_KEY, role);
  localStorage.setItem(EMAIL_STORAGE_KEY, email);
  localStorage.setItem('userName', displayName);
  if (avatarUrl) {
    localStorage.setItem('sushi_avatar_preview', avatarUrl);
  }
  return { token, email, role, displayName, avatarUrl };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthSession> {
  const cleanEmail = email.trim().toLowerCase();
  const res = await fetch(`${AUTH_BASE_URL.replace(/\/+$/, '')}/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanEmail, password }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    token?: string;
    session?: { token?: string };
    user?: { name?: string };
    message?: string;
    code?: string;
  };
  if (!res.ok) {
    const msg = data.message || 'Credenciales incorrectas.';
    if (data.code === 'EMAIL_NOT_VERIFIED' || /verif/i.test(msg)) {
      throw new Error('EMAIL_NOT_VERIFIED');
    }
    throw new Error(msg);
  }

  const token = data.token || data.session?.token || '';
  if (!token) {
    throw new Error('No se recibió token de sesión desde Neon Auth.');
  }

  return syncWithBackend(token, cleanEmail, data.user?.name);
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<{ session?: AuthSession; needsEmailVerification: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const res = await fetch(`${AUTH_BASE_URL.replace(/\/+$/, '')}/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email: cleanEmail,
      password,
      callbackURL: window.location.origin,
    }),
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
    return { needsEmailVerification: true };
  }

  const session = await syncWithBackend(token, cleanEmail, name);
  return { session, needsEmailVerification: false };
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const res = await fetch(`${AUTH_BASE_URL.replace(/\/+$/, '')}/send-verification-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cleanEmail,
      callbackURL: window.location.origin,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || 'No se pudo reenviar el correo de verificación.');
  }
}

export async function signInWithGoogle(): Promise<void> {
  const res = await fetch(`${AUTH_BASE_URL.replace(/\/+$/, '')}/sign-in/social`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      provider: 'google',
      callbackURL: window.location.origin,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.message || 'Google OAuth no está habilitado aún en Neon Auth.');
  }
  window.location.href = data.url;
}

export async function checkOAuthSession(): Promise<AuthSession | null> {
  try {
    const url = new URL(window.location.href);
    const verifier = url.searchParams.get('neon_auth_session_verifier');
    const endpoint = new URL(`${AUTH_BASE_URL.replace(/\/+$/, '')}/get-session`);
    if (verifier) {
      endpoint.searchParams.set('neon_auth_session_verifier', verifier);
    }

    const res = await fetch(endpoint.toString(), {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      session?: { token?: string };
      user?: { email?: string; name?: string };
    };
    const token = data?.session?.token;
    const email = data?.user?.email;
    if (!token || !email) return null;

    if (verifier) {
      url.searchParams.delete('neon_auth_session_verifier');
      window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    }

    return syncWithBackend(token, email, data.user?.name);
  } catch {
    return null;
  }
}

export async function refreshAuthSession(): Promise<AuthSession | null> {
  const token = getStoredAuthToken();
  const email = getStoredEmail();
  if (!token) return null;
  try {
    return await syncWithBackend(token, email);
  } catch {
    return null;
  }
}
