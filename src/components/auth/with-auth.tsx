import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Spin } from 'antd';

import { ROUTE_PATHS, isTokenExpired, TOKEN_KEY, USER_KEY } from '@/constants';
import { refreshSession } from '@/services/api';

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

export const withAuth = (WrappedComponent: React.ComponentType<any>) => {
  const RequiresAuth = (props: any) => {
    const router = useRouter();
    const [allowed, setAllowed] = useState<boolean | undefined>(undefined);

    useEffect(() => {
      let cancelled = false;

      const decide = async () => {
        let { token } = readAuth();

        if (!token || isTokenExpired(token)) {
          try {
            const fresh = await refreshSession();
            if (cancelled) return;
            if (!fresh) {
              setAllowed(false);
              router.replace(ROUTE_PATHS.login);
              return;
            }
            ({ token } = readAuth());
          } catch {
            if (cancelled) return;
            setAllowed(false);
            router.replace(ROUTE_PATHS.login);
            return;
          }
        }

        if (cancelled) return;

        if (!token) {
          setAllowed(false);
          router.replace(ROUTE_PATHS.login);
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

  return RequiresAuth;
};
