import { useEffect } from 'react';
import { usePageLoading } from '@/components/common/LoadingProvider';

// Mount-gate for the global loading screen: requests the shared loader while
// this component is mounted and releases it on unmount. Renders nothing.
const PageLoading = () => {
  const { show, hide } = usePageLoading();

  useEffect(() => {
    show();
    return () => {
      hide();
    };
  }, [show, hide]);

  return null;
};

export default PageLoading;