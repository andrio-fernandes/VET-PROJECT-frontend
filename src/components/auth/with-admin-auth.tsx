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
    // Undefined until client check completes — avoids flashing protected
    // content during SSR and shows a spinner while the session is verified.
    const [allowed, setAllowed] = useState<boolean | undefined>(undefined);

    useEffect(() => {
      let cancelled = false;

      const decide = async () => {
        // Dev-only: seed a valid admin session when none exists.
        ensureDevSession();

        let { token, user } = readAuth();

        // An expired access token can be silently renewed via refresh token.
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

        // Missing/malformed tokens or non-admin role → redirect to dashboard.
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