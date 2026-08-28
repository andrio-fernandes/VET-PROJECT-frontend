// =============================================
// USE BLOG DRAFT PERSISTENCE
//
// Handles the localStorage draft lifecycle of the Create Blog form: debounced
// autosave, restore on mount, and beforeunload / pagehide flushing. Skipped
// entirely in edit mode. Also decides whether there is any unsaved content.
//
// The hook does not own the form or the asset state; it receives getters so it
// can read the current values without triggering re-renders of the page.
// =============================================

import { useCallback, useEffect, useRef } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';

import {
  BLOG_DRAFT_STORAGE_KEY,
  DRAFT_AUTOSAVE_DEBOUNCE_MS,
} from '@/constants/blog';
import { dataUrlToFile, fileToDataUrl } from '@/utils/file';
import { stripHtmlTags } from '@/utils/richText';
import type { BlogDraft, BlogDraftValues, PickedAttachment, PickedImage } from '@/types/blog';
import type { BlogFormValues } from './useBlogDraft';

const readDraftFromStorage = (): BlogDraft | null => {
  try {
    const raw = localStorage.getItem(BLOG_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BlogDraft;
    return parsed && parsed.values ? parsed : null;
  } catch {
    return null;
  }
};

const removeDraftFromStorage = () => {
  try {
    localStorage.removeItem(BLOG_DRAFT_STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
};

interface UseBlogDraftPersistenceOptions {
  getValues: () => BlogFormValues;
  reset: (values: BlogFormValues) => void;
  editMode?: boolean;
  message: MessageInstance;
  getThumbnail: () => PickedImage | null;
  getAttachments: () => PickedAttachment[];
  getThumbnailDataUrl: () => string;
  restoreThumbnail: (file: File, dataUrl: string) => void;
  restoreAttachments: (files: { file: File; name: string }[]) => void;
}

export const useBlogDraftPersistence = ({
  getValues,
  reset,
  editMode = false,
  message,
  getThumbnail,
  getAttachments,
  getThumbnailDataUrl,
  restoreThumbnail,
  restoreAttachments,
}: UseBlogDraftPersistenceOptions) => {
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasUnsavedContent = useCallback(() => {
    const values: BlogDraftValues = getValues();
    const hasText = [values.title, values.description].some(
      (entry) => Boolean(entry && entry.trim())
    );
    const hasSelection = Boolean(values.module || values.category);
    const hasBody = stripHtmlTags(values.content).length > 0;
    return hasText || hasSelection || hasBody || Boolean(getThumbnail()) || getAttachments().length > 0;
  }, [getValues, getThumbnail, getAttachments]);

  const hasUnsavedContentRef = useRef(hasUnsavedContent);
  useEffect(() => {
    hasUnsavedContentRef.current = hasUnsavedContent;
  }, [hasUnsavedContent]);

  const writeDraftToStorage = async () => {
    if (!hasUnsavedContentRef.current()) {
      removeDraftFromStorage();
      return;
    }

    const values: BlogDraftValues = getValues();
    const thumbnail = getThumbnail();
    const attachments = getAttachments();
    const thumbnailDataUrl = getThumbnailDataUrl();
    const draft: BlogDraft = {
      version: 1,
      savedAt: new Date().toISOString(),
      values: {
        title: values.title ?? '',
        description: values.description ?? '',
        module: values.module ?? '',
        category: values.category ?? '',
        content: values.content ?? '',
      },
      thumbnail: thumbnailDataUrl ? { name: thumbnail?.name ?? '', dataUrl: thumbnailDataUrl } : null,
      attachments: await Promise.all(
        attachments.map(async (att) => ({
          name: att.name,
          dataUrl: await fileToDataUrl(att.file),
        }))
      ),
    };

    try {
      localStorage.setItem(BLOG_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Storage quota exceeded - retry without the heavy thumbnail data URL
      // so at least the entered text is preserved.
      try {
        localStorage.setItem(BLOG_DRAFT_STORAGE_KEY, JSON.stringify({ ...draft, thumbnail: null }));
      } catch {
        /* draft cannot be persisted */
      }
    }
  };

  const scheduleDraftSave = () => {
    if (editMode) return;
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      draftSaveTimerRef.current = null;
      void writeDraftToStorage();
    }, DRAFT_AUTOSAVE_DEBOUNCE_MS);
  };

  const cancelPendingDraftSave = () => {
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;
    }
  };

  // Clears the pending autosave timer and removes the persisted draft. The
  // RHF reset and cleared asset state are handled by the caller.
  const resetDraftStorage = () => {
    cancelPendingDraftSave();
    removeDraftFromStorage();
  };

  // Restore a previously saved draft (if any) once when the page opens.
  // Skipped entirely in edit mode - the form is seeded from the server blog.
  useEffect(() => {
    if (editMode) return;
    let cancelled = false;

    const restoreDraft = async () => {
      const draft = readDraftFromStorage();
      if (!draft?.values) return;

      const draftValues = draft.values as any;
      const { title = '', description = '', module: moduleName = '', content = '' } = draftValues;
      // Tolerate drafts saved before the rename of `feature` -> `category`.
      const category = draftValues.category ?? draftValues.feature ?? '';
      if (![title, description, moduleName, category, content].some((entry) => entry && entry.trim())) {
        removeDraftFromStorage();
        return;
      }

      reset({ title, description, module: moduleName, category, content });

      if (draft.thumbnail?.dataUrl) {
        const restoredFile = await dataUrlToFile(
          draft.thumbnail.dataUrl,
          draft.thumbnail.name || 'thumbnail.png'
        );
        if (!cancelled && restoredFile) {
          restoreThumbnail(restoredFile, draft.thumbnail.dataUrl);
        }
      }

      if (!cancelled && draft.attachments?.length) {
        const restored = await Promise.all(
          draft.attachments.map(async (att) => {
            const file = await dataUrlToFile(att.dataUrl, att.name);
            return file ? { file, name: att.name } : null;
          })
        );
        const valid = restored.filter(Boolean) as { file: File; name: string }[];
        if (!cancelled && valid.length) {
          restoreAttachments(valid);
        }
      }

      if (!cancelled) message.success('Draft restored');
    };

    restoreDraft();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  // Refresh / tab close: flush the latest state synchronously and let the
  // browser show its native leave confirmation. Draft persistence is skipped in
  // edit mode.
  useEffect(() => {
    if (editMode) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedContentRef.current()) return;
      void writeDraftToStorage();
      event.preventDefault();
      event.returnValue = '';
    };

    const handlePageHide = () => {
      if (hasUnsavedContentRef.current()) void writeDraftToStorage();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  return {
    hasUnsavedContent,
    getHasUnsavedContent: () => hasUnsavedContentRef.current(),
    writeDraftToStorage,
    scheduleDraftSave,
    cancelPendingDraftSave,
    resetDraftStorage,
  };
};
