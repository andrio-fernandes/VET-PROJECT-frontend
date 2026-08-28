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
  /** When true the hook drives an edit form: draft autosave/restore is skipped
   * and existing server assets are seeded. */
  editMode?: boolean;
  /** Existing assets of the blog being edited (used only in editMode). */
  initialData?: {
    thumbnail?: { name: string; url: string } | null;
    attachments?: { name: string; url: string }[];
  };
}

export const useBlogDraft = ({
  getValues,
  reset,
  router,
  message,
  editMode = false,
  initialData,
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
    message,
    getThumbnail: assets.getThumbnail,
    getAttachments: assets.getAttachments,
    getThumbnailDataUrl: assets.getThumbnailDataUrl,
    restoreThumbnail: assets.restoreThumbnail,
    restoreAttachments: assets.restoreAttachments,
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

  const navigation = useBlogDraftNavigation({
    router,
    editMode,
    getValues,
    getThumbnailDataUrl: assets.getThumbnailDataUrl,
    getAttachments: assets.getAttachments,
    getHasUnsavedContent: persistence.getHasUnsavedContent,
    writeDraftToStorage: persistence.writeDraftToStorage,
    cancelPendingDraftSave: persistence.cancelPendingDraftSave,
    resetBlogForm,
  });

  return {
    loading,
    setLoading,
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
    performNavigation: navigation.performNavigation,
    handlePreview: navigation.handlePreview,
    requestNavigation: navigation.requestNavigation,
    draftPromptVisible: navigation.draftPromptVisible,
    handleSaveDraftNavigate: navigation.handleSaveDraftNavigate,
    handleDiscardNavigate: navigation.handleDiscardNavigate,
    handleStayOnPage: navigation.handleStayOnPage,
  };
};
