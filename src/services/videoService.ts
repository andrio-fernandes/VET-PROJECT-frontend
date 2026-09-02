// =============================================
// VIDEO API SERVICE LAYER
//
// Centralizes every video API call so pages never build
// endpoints or parse responses themselves. All calls go
// through the `api` helper (auth headers, token refresh,
// error normalization); the multipart body keeps the
// browser-generated boundary for file uploads.
// =============================================

import { api } from "./api";
import { startVideoUpload, ensureVideoUploadManager } from "./videoUploadManager";
import type { SettleReason } from "./videoUploadManager";
import { API_ENDPOINTS } from "@/constants";
import type { VideoRecord } from "@/types/video";

export interface PaginatedVideos {
  videos: VideoRecord[];
  totalVideos: number;
}

export interface CreateVideoPayload {
  title: string;
  description: string;
  module: string;
  category: string;
  video: File;
  thumbnail?: File;
}

export interface CreateVideoResult {
  // Resolves with the video id once the backend accepts (202) the job.
  idPromise: Promise<string>;
  // Resolves when background processing reaches ready/failed/timeout.
  settled: Promise<SettleReason>;
}

export interface UpdateVideoPayload {
  title: string;
  description: string;
  module: string;
  category: string;
  // Optional new media files. Omit/null to keep the existing ones.
  video?: File | null;
  thumbnail?: File | null;
}

// Fire-and-forget video creation. This returns as soon as the backend returns
// 202 Accepted; the upload + Cloudinary processing continue in the background
// (managed module-level, independent of any page). The backend remains the
// source of truth for processingStatus.
export const createVideo = (
  payload: CreateVideoPayload,
  onProgress?: (percent: number, loaded: number, total: number) => void
): CreateVideoResult => {
  ensureVideoUploadManager();
  return startVideoUpload({
    title: payload.title,
    description: payload.description,
    module: payload.module,
    category: payload.category,
    video: payload.video,
    thumbnail: payload.thumbnail,
    onProgress,
  });
};

export const getVideos = async (query: string): Promise<PaginatedVideos> => {
  const data = await api(`${API_ENDPOINTS.getVideos}?${query}`);
  return {
    videos: data?.videos ?? [],
    totalVideos: data?.totalVideos ?? 0,
  };
};

export const deleteVideo = async (videoId: string): Promise<void> => {
  await api(API_ENDPOINTS.deleteVideo(videoId), { method: "DELETE" });
};

// Fetches a single video by id (used to seed the edit form).
export const getVideoById = async (
  videoId: string
): Promise<VideoRecord | null> => {
  const data = await api(API_ENDPOINTS.getVideo(videoId));
  const v = data?.video ?? data?.data?.video ?? data;
  if (!v?._id && !v?.key) return null;
  return {
    key: v._id ?? v.key,
    title: v.title ?? "",
    description: v.description ?? "",
    createdAt: v.createdAt ?? "",
    createdBy: v.createdBy?.fullName || v.createdBy?.username || "Unknown",
    module: v.module ?? "",
    category: v.category ?? "",
    videoUrl: v.videoUrl ?? "",
    thumbnailUrl: v.thumbnailUrl,
    processingStatus: v.processingStatus,
  };
};

// Updates an existing video (creator only). Multipart so a new video /
// thumbnail can optionally be uploaded; fields are only included when the
// admin provides a replacement file, otherwise the existing ones are kept.
export const updateVideo = async (
  videoId: string,
  payload: UpdateVideoPayload
): Promise<void> => {
  const formData = new FormData();
  formData.append("title", payload.title.trim());
  formData.append("description", payload.description.trim());
  formData.append("module", payload.module);
  formData.append("category", payload.category);

  if (payload.video) {
    formData.append("video", payload.video);
  }
  if (payload.thumbnail) {
    formData.append("thumbnail", payload.thumbnail);
  }

  await api(API_ENDPOINTS.updateVideo(videoId), {
    method: "PUT",
    body: formData,
  });
};
