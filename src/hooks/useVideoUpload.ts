// =============================================
// USE VIDEO UPLOAD
//
// Upload orchestration for the Video create/edit page. Owns the media state
// (selected files, existing URLs, preview object URLs), the direct-to-
// Cloudinary transfer (signature, phased progress, abort handle) and the
// preview modal data — everything that is hard to debug. The page keeps the
// form/baseline/navigation/draft logic and passes the dirty setter in so
// every media mutation stays wired to the unsaved-changes guard.
// =============================================

import { useCallback, useRef, useState } from "react";
import {
  signVideoUpload,
  uploadFileToCloudinary,
  type UploadAbortHandle,
} from "@/services/videoService";
import { mediaUrl } from "@/utils/media";
import type { MessageInstance } from "antd/es/message/interface";
import type { VideoPreviewData } from "@/components/video/video-preview-modal";

interface UseVideoUploadParams {
  message: MessageInstance;
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useVideoUpload = ({ message, setIsDirty }: UseVideoUploadParams) => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [existingVideoUrl, setExistingVideoUrl] = useState<string>("");
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string>("");
  // Progress reported by the direct-to-Cloudinary transfer (browser -> CDN).
  const [uploadProgress, setUploadProgress] = useState<{
    phase: "video" | "thumbnail";
    percent: number;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<VideoPreviewData | null>(null);
  const abortRef = useRef<UploadAbortHandle | null>(null);
  // Set when the user confirms leaving mid-upload so the onFinish catch does
  // not surface a spurious "Failed to upload video" toast.
  const abortedRef = useRef(false);

  const handleFileChange = useCallback(
    (pickedFile: File) => {
      setFile(pickedFile);
      setExistingVideoUrl("");
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const handleThumbnailChange = useCallback(
    (pickedFile: File) => {
      setThumbnail(pickedFile);
      setExistingThumbnailUrl("");
      setThumbnailPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(pickedFile);
      });
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const removeFile = useCallback(() => {
    setFile(null);
    setIsDirty(true);
  }, [setIsDirty]);

  const removeThumbnail = useCallback(() => {
    setThumbnailPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setThumbnail(null);
    setIsDirty(true);
  }, [setIsDirty]);

  /** Seeds the existing media for edit mode (server URLs are mapped to the
   *  CDN-facing format the page displays). */
  const seedMedia = useCallback(
    ({ videoUrl, thumbnailUrl }: { videoUrl?: string | null; thumbnailUrl?: string | null }) => {
      if (videoUrl) setExistingVideoUrl(mediaUrl(videoUrl));
      if (thumbnailUrl) setExistingThumbnailUrl(mediaUrl(thumbnailUrl));
    },
    []
  );

  // Uploads the selected file(s) directly to Cloudinary under a server-issued
  // signature, then returns the new public ids. A missing file is skipped, so
  // edit submissions can keep their existing media.
  const uploadMedia = useCallback(async (): Promise<{
    publicId: string | undefined;
    thumbnailPublicId: string | undefined;
  }> => {
    abortRef.current = null;
    abortedRef.current = false;
    let publicId: string | undefined;
    if (file) {
      setUploadProgress({ phase: "video", percent: 0 });
      const signature = await signVideoUpload("video");
      const result = await uploadFileToCloudinary(
        file,
        signature,
        (percent) => setUploadProgress({ phase: "video", percent }),
        abortRef
      );
      publicId = result?.public_id as string | undefined;
      if (!publicId) throw new Error("Video upload did not return a public id.");
    }

    let thumbnailPublicId: string | undefined;
    if (thumbnail) {
      setUploadProgress({ phase: "thumbnail", percent: 0 });
      const signature = await signVideoUpload("thumbnail");
      const result = await uploadFileToCloudinary(
        thumbnail,
        signature,
        (percent) => setUploadProgress({ phase: "thumbnail", percent }),
        abortRef
      );
      thumbnailPublicId = result?.public_id as string | undefined;
      if (!thumbnailPublicId)
        throw new Error("Thumbnail upload did not return a public id.");
    }

    setUploadProgress(null);
    return { publicId, thumbnailPublicId };
  }, [file, thumbnail]);

  /** Aborts an in-flight transfer after the user confirms leaving. */
  const abortUpload = useCallback(() => {
    abortedRef.current = true;
    abortRef.current?.abort();
  }, []);

  /** Clears all media after a successful create (revoking the preview URL). */
  const resetMedia = useCallback(() => {
    setThumbnailPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setFile(null);
    setThumbnail(null);
    setExistingVideoUrl("");
    setExistingThumbnailUrl("");
  }, []);

  const openPreview = useCallback(
    (title: string, description: string) => {
      const src = file ? URL.createObjectURL(file) : existingVideoUrl;
      if (!src) {
        message.warning("Please select a video to preview.");
        return;
      }

      setPreviewData({
        src,
        title,
        description,
        thumbnail: file ? thumbnailPreview : existingThumbnailUrl,
      });
      setPreviewOpen(true);
    },
    [file, existingVideoUrl, thumbnailPreview, existingThumbnailUrl, message]
  );

  const closePreview = useCallback(() => {
    setPreviewData((prev) => {
      if (file && prev?.src) {
        URL.revokeObjectURL(prev.src);
      }
      return null;
    });
    setPreviewOpen(false);
  }, [file]);

  return {
    file,
    thumbnail,
    thumbnailPreview,
    existingVideoUrl,
    existingThumbnailUrl,
    uploadProgress,
    previewOpen,
    previewData,
    abortedRef,
    handleFileChange,
    handleThumbnailChange,
    removeFile,
    removeThumbnail,
    seedMedia,
    uploadMedia,
    abortUpload,
    resetMedia,
    openPreview,
    closePreview,
  };
};