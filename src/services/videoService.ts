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

export const createVideo = async (payload: CreateVideoPayload): Promise<void> => {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("description", payload.description);
  formData.append("module", payload.module);
  formData.append("category", payload.category);
  formData.append("video", payload.video);
  formData.append("thumbnail", payload.thumbnail);

  await api(API_ENDPOINTS.createVideo, {
    method: "POST",
    body: formData,
  });
};
