// =============================================
// FEEDBACK SERVICE LAYER
//
// Customers submit feedback from the user dashboard; admins manage the
// submissions (list / mark read / resolve) from the admin feedback inbox.
// The submission endpoint stamps the sender email server-side from the
// authenticated account, so no email is ever accepted from the client.
// =============================================

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

// Submit feedback as the current customer. Email is not sent; the server
// stamps it from the logged-in user's account.
export const submitFeedback = async (message: string): Promise<void> => {
  await post(API_ENDPOINTS.feedback, { message });
};

// Admin: paginated feedback list, optionally filtered by status.
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

// Admin: number of unread (new) submissions, for the sidebar badge.
export const getFeedbackCount = async (): Promise<number> => {
  const data = await get(API_ENDPOINTS.feedbackCount);
  return data?.count ?? 0;
};

// Admin: mark a submission as read or resolved. The server stamps the acting
// admin as the reviewer and returns the updated record with the reviewer name.
export const updateFeedbackStatus = async (
  id: string,
  status: FeedbackStatus
): Promise<FeedbackRecord> => {
  const data = await put(API_ENDPOINTS.feedbackStatus(id), { status });
  return data?.feedback;
};