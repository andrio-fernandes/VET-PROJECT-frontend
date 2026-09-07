import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Spin } from 'antd';

import { ROUTE_PATHS, isTokenExpired, TOKEN_KEY, USER_KEY } from '@/constants';
import { refreshSession } from '@/services/api';
import { ensureDevSession } from '@/utils/dev-session';

interface StoredUser {
  id?: string;
  username?: string;
  email?: string;
  role?: string;
}

const readAuth = () => {
  if (typeof window === 'undefined') {
    return { token: null as string | null, user: null as StoredUser | null };
  }

  const token = localStorage.getItem(TOKEN_KEY);

  let user: StoredUser | null = null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    user = raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    user = null;
  }

  return { token, user };
};

export const withAdminAuth = (WrappedComponent: React.ComponentType<any>) => {
  const RequiresAdmin = (props: any) => {
    const router = useRouter();
    // Undefined until checked on the client, so SSR/first paint never
    // flashes the protected content before the redirect - and shows a real
    // spinner instead of a blank page while the check + possible refresh
    // are in flight.
    const [allowed, setAllowed] = useState<boolean | undefined>(undefined);

    useEffect(() => {
      let cancelled = false;

      const decide = async () => {
        // Dev-only: seed a valid admin session when none exists (no backend).
        ensureDevSession();

        let { token, user } = readAuth();

        // An expired (but present) access token doesn't mean logged out: with
        // a valid refresh token the session can be silently renewed instead
        // of bouncing the user to login.
        if (!token || isTokenExpired(token)) {
          try {
            const fresh = await refreshSession();
            if (cancelled) return;
            if (!fresh) {
              setAllowed(false);
              router.replace(ROUTE_PATHS.login);
              return;
            }
            ({ token, user } = readAuth());
          } catch {
            if (cancelled) return;
            setAllowed(false);
            router.replace(ROUTE_PATHS.login);
            return;
          }
        }

        if (cancelled) return;

        // Missing or malformed tokens are treated as logged out, so a dead
        // session never renders and then fails on every API call.
        if (!token || user?.role !== 'admin') {
          setAllowed(false);
          router.replace(ROUTE_PATHS.userDashboard);
          return;
        }

        setAllowed(true);
      };

      decide();
      return () => {
        cancelled = true;
      };
    }, [router]);

    if (allowed === undefined) {
      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spin size="large" />
        </div>
      );
    }

    if (!allowed) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  return RequiresAdmin;
};