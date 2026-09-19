import { useCallback, useEffect, useRef, useState } from 'react';

const VIEWED_FLASH_MS = 10_000;

// Short-lived "just viewed" marker per item so the Viewed badge appears
// immediately, then hides after a few seconds. Server badges unaffected.
const useViewedFlash = () => {
  const [flashIds, setFlashIds] = useState<Set<string>>(() => new Set());
  const timers = useRef<Record<string, NodeJS.Timeout>>({});

  const flashView = useCallback((id: string) => {
    if (timers.current[id]) clearTimeout(timers.current[id]);
    setFlashIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    timers.current[id] = setTimeout(() => {
      delete timers.current[id];
      setFlashIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, VIEWED_FLASH_MS);
  }, []);

  useEffect(() => {
    const active = timers.current;
    return () => {
      Object.values(active).forEach((t) => clearTimeout(t));
    };
  }, []);

  return { flashIds, flashView };
};

export default useViewedFlash;