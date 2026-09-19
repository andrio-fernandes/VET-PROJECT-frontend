// Handles navigation away from Create / Edit Blog form: in-app route-change
// guard with save/discard/stay prompt, flushing + navigating on save/discard,
// and hand-off to Blog Preview page. Skipped in edit mode.

import { useEffect, useRef, useState } from 'react';
import type { NextRouter } from 'next/router';
import type { MessageInstance } from 'antd/es/message/interface';

import { BLOG_PREVIEW_STORAGE_KEY, BLOG_EDIT_PREVIEW_STORAGE_KEY } from '@/constants/blog';
import { ROUTE_PATHS } from '@/constants';
import { fileToDataUrl } from '@/utils/file';
import { writePreviewValue } from '@/utils/blog-preview-storage';
import type { PickedAttachment, PickedImage } from '@/types/blog';
import type { BlogFormValues } from './use-blog-draft';
import type { BlogPreviewData } from '@/components/blog/blog-preview-modal';

interface UseBlogDraftNavigationOptions {
  router: NextRouter;
  message: MessageInstance;
  editMode?: boolean;
  /** Blog id being edited. Preserves edit URL across preview hop. */
  blogId?: string;
  getValues: () => BlogFormValues;
  getThumbnailDataUrl: () => string;
  getThumbnail: () => PickedImage | null;
  getAttachments: () => PickedAttachment[];
  getExistingThumbnail: () => { name: string; url: string } | null;
  getExistingAttachments: () => { name: string; url: string }[];
  /** URLs of existing server attachments the user removed (unsaved). */
  getRemovedAttachmentUrls: () => string[];
  getHasUnsavedContent: () => boolean;
  writeDraftToStorage: () => Promise<void>;
  cancelPendingDraftSave: () => void;
  /** Clears autosave timer, removes draft, resets RHF fields and asset state. */
  resetBlogForm: () => void;
}

export const useBlogDraftNavigation = ({
  router,
  message,
  editMode = false,
  blogId = '',
  getValues,
  getThumbnailDataUrl,
  getThumbnail,
  getAttachments,
  getExistingThumbnail,
  getExistingAttachments,
  getRemovedAttachmentUrls,
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

  const preparePreviewData = async (): Promise<BlogPreviewData | null> => {
    const values = getValues();

    // Thumbnail: picked file's data URL, falling back to server thumbnail.
    let thumbnailDataUrl = getThumbnailDataUrl();
    const thumbnail = getThumbnail();
    if (!thumbnailDataUrl && thumbnail) {
      try {
        thumbnailDataUrl = await fileToDataUrl(thumbnail.file);
      } catch {
        thumbnailDataUrl = '';
      }
    }
    const existingThumbnail = getExistingThumbnail();
    const previewThumbnail = thumbnailDataUrl || existingThumbnail?.url || null;

    // Attachments: keep existing server attachments as URLs, convert newly
    // picked ones to data URLs.
    const existingAttachments = getExistingAttachments();
    const attachments = getAttachments();
    let pickedDataUrls: { name: string; url: string }[] = [];
    try {
      pickedDataUrls = await Promise.all(
        attachments.map(async (a) => ({
          name: a.name,
          url: await fileToDataUrl(a.file),
        })),
      );
    } catch {
      /* fall back to names */
    }
    const previewAttachments = [
      ...existingAttachments.map((a) => ({ name: a.name, url: a.url })),
      ...pickedDataUrls,
    ];

    return {
      title: values.title ?? '',
      description: values.description ?? '',
      module: values.module ?? '',
      category: values.category ?? '',
      content: values.content ?? '',
      thumbnail: previewThumbnail,
      attachments: previewAttachments,
    };
  };

  const handlePreview = async () => {
    cancelPendingDraftSave();
    // Drafts only meaningful in create mode; editing blogs are loaded from
    // server, so don't write a partial draft there.
    if (!editMode) {
      await writeDraftToStorage();
    }

    const previewDraft = await preparePreviewData();
    if (!previewDraft) return;

    try {
      await writePreviewValue(BLOG_PREVIEW_STORAGE_KEY, previewDraft);
    } catch {
      message.error('Blog is too large to preview. Save the blog first, then preview again.');
      return;
    }

    // In edit mode, snapshot current form state so round-trip back to edit
    // URL can restore it instead of reverting to last-saved server values.
    // Captures remaining server attachments at preview time and removal
    // intent. createdAt lets edit page drop stale snapshots from earlier
    // sessions that could resurrect a "delete everything" wipe.
    if (editMode && blogId) {
      const values = getValues();
      let thumbnailDataUrl = getThumbnailDataUrl();
      const thumbnail = getThumbnail();
      if (!thumbnailDataUrl && thumbnail) {
        try {
          thumbnailDataUrl = await fileToDataUrl(thumbnail.file);
        } catch {
          thumbnailDataUrl = '';
        }
      }
      const existingAttachments = getExistingAttachments();
      const attachments = getAttachments();
      let pickedDataUrls: { name: string; url: string }[] = [];
      try {
        pickedDataUrls = await Promise.all(
          attachments.map(async (a) => ({
            name: a.name,
            url: await fileToDataUrl(a.file),
          })),
        );
      } catch {
        /* fall back to names */
      }

      const editSnapshot = {
        blogId,
        createdAt: Date.now(),
        title: values.title ?? '',
        description: values.description ?? '',
        module: values.module ?? '',
        category: values.category ?? '',
        content: values.content ?? '',
        thumbnail: thumbnail
          ? { source: 'picked', name: thumbnail.name, dataUrl: thumbnailDataUrl }
          : null,
        attachments: pickedDataUrls,
        existingAttachments: existingAttachments.map((a) => ({
          name: a.name,
          url: a.url,
        })),
        // Preserve removal intent so round-trip back to edit page keeps
        // attachment-sensitive edits instead of resurrecting from server list.
        removedAttachmentUrls: getRemovedAttachmentUrls(),
      };
      try {
        await writePreviewValue(BLOG_EDIT_PREVIEW_STORAGE_KEY, editSnapshot);
      } catch {
        message.warning('Preview opened, but your unsaved changes could not be restored when you return.');
      }
    }

    skipNextRouteGuardRef.current = true;
    const blogQuery = editMode && blogId ? `&id=${blogId}` : '';
    window.open(`${ROUTE_PATHS.blogPreview}?preview=1${blogQuery}`, '_blank');
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

  // Block in-app route changes (browser back etc.) while form has unsaved
  // content and ask what to do with draft first. Skipped in edit mode.
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
      // Aborts in-flight Next.js navigation so draft dialog decides.
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
    preparePreviewData,
    handlePreview,
    performNavigation,
    requestNavigation,
    handleSaveDraftNavigate,
    handleDiscardNavigate,
    handleStayOnPage,
  };
};
