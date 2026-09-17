// =============================================
// USE BLOG DRAFT
//
// Composes the full draft lifecycle of the Create Blog form. The individual
// concerns live in specialised hooks / helpers:
//   - useBlogAssets        thumbnail + attachment selection state
//   - useBlogDraftPersistence  localStorage autosave / restore / flush
//   - useBlogDraftNavigation   route-change guard + preview hand-off
//
// The React Hook Form instance stays in the page; this hook receives its
// getValues/reset so it can read and restore the form without owning it.
// =============================================

import { useEffect, useRef, useState } from 'react';
import type { NextRouter } from 'next/router';
import type { MessageInstance } from 'antd/es/message/interface';

import { useBlogAssets } from './useBlogAssets';
import { useBlogDraftPersistence } from './useBlogDraftPersistence';
import { useBlogDraftNavigation } from './useBlogDraftNavigation';
import { BLOG_EDIT_PREVIEW_STORAGE_KEY } from '@/constants/blog';
import {
  readPreviewValue,
  removePreviewValue,
} from '@/utils/blogPreviewStorage';
import { dataUrlToFile } from '@/utils/file';

// Round-trip snapshots older than this are treated as stale leftovers from an
// earlier session that never went through the preview-return flow. They are
// dropped so they can never wipe attachments the server still has.
const EDIT_PREVIEW_SNAPSHOT_MAX_AGE_MS = 30 * 60 * 1000;

export interface BlogFormValues {
  title: string;
  description: string;
  module: string;
  category: string;
  content?: string;
}

export const DEFAULT_FORM_VALUES: BlogFormValues = {
  title: '',
  description: '',
  module: '',
  category: '',
  content: '',
};

interface UseBlogDraftOptions {
  getValues: () => BlogFormValues;
  reset: (values: BlogFormValues) => void;
  router: NextRouter;
  message: MessageInstance;
  /** Whether the router has hydrated its query. Draft restoration is only safe
   * once we know whether the route is a create or an edit URL. */
  isReady?: boolean;
  /** The id of the blog being edited (edit mode only), used to preserve the
   * edit URL across the preview round-trip. */
  blogId?: string;
  /** When true the hook drives an edit form: draft autosave/restore is skipped
   * and existing server assets are seeded. */
  editMode?: boolean;
  /** Existing assets of the blog being edited (used only in editMode). */
  initialData?: {
    thumbnail?: { name: string; url: string } | null;
    attachments?: { name: string; url: string }[];
  };
  /** Originally-loaded server text values (edit mode only). Baseline used so
   * "unsaved content" means the user actually changed something. */
  baseline?: Partial<BlogFormValues>;
}

