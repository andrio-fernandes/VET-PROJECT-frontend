import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import { ROUTE_PATHS, isTokenExpired, TOKEN_KEY, USER_KEY } from '@/utils/constant';

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
    // flashes the protected content before the redirect.
    const [allowed, setAllowed] = useState<boolean | undefined>(undefined);

    useEffect(() => {
      const { token, user } = readAuth();

      // Missing, expired, or malformed tokens are all treated as logged out,
      // so a dead session never renders and then fails on every API call.
      if (!token || isTokenExpired(token)) {
        setAllowed(false);
        router.replace(ROUTE_PATHS.login);
        return;
      }

      if (user?.role !== 'admin') {
        setAllowed(false);
        router.replace(ROUTE_PATHS.userDashboard);
        return;
      }

      setAllowed(true);
    }, [router]);

    if (!allowed) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  return RequiresAdmin;
};
