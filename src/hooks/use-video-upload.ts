// Video upload hook. Manages media state and Cloudinary transfer.

import { useCallback, useRef, useState } from "react";
import {
  signVideoUpload,
  uploadFileToCloudinary,
  type UploadAbortHandle,
} from "@/services/video-service";
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
  // Upload progress (browser -> CDN).
  const [uploadProgress, setUploadProgress] = useState<{
    phase: "video" | "thumbnail";
    percent: number;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<VideoPreviewData | null>(null);
  const abortRef = useRef<UploadAbortHandle | null>(null);
  // Flag to suppress error toast on intentional leave.
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

  /** Seed existing media for edit mode. */
  const seedMedia = useCallback(
    ({ videoUrl, thumbnailUrl }: { videoUrl?: string | null; thumbnailUrl?: string | null }) => {
      if (videoUrl) setExistingVideoUrl(mediaUrl(videoUrl));
      if (thumbnailUrl) setExistingThumbnailUrl(mediaUrl(thumbnailUrl));
    },
    []
  );

  // Upload files to Cloudinary with server signature. Skips missing files.
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

  /** Abort in-flight transfer. */
  const abortUpload = useCallback(() => {
    abortedRef.current = true;
    abortRef.current?.abort();
  }, []);

  /** Clear all media after successful create. */
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