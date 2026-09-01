import Cookies from 'js-cookie';
import { AUTH_TOKEN_KEY, getTokenExpiry, TOKEN_KEY, USER_KEY } from '@/constants';

// DEVELOPMENT-ONLY preview helper.
// With no backend running, the real login/register flow cannot persist a
// session, so protected admin pages would always bounce to /auth/login.
// In development only, when no valid session exists, this seeds a minimal
// admin session so the admin UI can be previewed. It is a no-op in
// production and never overrides an existing/valid session.

// A signed-looking JWT whose decoded payload carries a far-future `exp`,
// so `isTokenExpired()` treats it as valid (signature is not verified here).
const buildDevToken = (): string => {
  const payload = {
    sub: 'dev-admin',
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // ~1 year
  };
  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.dev-signature`;
};

export const ensureDevSession = (): void => {
  if (process.env.NODE_ENV !== 'development') return;
  if (typeof window === 'undefined') return;

  // Never clobber a session that is already present.
  if (localStorage.getItem(TOKEN_KEY)) return;

  const token = buildDevToken();
  const user = {
    id: 'dev-admin',
    username: 'admin',
    email: 'admin@local.dev',
    role: 'admin',
  };

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  Cookies.set(AUTH_TOKEN_KEY, token, { expires: getTokenExpiry(token) });
};
