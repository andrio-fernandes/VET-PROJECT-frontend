// Shared "don't lose my work" navigation guard for create/edit pages.
// Blocks in-app navigation while the form is dirty and manages the
// leave-confirm dialog, pending navigation, and beforeunload flush.

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
  // Read-only so the page can build its "leave anyway" target.
  const pendingNavRef = useRef<string | null>(null);
  const confirmLeaveRef = useRef<(() => void) | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  // Latest callbacks via ref to avoid stale closures in event listeners.
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