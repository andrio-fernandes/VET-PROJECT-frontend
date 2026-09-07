// =============================================
// SHARED VIDEO TYPES
// Kept identical to the inline types in the video
// pages - do not change shapes.
// =============================================

export type VideoProcessingStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed";

export interface VideoRecord {
  key: string;
  title: string;
  description: string;
  createdAt: string;
  createdBy: string;
  module: string;
  category: string;
  videoUrl: string;
  thumbnailUrl?: string;
  processingStatus?: VideoProcessingStatus;
  // Owner's user id + whether the viewer may manage it. Set server-side from
  // the populated createdBy; clients use it for edit/delete visibility only
  // (the server still enforces ownership).
  createdById?: string;
  // Cloudinary-authoritative media metadata.
  videoPublicId?: string;
  thumbnailPublicId?: string;
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

// A stale "failed" video that the backend purged on the last GET /videos call.
// Clients surface one notification per purged entry instead of ever rendering
// the (now-deleted) row.
export interface PurgedVideo {
  key: string;
  title: string;
}