export const useBlogDraft = ({
  getValues,
  reset,
  router,
  message,
  isReady = false,
  blogId = '',
  editMode = false,
  initialData,
  baseline = {},
}: UseBlogDraftOptions) => {
  const [loading, setLoading] = useState(false);

  // Filled with the persistence scheduleDraftSave after both child hooks are
  // created, so asset handlers can trigger draft autosave without a circular
  // dependency between the assets and persistence hooks.
  const scheduleDraftSaveRef = useRef<() => void>(() => {});

  const assets = useBlogAssets({
    message,
    editMode,
    initialData,
    scheduleDraftSaveRef,
  });

  const persistence = useBlogDraftPersistence({
    getValues,
    reset,
    editMode,
    isReady,
    message,
    getThumbnail: assets.getThumbnail,
    getAttachments: assets.getAttachments,
    getThumbnailDataUrl: assets.getThumbnailDataUrl,
    restoreThumbnail: assets.restoreThumbnail,
    restoreAttachments: assets.restoreAttachments,
    getRemovedAttachmentUrls: assets.getRemovedAttachmentUrls,
    baseline,
  });

  // Wire up the draft autosave trigger now that persistence is available. Filled
  // in an effect (not during render) so the asset handlers, which only run on
  // user interaction, always resolve to the current scheduleDraftSave.
  useEffect(() => {
    scheduleDraftSaveRef.current = persistence.scheduleDraftSave;
  }, [persistence]);

  // Clears autosave timer, removes the draft, resets RHF fields and the picked
  // (non-existing) asset state.
  const resetBlogForm = () => {
    persistence.resetDraftStorage();
    reset(DEFAULT_FORM_VALUES);
    assets.resetPickedAssets();
  };

  // Restores the current (possibly unsaved) form state captured when previewing
  // in edit mode. Called by the page right after the server data is seeded so
  // unsaved text + freshly picked assets survive the preview round-trip.
  const restoreEditRoundTrip = async (targetBlogId: string) => {
    if (!targetBlogId) return;
    let snapshot: any;
    try {
      snapshot = await readPreviewValue(BLOG_EDIT_PREVIEW_STORAGE_KEY);
    } catch {
      return;
    }
    if (!snapshot) return;
    try {
      await removePreviewValue(BLOG_EDIT_PREVIEW_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (snapshot.blogId !== targetBlogId) return;

    // Only apply recent snapshots. A stale snapshot left behind by an earlier
    // session that never returned through the edit URL must not re-delete
    // attachments the user has since decided to keep; the freshly-fetched
    // server list seeded by the page is authoritative in that case.
    if (
      typeof snapshot.createdAt !== 'number' ||
      Date.now() - snapshot.createdAt > EDIT_PREVIEW_SNAPSHOT_MAX_AGE_MS
    ) {
      return;
    }

    reset({
      title: snapshot.title ?? '',
      description: snapshot.description ?? '',
      module: snapshot.module ?? '',
      category: snapshot.category ?? '',
      content: snapshot.content ?? '',
    });

    if (snapshot.thumbnail && snapshot.thumbnail.source === 'picked' && snapshot.thumbnail.dataUrl) {
      const file = await dataUrlToFile(
        snapshot.thumbnail.dataUrl,
        snapshot.thumbnail.name || 'thumbnail.png'
      );
      if (file) assets.restoreThumbnail(file, snapshot.thumbnail.dataUrl);
    }

    if (Array.isArray(snapshot.attachments) && snapshot.attachments.length) {
      const picked: { file: File; name: string }[] = [];
      for (const att of snapshot.attachments) {
        if (att && att.url) {
          const file = await dataUrlToFile(att.url, att.name || 'attachment');
          if (file) picked.push({ file, name: att.name || file.name });
        }
      }
      if (picked.length) assets.restoreAttachments(picked);
    }

    // Seed the form from the exact remaining server-list + removal intent the
    // user had when previewing, instead of re-filtering the freshly-fetched
    // server list by display name (idempotent, and immune to duplicate or
    // mismatched names across the round-trip).
    assets.applyRoundTripState({
      existingAttachments: snapshot.existingAttachments,
      removedAttachmentUrls: snapshot.removedAttachmentUrls,
    });
  };

  const navigation = useBlogDraftNavigation({
    router,
    message,
    editMode,
    blogId,
    getValues,
    getThumbnailDataUrl: assets.getThumbnailDataUrl,
    getThumbnail: assets.getThumbnail,
    getAttachments: assets.getAttachments,
    getExistingThumbnail: assets.getExistingThumbnail,
    getExistingAttachments: assets.getExistingAttachments,
    getRemovedAttachmentUrls: assets.getRemovedAttachmentUrls,
    getHasUnsavedContent: persistence.getHasUnsavedContent,
    writeDraftToStorage: persistence.writeDraftToStorage,
    cancelPendingDraftSave: persistence.cancelPendingDraftSave,
    resetBlogForm,
  });

  return {
    loading,
    setLoading,
    draftAvailable: persistence.draftAvailable,
    confirmRestoreDraft: persistence.confirmRestoreDraft,
    confirmDiscardDraft: persistence.confirmDiscardDraft,
    thumbnail: assets.thumbnail,
    thumbnailError: assets.thumbnailError,
    setThumbnailError: assets.setThumbnailError,
    handleThumbnailChange: assets.handleThumbnailChange,
    handleThumbnailRemove: assets.handleThumbnailRemove,
    attachments: assets.attachments,
    attachmentError: assets.attachmentError,
    handleAttachmentChange: assets.handleAttachmentChange,
    handleAttachmentRemove: assets.handleAttachmentRemove,
    existingThumbnail: assets.existingThumbnail,
    existingAttachments: assets.existingAttachments,
    removeAttachmentUrls: assets.removeAttachmentUrls,
    handleExistingAttachmentRemove: assets.handleExistingAttachmentRemove,
    resetEditState: assets.resetEditState,
    scheduleDraftSave: persistence.scheduleDraftSave,
    resetBlogForm,
    restoreEditRoundTrip,
    performNavigation: navigation.performNavigation,
    preparePreviewData: navigation.preparePreviewData,
    handlePreview: navigation.handlePreview,
    requestNavigation: navigation.requestNavigation,
    draftPromptVisible: navigation.draftPromptVisible,
    handleSaveDraftNavigate: navigation.handleSaveDraftNavigate,
    handleDiscardNavigate: navigation.handleDiscardNavigate,
    handleStayOnPage: navigation.handleStayOnPage,
  };
};
