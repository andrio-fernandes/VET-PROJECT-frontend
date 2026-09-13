import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PageLoadingScreen from '@/components/common/PageLoadingScreen';

// Length of the fade-out used when the last requester hides the loader. Pure
// visual smoothing: the loader is removed as soon as the work is done, with no
// artificial hold and no extra perceived delay.
const HIDE_FADE_MS = 150;

interface PageLoadingContextValue {
  show: () => void;
  hide: () => void;
}

const PageLoadingContext = createContext<PageLoadingContextValue | null>(null);

// Single global loading screen. Every feature (route changes, the first-load
// splash, the withAuth session check, auth page submits) requests it through
// show()/hide(); a counter keeps it visible until every requester is done.
// Hiding begins immediately once the counter hits zero; overlapping requesters
// (navigation + auth check + data fetch) merge into one smooth loader.
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