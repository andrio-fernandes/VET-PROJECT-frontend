import { useCallback, useState } from 'react';

// Per-table expand/collapse state for 2-line clamped table cells. Each hook
// instance owns one table's keys, so multiple tables on the same page never
// interfere with each other.
export const useClampedRows = () => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const isExpanded = useCallback(
    (key: string) => expandedKeys.has(key),
    [expandedKeys]
  );

  const toggle = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return { isExpanded, toggle };
};