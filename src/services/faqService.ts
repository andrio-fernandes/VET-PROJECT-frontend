// =============================================
// FAQ API SERVICE LAYER
//
// Centralizes every FAQ API call so pages never build
// endpoints or parse responses themselves. The
// underlying `api` helper handles auth headers, token
// refresh and error normalization. Payloads and
// response parsing mirror the FAQ pages exactly.
// =============================================

import { buildQuery, del, get, itemEndpoint, post, put } from "./api";
import { API_ENDPOINTS } from "@/constants";
import type {
  FaqRecord,
  CreateFaqPayload,
  UpdateFaqPayload,
} from "@/types/faq";

interface PaginatedFaqs {
  faqs: FaqRecord[];
  page: number;
  totalFaqs: number;
}

interface GetFaqsParams {
  page: number;
  limit: number;
  module?: string;
  category?: string;
  q?: string;
}

export const getMyFaqs = async (params: GetFaqsParams): Promise<PaginatedFaqs> => {
  const query = buildQuery({
    page: params.page,
    limit: params.limit,
    module: params.module,
    category: params.category,
    q: params.q,
  });

  const data = await get(`${API_ENDPOINTS.getMyFaqs}?${query}`);
  return {
    faqs: data?.faqs ?? [],
    page: data?.page ?? params.page,
    totalFaqs: data?.totalFaqs ?? 0,
  };
};

export const getFaqById = async (faqId: string): Promise<FaqRecord> => {
  const data = await get(itemEndpoint(API_ENDPOINTS.createFaq, faqId));
  return data?.faq ?? data ?? null;
};

export const createFaq = async (payload: CreateFaqPayload): Promise<void> => {
  await post(API_ENDPOINTS.createFaq, payload);
};

export const updateFaq = async (
  faqId: string,
  payload: UpdateFaqPayload
): Promise<void> => {
  await put(itemEndpoint(API_ENDPOINTS.createFaq, faqId), payload);
};

export const deleteFaq = async (faqId: string): Promise<void> => {
  await del(itemEndpoint(API_ENDPOINTS.createFaq, faqId));
};
