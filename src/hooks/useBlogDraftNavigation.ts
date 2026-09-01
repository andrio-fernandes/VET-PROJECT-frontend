// =============================================
// USE BLOG DRAFT NAVIGATION
//
// Handles all navigation away from the Create / Edit Blog form: the in-app
// route-change guard with a save/discard/stay prompt (browser back, sidebar
// links), flushing + navigating on save/discard, and the hand-off to the Blog
// Preview page. Skipped entirely in edit mode.
// =============================================

import { useRef, useState } from 'react';
import { useEffect } from 'react';
import type { NextRouter } from 'next/router';

import { BLOG_PREVIEW_STORAGE_KEY } from '@/constants/blog';
import { ROUTE_PATHS } from '@/constants';
import { fileToDataUrl } from '@/utils/file';
import type { PickedAttachment } from '@/types/blog';
import type { BlogFormValues } from './useBlogDraft';

interface UseBlogDraftNavigationOptions {
  router: NextRouter;
  editMode?: boolean;
  getValues: () => BlogFormValues;
  getThumbnailDataUrl: () => string;
  getAttachments: () => PickedAttachment[];
  getHasUnsavedContent: () => boolean;
  writeDraftToStorage: () => Promise<void>;
  cancelPendingDraftSave: () => void;
  /** Clears autosave timer, removes the draft, resets RHF fields and asset state. */
  resetBlogForm: () => void;
}

export const useBlogDraftNavigation = ({
  router,
  editMode = false,
  getValues,
  getThumbnailDataUrl,
  getAttachments,
  getHasUnsavedContent,
  writeDraftToStorage,
  cancelPendingDraftSave,
  resetBlogForm,
}: UseBlogDraftNavigationOptions) => {
  const [draftPromptVisible, setDraftPromptVisible] = useState(false);
  const pendingNavPathRef = useRef<string | null>(null);
  const skipNextRouteGuardRef = useRef(false);

  const performNavigation = (path: string) => {
    skipNextRouteGuardRef.current = true;
    router.push(path);
  };

  const handlePreview = async () => {
    cancelPendingDraftSave();
    await writeDraftToStorage();
    const values = getValues();
    const thumbnailDataUrl = getThumbnailDataUrl();
    const attachments = getAttachments();
    let attachmentDataUrls: { name: string; dataUrl: string }[] = [];
    try {
      attachmentDataUrls = await Promise.all(
        attachments.map(async (a) => ({
          name: a.name,
          dataUrl: await fileToDataUrl(a.file),
        })),
      );
    } catch {
      /* fall back to names */
    }
    const previewDraft = {
      title: values.title ?? '',
      description: values.description ?? '',
      module: values.module ?? '',
      category: values.category ?? '',
      content: values.content ?? '',
      thumbnail: thumbnailDataUrl || null,
      attachments: attachmentDataUrls.length ? attachmentDataUrls : attachments.map((a) => a.name),
    };
    try {
      localStorage.setItem(BLOG_PREVIEW_STORAGE_KEY, JSON.stringify(previewDraft));
    } catch {
      /* storage unavailable */
    }
    skipNextRouteGuardRef.current = true;
    router.push(`${ROUTE_PATHS.blogPreview}?preview=1`);
  };

  const requestNavigation = (path: string) => {
    if (!getHasUnsavedContent()) {
      performNavigation(path);
      return;
    }
    pendingNavPathRef.current = path;
    setDraftPromptVisible(true);
  };

  const handleSaveDraftNavigate = async () => {
    await writeDraftToStorage();
    const target = pendingNavPathRef.current ?? ROUTE_PATHS.adminDashboard;
    pendingNavPathRef.current = null;
    setDraftPromptVisible(false);
    performNavigation(target);
  };

  const handleDiscardNavigate = () => {
    resetBlogForm();
    const target = pendingNavPathRef.current ?? ROUTE_PATHS.adminDashboard;
    pendingNavPathRef.current = null;
    setDraftPromptVisible(false);
    performNavigation(target);
  };

  const handleStayOnPage = () => {
    pendingNavPathRef.current = null;
    setDraftPromptVisible(false);
  };

  // Block in-app route changes (browser back button etc.) while the form has
  // unsaved content and ask what to do with the draft first. Skipped in edit
  // mode.
  useEffect(() => {
    if (editMode) return;
    const handleRouteChangeComplete = () => {
      skipNextRouteGuardRef.current = false;
    };

    const handleRouteChangeStart = (url: string) => {
      if (skipNextRouteGuardRef.current || !getHasUnsavedContent()) return;

      pendingNavPathRef.current = url;
      setDraftPromptVisible(true);

      router.events.emit('routeChangeError');
      // Aborts the in-flight Next.js navigation so the draft dialog decides.
      throw new Error('routeChangeAbortedByBlogDraftGuard');
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, editMode]);

  return {
    draftPromptVisible,
    handlePreview,
    performNavigation,
    requestNavigation,
    handleSaveDraftNavigate,
    handleDiscardNavigate,
    handleStayOnPage,
  };
};
