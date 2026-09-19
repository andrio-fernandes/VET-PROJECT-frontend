// Composes the full draft lifecycle of the Create Blog form. Individual
// concerns live in specialised hooks:
//   - useBlogAssets           thumbnail + attachment selection state
//   - useBlogDraftPersistence localStorage autosave / restore / flush
//   - useBlogDraftNavigation  route-change guard + preview hand-off
// Receives getValues/reset from the page's React Hook Form instance.

import { useEffect, useRef, useState } from 'react';
import type { NextRouter } from 'next/router';
import type { MessageInstance } from 'antd/es/message/interface';

import { useBlogAssets } from './use-blog-assets';
import { useBlogDraftPersistence } from './use-blog-draft-persistence';
import { useBlogDraftNavigation } from './use-blog-draft-navigation';
import { BLOG_EDIT_PREVIEW_STORAGE_KEY } from '@/constants/blog';
import {
  readPreviewValue,
  removePreviewValue,
} from '@/utils/blog-preview-storage';
import { dataUrlToFile } from '@/utils/file';

// Snapshots older than this are stale leftovers from an earlier session that
// never went through preview-return. Dropped to prevent wiping server
// attachments.
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
  /** Whether the router has hydrated its query. Draft restoration is only
   * safe once we know if the route is create or edit. */
  isReady?: boolean;
  /** Blog id being edited (edit mode). Preserves edit URL across preview. */
  blogId?: string;
  /** When true the hook drives an edit form: draft autosave/restore is
   * skipped and existing server assets are seeded. */
  editMode?: boolean;
  /** Existing assets of the blog being edited (used only in editMode). */
  initialData?: {
    thumbnail?: { name: string; url: string } | null;
    attachments?: { name: string; url: string }[];
  };
  /** Originally-loaded server text values (edit mode). Baseline so
   * "unsaved content" means user actually changed something. */
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

  // Filled with persistence scheduleDraftSave after both child hooks are
  // created, so asset handlers can trigger draft autosave without circular
  // dependency.
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

  // Wire up draft autosave trigger now that persistence is available. Filled
  // in an effect (not during render) so asset handlers always resolve to
  // current scheduleDraftSave.
  useEffect(() => {
    scheduleDraftSaveRef.current = persistence.scheduleDraftSave;
  }, [persistence]);

  // Clears autosave timer, removes draft, resets RHF fields and picked
  // asset state.
  const resetBlogForm = () => {
    persistence.resetDraftStorage();
    reset(DEFAULT_FORM_VALUES);
    assets.resetPickedAssets();
  };

  // Restores current (possibly unsaved) form state captured when previewing
  // in edit mode. Called after server data is seeded so unsaved text +
  // freshly picked assets survive the preview round-trip.
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

    // Only apply recent snapshots. Stale snapshots from earlier sessions
    // must not re-delete attachments the user decided to keep; the
    // freshly-fetched server list seeded by the page is authoritative.
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

    // Seed form from exact remaining server-list + removal intent from
    // preview time (idempotent, immune to duplicate/mismatched names).
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
