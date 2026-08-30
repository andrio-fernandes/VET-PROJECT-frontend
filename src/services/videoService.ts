// =============================================
// VIDEO API SERVICE LAYER
//
// Centralizes every video API call so pages never build
// endpoints or parse responses themselves. getVideos /
// deleteVideo go through the `api` helper (auth headers,
// token refresh, error normalization). createVideo uses a
// raw multipart fetch exactly as the page did originally
// (files must keep the browser-generated boundary).
// =============================================

import { api } from "./api";
import { API_ENDPOINTS, TOKEN_KEY } from "@/utils/constant";
import type { VideoRecord } from "@/types/video";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(TOKEN_KEY)
      : null;

  const response = await fetch(`${API_URL}${API_ENDPOINTS.createVideo}`, {
    method: "POST",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Failed to upload video");
  }
};
