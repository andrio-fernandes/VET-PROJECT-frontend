import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PageLoadingScreen from '@/components/common/page-loading-screen';

// Fade-out duration when the last requester hides the loader.
const HIDE_FADE_MS = 150;

interface PageLoadingContextValue {
  show: () => void;
  hide: () => void;
}

const PageLoadingContext = createContext<PageLoadingContextValue | null>(null);

// Global loading screen. A reference count keeps it visible until every
// requester calls hide(). Overlapping requests merge into one loader.
const PageLoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const [active, setActive] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const count = useRef(0);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFadeTimer = useCallback(() => {
    if (fadeTimer.current !== null) {
      clearTimeout(fadeTimer.current);
      fadeTimer.current = null;
    }
  }, []);

  const show = useCallback(() => {
    count.current += 1;
    clearFadeTimer();
    setLeaving(false);
    setActive(true);
  }, [clearFadeTimer]);

  const hide = useCallback(() => {
    count.current = Math.max(0, count.current - 1);
    if (count.current !== 0) return;

    setLeaving(true);
    if (fadeTimer.current === null) {
      fadeTimer.current = setTimeout(() => {
        fadeTimer.current = null;
        setActive(false);
        setLeaving(false);
      }, HIDE_FADE_MS);
    }
  }, []);

  useEffect(() => () => clearFadeTimer(), [clearFadeTimer]);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <PageLoadingContext.Provider value={value}>
      {children}
      {active && <PageLoadingScreen leaving={leaving} />}
    </PageLoadingContext.Provider>
  );
};

const usePageLoading = () => {
  const context = useContext(PageLoadingContext);
  if (!context) {
    throw new Error('usePageLoading must be used inside <PageLoadingProvider>');
  }
  return context;
};

export { PageLoadingProvider, usePageLoading };