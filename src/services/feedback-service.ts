// Feedback service: customer submission and admin management.
// Email is stamped server-side from the authenticated account.

import { get, post, put } from "./api";
import { API_ENDPOINTS } from "@/constants";

export type FeedbackStatus = "new" | "read" | "resolved";

export interface FeedbackRecord {
  _id: string;
  userId: string;
  userName?: string;
  email: string;
  message: string;
  status: FeedbackStatus;
  reviewedBy?: { fullName?: string; username?: string } | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedFeedback {
  feedbacks: FeedbackRecord[];
  page: number;
  totalFeedbacks: number;
}

interface GetFeedbackParams {
  page: number;
  limit: number;
  status?: FeedbackStatus | "all";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  reviewedById?: string;
}

export type { GetFeedbackParams };

// Submit feedback. Email is stamped server-side from logged-in user.
export const submitFeedback = async (message: string): Promise<void> => {
  await post(API_ENDPOINTS.feedback, { message });
};

// Admin: paginated feedback list with optional filters.
export const getFeedbacks = async (
  params: GetFeedbackParams
): Promise<PaginatedFeedback> => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }
  if (params.search) {
    query.set("search", params.search);
  }
  if (params.dateFrom) {
    query.set("dateFrom", params.dateFrom);
  }
  if (params.dateTo) {
    query.set("dateTo", params.dateTo);
  }
  if (params.reviewedById) {
    query.set("reviewedById", params.reviewedById);
  }

  const data = await get(`${API_ENDPOINTS.feedback}?${query.toString()}`);
  return {
    feedbacks: data?.feedbacks ?? [],
    page: data?.page ?? params.page,
    totalFeedbacks: data?.totalFeedbacks ?? 0,
  };
};

// Admin: all feedbacks (no pagination) for the reviewer filter dropdown.
export const getAllFeedbacksForReviewers = async (): Promise<FeedbackRecord[]> => {
  const data = await get(`${API_ENDPOINTS.feedback}?page=1&limit=10000`);
  return data?.feedbacks ?? [];
};
export const getFeedbackCount = async (): Promise<number> => {
  const data = await get(API_ENDPOINTS.feedbackCount);
  return data?.count ?? 0;
};

// Admin: mark submission as read/resolved. Server stamps the reviewer.
export const updateFeedbackStatus = async (
  id: string,
  status: FeedbackStatus
): Promise<FeedbackRecord> => {
  const data = await put(API_ENDPOINTS.feedbackStatus(id), { status });
  return data?.feedback;
};