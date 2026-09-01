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
  thumbnail: File;
}

export interface CreateVideoResult {
  // Resolves with the video id once the backend accepts (202) the job.
  idPromise: Promise<string>;
  // Resolves when background processing reaches ready/failed/timeout.
  settled: Promise<SettleReason>;
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
