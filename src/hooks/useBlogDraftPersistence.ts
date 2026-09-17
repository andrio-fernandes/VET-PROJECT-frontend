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

import { useCallback, useEffect, useRef, useState } from 'react';
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
  isReady?: boolean;
  message: MessageInstance;
  getThumbnail: () => PickedImage | null;
  getAttachments: () => PickedAttachment[];
  getThumbnailDataUrl: () => string;
  restoreThumbnail: (file: File, dataUrl: string) => void;
  restoreAttachments: (files: { file: File; name: string }[]) => void;
  /** URLs/names of existing server attachments the user has removed (edit mode). */
  getRemovedAttachmentUrls: () => string[];
  /** The originally-loaded server values (edit mode only). Used as the baseline
   * so "unsaved content" means the user actually changed something, instead of
   * the form simply being populated. */
  baseline?: Partial<BlogFormValues>;
}

export const useBlogDraftPersistence = ({
  getValues,
  reset,
  editMode = false,
  isReady = false,
  message,
  getThumbnail,
  getAttachments,
  getThumbnailDataUrl,
  restoreThumbnail,
  restoreAttachments,
  getRemovedAttachmentUrls,
  baseline,
}: UseBlogDraftPersistenceOptions) => {
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasUnsavedContent = useCallback(() => {
    const values: BlogDraftValues = getValues();

    // Edit mode: only report unsaved content when the form actually differs
    // from the originally-loaded blog (text fields and/or asset changes), so
    // leaving an untouched edit form does not prompt to save/discard.
    if (editMode) {
      const base = baseline ?? {};
      const textChanged = [
        'title',
        'description',
        'module',
        'category',
        'content',
      ].some((key) => (values[key as keyof BlogDraftValues] ?? '') !== (base[key as keyof BlogFormValues] ?? ''));
      const thumbnailChanged = Boolean(getThumbnail());
      const attachmentsChanged =
        getAttachments().length > 0 || getRemovedAttachmentUrls().length > 0;
      return textChanged || thumbnailChanged || attachmentsChanged;
    }

    const hasText = [values.title, values.description].some(
      (entry) => Boolean(entry && entry.trim())
    );
    const hasSelection = Boolean(values.module || values.category);
    const hasBody = stripHtmlTags(values.content).length > 0;
    return hasText || hasSelection || hasBody || Boolean(getThumbnail()) || getAttachments().length > 0;
  }, [getValues, getThumbnail, getAttachments, getRemovedAttachmentUrls, editMode, baseline]);

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
    let thumbnailDataUrl = getThumbnailDataUrl();
    // The thumbnail data URL is otherwise cached asynchronously on pick and may
    // not be ready when a draft/preview is written. Derive it from the file so
    // the persisted draft reliably restores the thumbnail.
    if (!thumbnailDataUrl && thumbnail) {
      thumbnailDataUrl = await fileToDataUrl(thumbnail.file);
    }
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
      // Storage quota exceeded - progressively trim heavy payload to preserve
      // as much of the draft as possible: first drop the thumbnail, then drop
      // attachments one-by-one (largest data URLs first) until the write fits.
      const sortedAttachments = [...draft.attachments].sort(
        (a, b) => (b.dataUrl?.length ?? 0) - (a.dataUrl?.length ?? 0),
      );
      const fallbacks = [
        { ...draft, thumbnail: null },
        ...sortedAttachments.map((_, i) => ({
          ...draft,
          thumbnail: null,
          attachments: sortedAttachments.slice(i + 1),
        })),
      ];
      for (const fallback of fallbacks) {
        try {
          localStorage.setItem(BLOG_DRAFT_STORAGE_KEY, JSON.stringify(fallback));
          return;
        } catch {
          /* try next smaller variant */
        }
      }
      /* draft cannot be persisted at all */
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

  // A saved draft exists but the user has not yet decided whether to restore
  // it. Mirrors the FAQ / Video create pages, which ask "Restore previous
  // draft?" before repopulating the form instead of silently auto-restoring.
  const [draftAvailable, setDraftAvailable] = useState(false);
  const pendingDraftRef = useRef<BlogDraft | null>(null);

  // Detects a saved draft once when the page opens and prompts the user to
  // restore or discard it (Blog create page). Runs only in genuine create mode
  // once the route is resolved. Skipped in edit mode (the form is seeded from
  // the server blog), and skipped until the router has hydrated so a stale
  // create draft is never written over a blog that is actually being edited.
  useEffect(() => {
    if (editMode || !isReady) return;
    let cancelled = false;

    const checkDraft = async () => {
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

      if (cancelled) return;
      pendingDraftRef.current = draft;
      // Defer into a microtask so the setState is not called synchronously
      // within the effect body (avoids the React Compiler rule).
      queueMicrotask(() => {
        if (!cancelled) setDraftAvailable(true);
      });
    };

    checkDraft();

    return () => {
      cancelled = true;
    };
  }, [editMode, isReady]);

  // Applies a saved draft to the form and asset state. Kept as a standalone
  // function so the user-driven restore (chosen from the prompt modal) behaves
  // exactly like the old silent restore.
  const applyDraft = async (draft: BlogDraft) => {
    const draftValues = draft.values as any;
    const { title = '', description = '', module: moduleName = '', content = '' } = draftValues;
    // Tolerate drafts saved before the rename of `feature` -> `category`.
    const category = draftValues.category ?? draftValues.feature ?? '';

    reset({ title, description, module: moduleName, category, content });

    if (draft.thumbnail?.dataUrl) {
      const restoredFile = await dataUrlToFile(
        draft.thumbnail.dataUrl,
        draft.thumbnail.name || 'thumbnail.png'
      );
      if (restoredFile) {
        restoreThumbnail(restoredFile, draft.thumbnail.dataUrl);
      }
    }

    if (draft.attachments?.length) {
      const restored = await Promise.all(
        draft.attachments.map(async (att) => {
          const file = await dataUrlToFile(att.dataUrl, att.name);
          return file ? { file, name: att.name } : null;
        })
      );
      const valid = restored.filter(Boolean) as { file: File; name: string }[];
      if (valid.length) {
        restoreAttachments(valid);
      }
      if (valid.length < draft.attachments.length) {
        message.warning(
          `${draft.attachments.length - valid.length} attachment(s) could not be restored from the draft.`,
        );
      }
    }
  };

  const confirmRestoreDraft = async () => {
    const draft = pendingDraftRef.current;
    pendingDraftRef.current = null;
    setDraftAvailable(false);
    if (!draft) return;
    await applyDraft(draft);
    message.info('Restored your previous unsaved progress.');
  };

  const confirmDiscardDraft = () => {
    pendingDraftRef.current = null;
    setDraftAvailable(false);
    resetDraftStorage();
  };

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
    draftAvailable,
    confirmRestoreDraft,
    confirmDiscardDraft,
    hasUnsavedContent,
    getHasUnsavedContent: () => hasUnsavedContentRef.current(),
    writeDraftToStorage,
    scheduleDraftSave,
    cancelPendingDraftSave,
    resetDraftStorage,
  };
};
