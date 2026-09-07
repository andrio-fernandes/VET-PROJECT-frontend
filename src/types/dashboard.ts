// =============================================
// SHARED DASHBOARD TYPES
// Kept identical to the types previously defined
// inline in the dashboard Redux slice - do not
// change shapes.
// =============================================

export interface DashboardStats {
  totalVideos: number;
  totalBlogs: number;
  totalFaqs: number;
}

export interface RecentItem {
  key: string;
  title: string;
  createdAt: string;
  createdByName: string;
  category?: string;
  thumbnailUrl?: string;
  processingStatus?: string;
  videoUrl?: string;
  description?: string;
  // Owner's user id (videos) so the dashboard can reflect edit/delete rights.
  createdById?: string;
}

export interface DashboardFaqRecord {
  _id: string;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
  createdBy?: { fullName?: string; username?: string };
}
