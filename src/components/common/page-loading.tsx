import { useEffect } from 'react';
import { usePageLoading } from '@/components/common/loading-provider';

// Mount-gate for the global loading screen. Renders nothing.
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