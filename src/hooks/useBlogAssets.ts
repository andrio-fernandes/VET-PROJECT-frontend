// =============================================
// USE BLOG ASSETS
//
// Owns the thumbnail + attachment selection state for the Create / Edit Blog
// form. This includes locally picked files (with validation), existing server
// assets shown in edit mode (with removal tracking), and the thumbnail data
// URL used to persist drafts.
//
// Draft autosave is triggered through a ref supplied by the parent so this
// hook stays decoupled from the draft-persistence lifecycle.
// =============================================

import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';

import {
  ATTACHMENT_EXTENSIONS,
  ATTACHMENT_MAX_BYTES,
  THUMBNAIL_EXTENSIONS,
  THUMBNAIL_MAX_BYTES,
} from '@/constants/blog';
import { fileToDataUrl, getFileExtension } from '@/utils/file';
import type { PickedAttachment, PickedImage } from '@/types/blog';

export interface ExistingAsset {
  name: string;
  url: string;
}

interface UseBlogAssetsOptions {
  message: MessageInstance;
  editMode?: boolean;
  initialData?: {
    thumbnail?: ExistingAsset | null;
    attachments?: ExistingAsset[];
  };
  /** Filled by the parent after draft persistence is created. Invoked by the
   * asset handlers to schedule a draft save (a no-op in edit mode). */
  scheduleDraftSaveRef: MutableRefObject<() => void>;
}

