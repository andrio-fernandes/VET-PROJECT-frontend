// =============================================
// VIDEO API SERVICE LAYER
//
// Centralizes every video API call so pages never build
// endpoints or parse responses themselves. All calls go
// through the `api` helper (auth headers, token refresh,
// error normalization).
//
// Media upload is direct-to-Cloudinary: the page asks the
// backend for a signed upload (`signVideoUpload`), uploads
// the file bytes to Cloudinary from the browser, then sends
// only metadata + the resulting public ids to `create/update`.
// The Express server never buffers video bytes.
// =============================================

import { del, get, getNested, itemEndpoint, post, put } from "./api";
import { API_ENDPOINTS } from "@/constants";
import type { PurgedVideo, VideoRecord } from "@/types/video";

export interface PaginatedVideos {
  videos: VideoRecord[];
  totalVideos: number;
  // Failed videos the backend deleted on this call (the UI pops once per
  // entry instead of showing the row).
  purged?: PurgedVideo[];
}

// Signature + endpoint info issued by POST /videos/sign. It bounds a single
// browser upload to the correct Cloudinary account, folder, resource type
// and maximum file size.
export interface CloudinarySignature {
  cloud_name: string;
  api_key: string;
  resource_type: "video" | "image";
  timestamp: number;
  folder: string;
  signature: string;
  max_bytes: number;
}

export interface CreateVideoPayload {
  title: string;
  description: string;
  module: string;
  category: string;
  publicId: string;
  thumbnailPublicId?: string;
}

export interface UpdateVideoPayload {
  title: string;
  description: string;
  module: string;
  category: string;
  // Optional replacement media. Omit/null to keep the existing assets.
  publicId?: string | null;
  thumbnailPublicId?: string | null;
}

// Requests a short-lived Cloudinary signature for a video or thumbnail upload.
export const signVideoUpload = async (
  kind: "video" | "thumbnail" = "video"
): Promise<CloudinarySignature> => {
  const data = await post(API_ENDPOINTS.signVideoUpload, { kind });
  return data as CloudinarySignature;
};

// Abort handle for a direct-to-Cloudinary transfer. The page stores it in a
// ref so a confirmed leave can abort the in-flight XHR (and the create-video
// POST with it), keeping the "leaving aborts the upload" warning truthful.
export interface UploadAbortHandle {
  abort: () => void;
}

// Writable container for the abort handle; the page passes its useRef here.
export type UploadAbortRef = { current: UploadAbortHandle | null };

// Uploads a file's bytes directly to Cloudinary from the browser using the
// signature from signVideoUpload. Resolves with the file's secure_url,
// public_id and (for videos) its authoritative metadata.
export const uploadFileToCloudinary = (
  file: File,
  signature: CloudinarySignature,
  onProgress?: (percent: number, loaded: number, total: number) => void,
  abortRef?: UploadAbortRef
): Promise<Record<string, any>> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("api_key", signature.api_key);
    formData.append("timestamp", String(signature.timestamp));
    formData.append("folder", signature.folder);
    formData.append("signature", signature.signature);
    if (signature.max_bytes) {
      formData.append("max_bytes", String(signature.max_bytes));
    }
    formData.append("file", file);

    const endpoint = `https://api.cloudinary.com/v1_1/${signature.cloud_name}/${signature.resource_type}/upload`;

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);

    if (abortRef) {
      abortRef.current = { abort: () => xhr.abort() };
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(
          Math.round((event.loaded / event.total) * 100),
          event.loaded,
          event.total
        );
      }
    };

    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
        return;
      }

      reject(
        new Error(
          data?.error?.message || data?.message || "Cloudinary upload failed."
        )
      );
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.onabort = () => reject(new Error("Upload aborted."));
    xhr.send(formData);
  });
};

// Creates a video record referencing already-uploaded Cloudinary assets. The
// server re-reads the assets and stores ready immediately - there is no
// background processing step anymore.
export const createVideo = async (
  payload: CreateVideoPayload
): Promise<VideoRecord | null> => {
  const data = await post(API_ENDPOINTS.createVideo, payload);
  return data?.video ? normalizeVideo(data.video) : null;
};

export const getVideos = async (query: string): Promise<PaginatedVideos> => {
  const data = await get(`${API_ENDPOINTS.getVideos}?${query}`);
  return {
    videos: (data?.videos ?? []).map(normalizeVideo),
    totalVideos: data?.totalVideos ?? 0,
    purged: (data?.purged ?? []).map((v: any) => ({
      key: v?._id ?? v?.id,
      title: v?.title ?? "",
    })),
  };
};

export const deleteVideo = async (videoId: string): Promise<void> => {
  await del(itemEndpoint(API_ENDPOINTS.createVideo, videoId));
};

const normalizeVideo = (v: any): VideoRecord => ({
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
  createdById: v.createdById ?? v.createdBy?._id ?? null,
  videoPublicId: v.videoPublicId,
  thumbnailPublicId: v.thumbnailPublicId,
  duration: v.duration,
  width: v.width,
  height: v.height,
  format: v.format,
  bytes: v.bytes,
});

// Fetches a single video by id (used to seed the edit form and to power the
// preview page's authoritative re-fetch).
export const getVideoById = async (
  videoId: string
): Promise<VideoRecord | null> => {
  const data = await get(itemEndpoint(API_ENDPOINTS.createVideo, videoId));
  const v = getNested(data, "video");
  if (!v?._id) return null;
  return normalizeVideo(v);
};

// Updates an existing video (owner or super-admin). Media replacements are
// sent as Cloudinary public ids; omit them to keep the existing assets.
export const updateVideo = async (
  videoId: string,
  payload: UpdateVideoPayload
): Promise<VideoRecord | null> => {
  const data = await put(itemEndpoint(API_ENDPOINTS.createVideo, videoId), {
    title: payload.title,
    description: payload.description,
    module: payload.module,
    category: payload.category,
    ...(payload.publicId ? { publicId: payload.publicId } : {}),
    ...(payload.thumbnailPublicId
      ? { thumbnailPublicId: payload.thumbnailPublicId }
      : {}),
  });
  return data?.video ? normalizeVideo(data.video) : null;
};