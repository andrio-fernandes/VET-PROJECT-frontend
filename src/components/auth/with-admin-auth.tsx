import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';

export const withAdminAuth = (WrappedComponent: React.ComponentType<any>) => {
  const RequiresAdmin = (props: any) => {
    const router = useRouter();
    const { isAuthenticated, userRole } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (userRole !== 'admin') {
        router.replace('/'); 
      }
    }, [isAuthenticated, userRole, router]);

    if (!isAuthenticated || userRole !== 'admin') {
      return null; 
    }

    return <WrappedComponent {...props} />;
  };

  return RequiresAdmin;
};