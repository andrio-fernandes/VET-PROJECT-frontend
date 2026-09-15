import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { updateLastSeen, type ContentType } from '@/services/libraryService';

const LAST_SEEN_DELAY_MS = 10_000; // 10 seconds

const useNewBadge = (type: ContentType, items: { _id?: string; key?: string; isNew?: boolean }[]) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTypeRef = useRef<ContentType>(type);
  const [clearedTypes, setClearedTypes] = useState<Set<ContentType>>(new Set());

  const newIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of items) {
      if (item.isNew) {
        ids.add(String(item._id ?? item.key));
      }
    }
    return ids;
  }, [items]);

  // Reset cleared state when type changes (tab switch)
  useEffect(() => {
    if (prevTypeRef.current !== type) {
      prevTypeRef.current = type;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [type]);

  const isCleared = clearedTypes.has(type);

  useEffect(() => {
    if (isCleared) return;
    if (newIds.size === 0) return;
    if (timerRef.current) return;

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
    };
  }, [type, newIds.size, isCleared]);

  const isNew = useCallback(
    (id: string) => !clearedTypes.has(type) && newIds.has(id),
    [newIds, clearedTypes, type]
  );

  return { isNew, newIds };
};

export default useNewBadge;
