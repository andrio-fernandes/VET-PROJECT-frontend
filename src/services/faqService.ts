// =============================================
// FAQ API SERVICE LAYER
//
// Centralizes every FAQ API call so pages never build
// endpoints or parse responses themselves. The
// underlying `api` helper handles auth headers, token
// refresh and error normalization. Payloads and
// response parsing mirror the FAQ pages exactly.
// =============================================

import { api } from "./api";
import { API_ENDPOINTS } from "@/constants";
import type {
  FaqRecord,
  CreateFaqPayload,
  UpdateFaqPayload,
} from "@/types/faq";

export interface PaginatedFaqs {
  faqs: FaqRecord[];
  page: number;
  totalFaqs: number;
}

export interface GetFaqsParams {
  page: number;
  limit: number;
  module?: string;
  category?: string;
}

export const getMyFaqs = async (params: GetFaqsParams): Promise<PaginatedFaqs> => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.module && params.module !== "All") query.set("module", params.module);
  if (params.category && params.category !== "All") query.set("category", params.category);

  const data = await api(`${API_ENDPOINTS.getMyFaqs}?${query.toString()}`);
  return {
    faqs: data?.faqs ?? [],
    page: data?.page ?? params.page,
    totalFaqs: data?.totalFaqs ?? 0,
  };
};

export const getFaqById = async (faqId: string): Promise<FaqRecord> => {
  const data = await api(API_ENDPOINTS.getFaq(faqId));
  return data?.faq ?? data ?? null;
};

export const createFaq = async (payload: CreateFaqPayload): Promise<void> => {
  await api(API_ENDPOINTS.createFaq, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateFaq = async (
  faqId: string,
  payload: UpdateFaqPayload
): Promise<void> => {
  await api(`${API_ENDPOINTS.createFaq}/${faqId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const deleteFaq = async (faqId: string): Promise<void> => {
  await api(API_ENDPOINTS.deleteFaq(faqId), { method: "DELETE" });
};
