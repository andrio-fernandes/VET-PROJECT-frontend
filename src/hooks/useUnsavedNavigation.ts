// =============================================
// USE UNSAVED NAVIGATION
//
// Shared "don't lose my work" navigation plumbing for the Video, FAQ and Blog
// create/edit pages:
//   - in-app route guard (browser back, sidebar links) that blocks navigation
//     while the form is dirty and opens the leave-confirm dialog,
//   - the pending navigation target + the leave-callback registry,
//   - the leave-confirm modal open state,
//   - the beforeunload flush / browser-native leave prompt on refresh or close.
//
// The page owns its data (isDirty, loading, editMode), the confirm handlers
// and any draft persistence; this hook only wires the shared plumbing. The
// Blog flow additionally keeps its own useBlogDraftNavigation for the
// save/discard/stay draft prompt and the preview hand-off.
// =============================================

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NextRouter } from 'next/router';

interface UseUnsavedNavigationOptions {
  router: NextRouter;
  /** Whether the form currently has unsaved content. */
  isDirty: boolean;
  /** True while a submit/upload is running (Video). When a navigation is
   * attempted during this window, onBlockedDuringUpload is invoked instead of
   * the leave-confirm dialog. */
  loading?: boolean;
  /** Skip the guard entirely (edit forms restoring from the server). */
  skipGuard?: boolean;
  /** Opens a different "upload in progress" dialog (Video only). */
  onBlockedDuringUpload?: () => void;
  /** Runs on refresh/close when the form is dirty (before the browser's own
   * leave prompt). Used by Video to flush the draft to localStorage. */
  beforeUnloadFlush?: () => void;
}

export const useUnsavedNavigation = ({
  router,
  isDirty,
  loading = false,
  skipGuard = false,
  onBlockedDuringUpload,
  beforeUnloadFlush,
}: UseUnsavedNavigationOptions) => {
  const skipNavConfirmRef = useRef(false);
  // Exposed read-only so the page can build its "leave anyway" target when the
  // guard blocks navigation during upload (Video). Writes go through the
  // functions below.
  const pendingNavRef = useRef<string | null>(null);
  const confirmLeaveRef = useRef<(() => void) | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  // Latest callbacks, read through a ref so the event listeners and effects
  // never hold stale closures. Updated in an effect (not during render).
  const callbacksRef = useRef({ onBlockedDuringUpload, beforeUnloadFlush });
  useEffect(() => {
    callbacksRef.current = { onBlockedDuringUpload, beforeUnloadFlush };
  }, [onBlockedDuringUpload, beforeUnloadFlush]);

  const openLeaveConfirm = useCallback((onLeave: () => void) => {
    confirmLeaveRef.current = onLeave;
    setLeaveConfirmOpen(true);
  }, []);

  const dismissLeaveConfirm = useCallback(() => {
    confirmLeaveRef.current = null;
    setLeaveConfirmOpen(false);
  }, []);

  const runPendingLeave = useCallback(() => {
    const onLeave = confirmLeaveRef.current;
    confirmLeaveRef.current = null;
    pendingNavRef.current = null;
    setLeaveConfirmOpen(false);
    onLeave?.();
  }, []);

  /** Tells the guard to allow the next navigation (e.g. right after submit). */
  const skipNextNavigation = useCallback(() => {
    skipNavConfirmRef.current = true;
  }, []);

  /** Clears the remembered navigation target (e.g. after staying on upload). */
  const clearPendingNavigation = useCallback(() => {
    pendingNavRef.current = null;
  }, []);

  useEffect(() => {
    if (skipGuard) return;

    const handleRouteChange = (url: string) => {
      if (skipNavConfirmRef.current) return;
      if (loading) {
        pendingNavRef.current = url;
        callbacksRef.current.onBlockedDuringUpload?.();
        router.events.emit('routeChangeError');
        throw 'Navigation cancelled';
      }
      if (!isDirty) return;
      pendingNavRef.current = url;
      openLeaveConfirm(() => {
        pendingNavRef.current = null;
        router.push(url);
      });
      router.events.emit('routeChangeError');
      throw 'Navigation cancelled';
    };

    const handleRouteChangeError = (err: any) => {
      if (err !== 'Navigation cancelled') throw err;
    };

    const handleRouteChangeComplete = () => {
      skipNavConfirmRef.current = false;
    };

    router.events.on('routeChangeStart', handleRouteChange);
    router.events.on('routeChangeError', handleRouteChangeError);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      router.events.off('routeChangeError', handleRouteChangeError);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [isDirty, loading, router, openLeaveConfirm, skipGuard]);

  useEffect(() => {
    if (skipGuard) return;

    const handler = (e: BeforeUnloadEvent) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = '';
        return;
      }
      if (!isDirty) return;
      callbacksRef.current.beforeUnloadFlush?.();
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, loading, skipGuard]);

  return {
    pendingNavRef,
    confirmLeaveRef,
    leaveConfirmOpen,
    openLeaveConfirm,
    dismissLeaveConfirm,
    runPendingLeave,
    skipNextNavigation,
    clearPendingNavigation,
  };
};