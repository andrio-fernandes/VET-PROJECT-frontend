// Thumbnail + attachment selection state for the Create / Edit Blog form.
// Includes locally picked files (with validation), existing server assets
// in edit mode (with removal tracking), and thumbnail data URL for drafts.
// Draft autosave is triggered through a parent-supplied ref.

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
  /** Filled by the parent after draft persistence is created. Invoked by
   * asset handlers to schedule a draft save (no-op in edit mode). */
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

  // Server assets in edit mode.
  const [existingThumbnail, setExistingThumbnail] = useState<ExistingAsset | null>(
    () => (editMode ? (initialData?.thumbnail ?? null) : null)
  );
  const [existingAttachments, setExistingAttachments] = useState<ExistingAsset[]>(
    () => (editMode ? (initialData?.attachments ?? []) : [])
  );
  const [removedAttachmentUrls, setRemovedAttachmentUrls] = useState<string[]>([]);

  // Current thumbnail data URL (for draft persistence).
  const thumbnailDataUrlRef = useRef('');

  // Kept in sync so persisted drafts/previews always read latest state
  // even inside debounced callbacks.
  const thumbnailRef = useRef<PickedImage | null>(thumbnail);
  useEffect(() => {
    thumbnailRef.current = thumbnail;
  }, [thumbnail]);
  const attachmentsRef = useRef<PickedAttachment[]>(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  // Keep existing-asset removal state in refs so getters always see latest
  // values regardless of when the callback was created.
  const existingAttachmentsRef = useRef<ExistingAsset[]>(existingAttachments);
  useEffect(() => {
    existingAttachmentsRef.current = existingAttachments;
  }, [existingAttachments]);
  const removedAttachmentUrlsRef = useRef<string[]>(removedAttachmentUrls);
  useEffect(() => {
    removedAttachmentUrlsRef.current = removedAttachmentUrls;
  }, [removedAttachmentUrls]);

  // Kept so removing a freshly-picked thumbnail restores the original
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

    // Picking a new file replaces any existing server thumbnail.
    setExistingThumbnail(null);
    setThumbnail((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return { file, url: URL.createObjectURL(file), name: file.name };
    });

    // Cache image as data URL so drafts can persist without backend upload.
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
    // Edit mode: revert to server thumbnail. Create mode: clear picked file.
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
      // Max 5 attachments total (including existing server attachments).
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

  // Removes a server attachment and records its URL for Cloudinary deletion
  // on save. URL is the stable identity (display names can be shared).
  const handleExistingAttachmentRemove = (index: number) => {
    const current = existingAttachmentsRef.current;
    const target = current[index];
    if (!target) return;
    const next = current.filter((_, i) => i !== index);
    // Update ref synchronously so rapid remove clicks operate on latest list.
    existingAttachmentsRef.current = next;
    setExistingAttachments(next);
    setRemovedAttachmentUrls((prevUrls) =>
      prevUrls.includes(target.url) ? prevUrls : [...prevUrls, target.url]
    );
  };

  // Seeds form's existing assets when server blog loads (edit mode).
  const setEditInitialData = (data: {
    thumbnail: ExistingAsset | null;
    attachments: ExistingAsset[];
  }) => {
    setExistingThumbnail(data.thumbnail ?? null);
    setExistingAttachments(data.attachments ?? []);
    setRemovedAttachmentUrls([]);
    originalExistingThumbnailRef.current = data.thumbnail ?? null;
  };

  // Re-applies edit-mode preview round-trip snapshot after server blog is
  // re-seeded. Snapshot carries remaining server attachments at preview time
  // plus pending removals (idempotent, immune to name mismatches).
  const applyRoundTripState = (state: {
    existingAttachments?: { name: string; url: string }[];
    removedAttachmentUrls?: string[];
  }) => {
    if (Array.isArray(state.existingAttachments)) {
      setExistingAttachments(state.existingAttachments);
    }
    if (Array.isArray(state.removedAttachmentUrls)) {
      setRemovedAttachmentUrls(state.removedAttachmentUrls);
    }
  };

  // Restores thumbnail persisted as data URL (draft restore).
  const restoreThumbnail = (file: File, dataUrl: string) => {
    thumbnailDataUrlRef.current = dataUrl;
    setThumbnail({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    });
  };

  // Restores attachments persisted as data URLs (draft restore).
  const restoreAttachments = (files: { file: File; name: string }[]) => {
    setAttachments(files);
  };

  // Clears picked (non-existing) asset state, errors, and data URL.
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
    applyRoundTripState,
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
