import { useEffect, useRef, useState } from 'react';
import type { FormInstance } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';

interface UseDraftRestoreOptions {
  storageKey: string;
  form: FormInstance;
  message: MessageInstance;
  /** Applies the parsed retained values to the form on restore. */
  applyValues: (values: any) => void;
  /** Set to false while no draft should be offered (e.g. video edit mode). */
  enabled?: boolean;
  /** Extra work after a draft is restored (e.g. marking the form dirty). */
  onRestored?: () => void;
  /** Extra cleanup when a draft is discarded. */
  onDiscarded?: () => void;
}

// Shared "restore your previous draft?" flow used by the Video and FAQ create
// pages: reads the retained form JSON on mount (deferred to a microtask like
// the original pages), and exposes the restore/discard handlers plus the
// dialog open state for CreateContentLayout's restoreDraft slot.
export const useDraftRestore = (options: UseDraftRestoreOptions) => {
  const {
    storageKey,
    form,
    message,
    applyValues,
    enabled = true,
    onRestored,
    onDiscarded,
  } = options;
  const [restoreOpen, setRestoreOpen] = useState(false);
  const retainedDataRef = useRef<string | null>(null);

  const callbacksRef = useRef({ applyValues, onRestored, onDiscarded });
  useEffect(() => {
    callbacksRef.current = { applyValues, onRestored, onDiscarded };
  }, [applyValues, onRestored, onDiscarded]);

  useEffect(() => {
    if (!enabled) return;
    const retainedData = localStorage.getItem(storageKey);
    if (!retainedData) return;
    // Defer into a microtask so the setState is not called synchronously
    // within the effect body (avoids the React Compiler rule), while still
    // showing the restore prompt on first mount with the same behavior.
    queueMicrotask(() => {
      retainedDataRef.current = retainedData;
      setRestoreOpen(true);
    });
  }, [storageKey, enabled]);

  const confirmRestoreDraft = () => {
    if (retainedDataRef.current) {
      callbacksRef.current.applyValues(JSON.parse(retainedDataRef.current));
      retainedDataRef.current = null;
      callbacksRef.current.onRestored?.();
      message.info('Restored your previous unsaved progress.');
    }
    setRestoreOpen(false);
  };

  const confirmDiscardDraft = () => {
    localStorage.removeItem(storageKey);
    retainedDataRef.current = null;
    callbacksRef.current.onDiscarded?.();
    setRestoreOpen(false);
  };

  return { restoreOpen, confirmRestoreDraft, confirmDiscardDraft };
};