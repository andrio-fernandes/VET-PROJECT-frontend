// =============================================
// CUSTOMER CONTENT LIBRARY SERVICE LAYER
//
// Read-only views of admin-published FAQs, videos and blogs for logged-in
// customers. All calls hit the GET-only /api/library endpoints via the shared
// `api` helper (auth headers, token refresh, error normalization). This layer
// never triggers admin endpoints, uploads, or any write path.
// =============================================

import { get, getNested, itemEndpoint, post, put } from "./api";
import { API_ENDPOINTS } from "@/constants";
import type { FaqRecord } from "@/types/faq";
import type { BlogListItem, BlogRecord } from "@/types/blog";
import type { VideoRecord } from "@/types/video";

interface PaginatedFaqs {
  faqs: FaqRecord[];
  page: number;
  totalFaqs: number;
}

interface PaginatedVideos {
  videos: VideoRecord[];
  page: number;
  totalVideos: number;
}

interface PaginatedBlogs {
  blogs: BlogListItem[];
  page: number;
  totalBlogs: number;
}

export type ContentType = 'video' | 'blog' | 'faq';

interface GetLibraryParams {
  page: number;
  limit: number;
  module?: string;
  category?: string;
  q?: string;
}

const buildLibraryQuery = (params: GetLibraryParams): string => {
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.module) query.set("module", params.module);
  if (params.category) query.set("category", params.category);
  if (params.q) query.set("q", params.q);
  return query.toString();
};

interface GetLibraryOptions {
  signal?: AbortSignal;
}

export const getLibraryFaqs = async (
  params: GetLibraryParams,
  options?: GetLibraryOptions
): Promise<PaginatedFaqs> => {
  const data = await get(`${API_ENDPOINTS.libraryFaqs}?${buildLibraryQuery(params)}`, options);
  return {
    faqs: data?.faqs ?? [],
    page: data?.page ?? params.page,
    totalFaqs: data?.totalFaqs ?? 0,
  };
};

export const getLibraryVideos = async (
  params: GetLibraryParams,
  options?: GetLibraryOptions
): Promise<PaginatedVideos> => {
  const data = await get(`${API_ENDPOINTS.libraryVideos}?${buildLibraryQuery(params)}`, options);
  return {
    videos: (data?.videos ?? []).map(normalizeVideo),
    page: data?.page ?? params.page,
    totalVideos: data?.totalVideos ?? 0,
  };
};

export const getLibraryVideoById = async (
  videoId: string
): Promise<VideoRecord | null> => {
  const data = await get(itemEndpoint(API_ENDPOINTS.libraryVideos, videoId));
  const v = getNested(data, "video");
  if (!v?._id) return null;
  return normalizeVideo(v);
};

export const getLibraryBlogs = async (
  params: GetLibraryParams,
  options?: GetLibraryOptions
): Promise<PaginatedBlogs> => {
  const data = await get(`${API_ENDPOINTS.libraryBlogs}?${buildLibraryQuery(params)}`, options);
  return {
    blogs: data?.blogs ?? [],
    page: data?.page ?? params.page,
    totalBlogs: data?.totalBlogs ?? 0,
  };
};

export const getLibraryBlogById = async (
  blogId: string
): Promise<BlogRecord | null> => {
  const data = await get(itemEndpoint(API_ENDPOINTS.libraryBlogs, blogId));
  return getNested(data, "blog");
};

// Customer-only flavor of the video normalization. The library endpoint omits
// Cloudinary/cleanup bookkeeping (public ids, processing error), so those stay
// undefined rather than being leaked to viewers.
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
  duration: v.duration,
  width: v.width,
  height: v.height,
  format: v.format,
  bytes: v.bytes,
  isNew: v.isNew ?? false,
});

// ── View history / continue learning ─────────────────────────

interface WatchProgress {
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
}

interface ContinueVideo {
  video: VideoRecord;
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
}

interface RecentlyViewedItem {
  type: "blog" | "faq";
  contentId: string;
  title: string;
  text?: string;
  thumbnail?: string;
  viewedAt?: string;
}

export interface ContinueLearningData {
  continueVideo: ContinueVideo | null;
  recentlyViewed: RecentlyViewedItem[];
}

// Mark a blog/faq as viewed (videos use saveWatchProgress instead).
export const markViewed = async (
  type: "blog" | "faq",
  contentId: string
): Promise<void> => {
  await post(API_ENDPOINTS.libraryViewed(type, contentId));
};

// Dashboard "Continue Learning" payload.
export const getContinueLearning = async (): Promise<ContinueLearningData> => {
  const data = await get(API_ENDPOINTS.libraryContinue);
  const cv = data?.continueVideo;
  return {
    continueVideo: cv?.video
      ? {
          video: normalizeVideo(cv.video),
          positionSeconds: cv?.positionSeconds ?? 0,
          durationSeconds: cv?.durationSeconds ?? 0,
          completed: cv?.completed ?? false,
        }
      : null,
    recentlyViewed: data?.recentlyViewed ?? [],
  };
};

// Fetch a single video's saved position for the player resume seek.
export const getWatchProgress = async (
  videoId: string
): Promise<WatchProgress | null> => {
  const data = await get(API_ENDPOINTS.libraryProgress(videoId));
  if (!data?.success) return null;
  return {
    positionSeconds: data?.positionSeconds ?? 0,
    durationSeconds: data?.durationSeconds ?? 0,
    completed: data?.completed ?? false,
  };
};

// Upsert video position. Also marks the video as viewed.
export const saveWatchProgress = async (
  videoId: string,
  progress: { positionSeconds: number; durationSeconds: number; completed?: boolean }
): Promise<void> => {
  await put(API_ENDPOINTS.libraryProgress(videoId), progress);
};

// ── Last-seen timestamps (New badge tracking) ─────────────────

export const updateLastSeen = async (
  type: ContentType
): Promise<void> => {
  await put(API_ENDPOINTS.libraryLastSeen(type));
};