// =============================================
// SHARED VIDEO TYPES
// Kept identical to the inline types in the video
// pages - do not change shapes.
// =============================================

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
}
