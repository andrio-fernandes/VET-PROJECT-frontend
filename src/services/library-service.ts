// Read-only library service for customers: FAQs, videos, and blogs.
// All calls go through the shared `api` helper; no write/admin endpoints.

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
  fullText?: boolean;
}

const buildLibraryQuery = (params: GetLibraryParams): string => {
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.module) query.set("module", params.module);
  if (params.category) query.set("category", params.category);
  if (params.q) query.set("q", params.q);
  if (params.fullText) query.set("fullText", "true");
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

// Customer-facing video normalization. Library omits Cloudinary bookkeeping.
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

// View history / continue learning

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
  type: "blog" | "faq" | "video";
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

// Mark content as viewed.
export const markViewed = async (
  type: "blog" | "faq" | "video",
  contentId: string
): Promise<void> => {
  await post(API_ENDPOINTS.libraryViewed(type, contentId));
};

// Dashboard "Continue Learning" data.
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

// Fetch a video's saved position for player resume.
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

// Upsert video position and mark as viewed.
export const saveWatchProgress = async (
  videoId: string,
  progress: { positionSeconds: number; durationSeconds: number; completed?: boolean }
): Promise<void> => {
  await put(API_ENDPOINTS.libraryProgress(videoId), progress);
};

// Last-seen timestamps (New badge tracking)

export const updateLastSeen = async (
  type: ContentType
): Promise<void> => {
  await put(API_ENDPOINTS.libraryLastSeen(type));
};