// Handles localStorage draft lifecycle for Create Blog: debounced autosave,
// restore on mount, and beforeunload/pagehide flushing. Skipped in edit mode.
// Receives getters to read current values without triggering re-renders.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';

import {
  BLOG_DRAFT_STORAGE_KEY,
  DRAFT_AUTOSAVE_DEBOUNCE_MS,
} from '@/constants/blog';
import { dataUrlToFile, fileToDataUrl } from '@/utils/file';
import { stripHtmlTags } from '@/utils/rich-text';
import type { BlogDraft, BlogDraftValues, PickedAttachment, PickedImage } from '@/types/blog';
import type { BlogFormValues } from './use-blog-draft';

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
  /** URLs/names of existing server attachments the user removed (edit mode). */
  getRemovedAttachmentUrls: () => string[];
  /** Originally-loaded server values (edit mode). Baseline so "unsaved content"
   * means the user actually changed something. */
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

    // Edit mode: only report unsaved content when form differs from
    // originally-loaded blog (text fields and/or asset changes).
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
    // Thumbnail data URL may not be ready when draft is written (cached
    // async on pick). Derive from file so persisted draft restores reliably.
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
      // Storage quota exceeded — progressively trim heavy payload: first
      // drop thumbnail, then attachments one-by-one (largest first).
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

  // Clears pending autosave timer and removes persisted draft. RHF reset
  // and cleared asset state are handled by the caller.
  const resetDraftStorage = () => {
    cancelPendingDraftSave();
    removeDraftFromStorage();
  };

  // Saved draft exists but user hasn't decided to restore yet. Mirrors FAQ /
  // Video create pages which ask before repopulating the form.
  const [draftAvailable, setDraftAvailable] = useState(false);
  const pendingDraftRef = useRef<BlogDraft | null>(null);

  // Detects saved draft on page open and prompts user to restore/discard.
  // Only runs in create mode once route is resolved. Skipped in edit mode
  // and until router hydrates to avoid overwriting an edited blog with
  // a stale create draft.
  useEffect(() => {
    if (editMode || !isReady) return;
    let cancelled = false;

    const checkDraft = async () => {
      const draft = readDraftFromStorage();
      if (!draft?.values) return;

      const draftValues = draft.values as any;
      const { title = '', description = '', module: moduleName = '', content = '' } = draftValues;
    // Tolerate drafts saved before "feature" → "category" rename.
      const category = draftValues.category ?? draftValues.feature ?? '';
      if (![title, description, moduleName, category, content].some((entry) => entry && entry.trim())) {
        removeDraftFromStorage();
        return;
      }

      if (cancelled) return;
      pendingDraftRef.current = draft;
      // Defer into microtask to avoid calling setState synchronously in
      // the effect body.
      queueMicrotask(() => {
        if (!cancelled) setDraftAvailable(true);
      });
    };

    checkDraft();

    return () => {
      cancelled = true;
    };
  }, [editMode, isReady]);

  // Applies a saved draft to form and asset state. Kept standalone so
  // user-driven restore (from prompt modal) behaves like silent restore.
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

  // Refresh / tab close: flush latest state synchronously and let browser
  // show native leave confirmation. Skipped in edit mode.
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