export const useBlogAssets = ({
  message,
  editMode = false,
  initialData,
  scheduleDraftSaveRef,
}: UseBlogAssetsOptions) => {
  const [thumbnail, setThumbnail] = useState<PickedImage | null>(null);
  const [thumbnailError, setThumbnailError] = useState('');
  const [attachments, setAttachments] = useState<PickedAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState('');

  // Existing (server) assets in edit mode.
  const [existingThumbnail, setExistingThumbnail] = useState<ExistingAsset | null>(
    () => (editMode ? (initialData?.thumbnail ?? null) : null)
  );
  const [existingAttachments, setExistingAttachments] = useState<ExistingAsset[]>(
    () => (editMode ? (initialData?.attachments ?? []) : [])
  );
  const [removedAttachmentUrls, setRemovedAttachmentUrls] = useState<string[]>([]);

  // Current thumbnail data URL (for draft persistence without uploading).
  const thumbnailDataUrlRef = useRef('');

  // Kept in sync so persisted drafts / previews always read the latest state
  // even inside debounced callbacks.
  const thumbnailRef = useRef<PickedImage | null>(thumbnail);
  useEffect(() => {
    thumbnailRef.current = thumbnail;
  }, [thumbnail]);
  const attachmentsRef = useRef<PickedAttachment[]>(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  // Keep existing-asset removal state in refs too, so the getters read by
  // handlePreview/restoreEditRoundTrip always see the latest values regardless
  // of when the callback was created.
  const existingAttachmentsRef = useRef<ExistingAsset[]>(existingAttachments);
  useEffect(() => {
    existingAttachmentsRef.current = existingAttachments;
  }, [existingAttachments]);
  const removedAttachmentUrlsRef = useRef<string[]>(removedAttachmentUrls);
  useEffect(() => {
    removedAttachmentUrlsRef.current = removedAttachmentUrls;
  }, [removedAttachmentUrls]);

  // Kept so removing a freshly-picked thumbnail restores the original existing
  // server thumbnail in edit mode.
  const originalExistingThumbnailRef = useRef<ExistingAsset | null>(
    editMode ? (initialData?.thumbnail ?? null) : null
  );

  useEffect(() => {
    return () => {
      if (thumbnail) URL.revokeObjectURL(thumbnail.url);
    };
  }, [thumbnail]);

  const handleThumbnailChange = (file: File) => {
    setThumbnailError('');

    if (!file) return;

    if (!THUMBNAIL_EXTENSIONS.includes(getFileExtension(file.name))) {
      message.error('Thumbnail must be a PNG or JPG image');
      return;
    }

    if (file.size > THUMBNAIL_MAX_BYTES) {
      message.error('Thumbnail must be smaller than 2MB');
      return;
    }

    // Picking a new file replaces any existing (server) thumbnail.
    setExistingThumbnail(null);
    setThumbnail((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return { file, url: URL.createObjectURL(file), name: file.name };
    });

    // Cache the image as a data URL so drafts can persist it without
    // uploading anything to the backend.
    fileToDataUrl(file)
      .then((dataUrl) => {
        thumbnailDataUrlRef.current = dataUrl;
      })
      .catch(() => {
        thumbnailDataUrlRef.current = '';
      });
    scheduleDraftSaveRef.current();
  };

  const handleThumbnailRemove = () => {
    // In edit mode, removing the thumbnail reverts to the existing (server)
    // thumbnail; in create mode it simply clears the picked file.
    setExistingThumbnail(editMode ? originalExistingThumbnailRef.current : null);
    setThumbnail((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return null;
    });
    thumbnailDataUrlRef.current = '';
    scheduleDraftSaveRef.current();
  };

  const handleAttachmentChange = (file: File) => {
    setAttachmentError('');

    if (!file) return;

    if (!ATTACHMENT_EXTENSIONS.includes(getFileExtension(file.name))) {
      message.error('Attachment must be an Excel, PDF, DOC, PPT or PNG file');
      return;
    }

    if (file.size > ATTACHMENT_MAX_BYTES) {
      message.error('Attachment must be smaller than 10MB');
      return;
    }

    setAttachments((prev) => {
      // Keep the existing maximum of 5 attachments total (including existing
      // server attachments in edit mode).
      const existingTotal = existingAttachments.length;
      if (prev.length + existingTotal >= 5) {
        message.error('You can upload a maximum of 5 attachments');
        return prev;
      }
      return [...prev, { file, name: file.name }];
    });
    scheduleDraftSaveRef.current();
  };

  const handleAttachmentRemove = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    scheduleDraftSaveRef.current();
  };

  // Removes an existing (server) attachment and records its identity so the
  // server can delete it from Cloudinary on save. Names are used as the stable
  // identity (URLs also work but names are more readable for the server-side
  // matching logic).
  const handleExistingAttachmentRemove = (index: number) => {
    const current = existingAttachmentsRef.current;
    const target = current[index];
    if (target) {
      // Compute the filtered list manually instead of nesting one setState
      // inside another's updater, and record the removal in one go.
      setRemovedAttachmentUrls((prevUrls) =>
        prevUrls.includes(target.name)
          ? prevUrls
          : [...prevUrls, target.name]
      );
      setExistingAttachments(current.filter((_, i) => i !== index));
    }
  };

  // Seeds the form's existing assets once the server blog is loaded (edit mode).
  const setEditInitialData = (data: {
    thumbnail: ExistingAsset | null;
    attachments: ExistingAsset[];
  }) => {
    setExistingThumbnail(data.thumbnail ?? null);
    setExistingAttachments(data.attachments ?? []);
    setRemovedAttachmentUrls([]);
    originalExistingThumbnailRef.current = data.thumbnail ?? null;
  };

  // Re-applies the removal intent captured by the preview round-trip snapshot.
  // Called after the server blog is re-seeded on return to the edit page, so
  // attachments the user removed before previewing stay removed (instead of
  // reappearing because the removal list was cleared during re-seed). Matches on
  // NAME as the stable identity across the round-trip.
  const applyAttachmentRemovals = (removedNames: string[]) => {
    if (!Array.isArray(removedNames) || removedNames.length === 0) return;
    const removeSet = new Set(removedNames);
    setExistingAttachments((prev) =>
      prev.filter((att) => !removeSet.has(att.name))
    );
    setRemovedAttachmentUrls(removedNames);
  };

  // Restores a thumbnail that was persisted as a data URL (draft restore).
  const restoreThumbnail = (file: File, dataUrl: string) => {
    thumbnailDataUrlRef.current = dataUrl;
    setThumbnail({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    });
  };

  // Restores attachments that were persisted as data URLs (draft restore).
  const restoreAttachments = (files: { file: File; name: string }[]) => {
    setAttachments(files);
  };

  // Clears the picked (non-existing) asset state + errors + data URL.
  const resetPickedAssets = () => {
    setThumbnail((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return null;
    });
    thumbnailDataUrlRef.current = '';
    setAttachments([]);
    setThumbnailError('');
    setAttachmentError('');
  };

  return {
    thumbnail,
    thumbnailError,
    setThumbnailError,
    handleThumbnailChange,
    handleThumbnailRemove,
    attachments,
    attachmentError,
    handleAttachmentChange,
    handleAttachmentRemove,
    existingThumbnail,
    existingAttachments,
    removeAttachmentUrls: removedAttachmentUrls,
    handleExistingAttachmentRemove,
    resetEditState: setEditInitialData,
    applyAttachmentRemovals,
    restoreThumbnail,
    restoreAttachments,
    resetPickedAssets,
    getThumbnail: () => thumbnailRef.current,
    getAttachments: () => attachmentsRef.current,
    getThumbnailDataUrl: () => thumbnailDataUrlRef.current,
    getExistingThumbnail: () => existingThumbnail,
    getExistingAttachments: () => existingAttachmentsRef.current,
    getRemovedAttachmentUrls: () => removedAttachmentUrlsRef.current,
  };
};
