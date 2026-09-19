import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { updateLastSeen, type ContentType } from '@/services/libraryService';

const LAST_SEEN_DELAY_MS = 15_000; // 15 seconds total
const FADE_DELAY_MS = 13_000; // start fading 2 seconds before removal

const useNewBadge = (type: ContentType, items: { _id?: string; key?: string; isNew?: boolean }[]) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTypeRef = useRef<ContentType>(type);
  const [clearedTypes, setClearedTypes] = useState<Set<ContentType>>(new Set());
  const [fadingTypes, setFadingTypes] = useState<Set<ContentType>>(new Set());

  const newIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of items) {
      if (item.isNew) {
        ids.add(String(item._id ?? item.key));
      }
    }
    return ids;
  }, [items]);

  // Reset cleared/fading state when type changes (tab switch)
  useEffect(() => {
    if (prevTypeRef.current !== type) {
      prevTypeRef.current = type;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    }
  }, [type]);

  const isCleared = clearedTypes.has(type);

  useEffect(() => {
    if (isCleared) return;
    if (newIds.size === 0) return;
    if (timerRef.current) return;

    fadeTimerRef.current = setTimeout(() => {
      setFadingTypes((prev) => new Set(prev).add(type));
      fadeTimerRef.current = null;
    }, FADE_DELAY_MS);

    timerRef.current = setTimeout(() => {
      updateLastSeen(type).catch(() => {});
      timerRef.current = null;
      setClearedTypes((prev) => new Set(prev).add(type));
    }, LAST_SEEN_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, [type, newIds.size, isCleared]);

  const isNew = useCallback(
    (id: string) => !clearedTypes.has(type) && newIds.has(id),
    [newIds, clearedTypes, type]
  );

  const isFading = fadingTypes.has(type);

  return { isNew, newIds, isFading };
};

export default useNewBadge;
