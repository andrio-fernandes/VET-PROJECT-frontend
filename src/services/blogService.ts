// =============================================
// BLOG API SERVICE LAYER
//
// Centralizes every blog API call so components never build endpoints or
// parse responses themselves. The underlying `api` helper (src/services/api)
// handles auth headers, token refresh and error normalization.
// =============================================

import { api } from "./api";
import { API_ENDPOINTS } from "@/utils/constant";
import type { BlogListItem, BlogRecord } from "@/types/blog";

export interface PaginatedBlogs {
  blogs: BlogListItem[];
  page: number;
  totalBlogs: number;
}

interface CreateBlogPayload {
  title: string;
  description: string;
  module: string;
  category: string;
  content: string;
  thumbnail: File;
  attachments: File[];
}

interface UpdateBlogPayload {
  title: string;
  description: string;
  module: string;
  category: string;
  content: string;
  /** Optional new thumbnail File; omit to keep the existing one. */
  thumbnail?: File | null;
  /** Newly picked attachment Files to append. */
  attachments: File[];
  /** URLs of existing attachments to remove (deleted from Cloudinary). */
  removeAttachmentUrls: string[];
}

export const createBlog = async (payload: CreateBlogPayload): Promise<void> => {
  const formData = new FormData();
  formData.append("title", payload.title.trim());
  formData.append("description", payload.description.trim());
  formData.append("module", payload.module);
  formData.append("category", payload.category);
  formData.append("content", payload.content || "");
  formData.append("thumbnail", payload.thumbnail);

  if (payload.attachments.length > 0) {
    for (const att of payload.attachments) {
      formData.append("attachment", att);
    }
  }

  await api(API_ENDPOINTS.createBlog, {
    method: "POST",
    body: formData,
  });
};

// Updates an existing blog (creator only). Multipart so a new thumbnail /
// attachments can optionally be uploaded.
export const updateBlog = async (
  blogId: string,
  payload: UpdateBlogPayload
): Promise<void> => {
  const formData = new FormData();
  formData.append("title", payload.title.trim());
  formData.append("description", payload.description.trim());
  formData.append("module", payload.module);
  formData.append("category", payload.category);
  formData.append("content", payload.content || "");

  if (payload.thumbnail) {
    formData.append("thumbnail", payload.thumbnail);
  }

  if (payload.removeAttachmentUrls.length > 0) {
    formData.append("removeAttachmentUrls", JSON.stringify(payload.removeAttachmentUrls));
  }

  for (const att of payload.attachments) {
    formData.append("attachment", att);
  }

  await api(`${API_ENDPOINTS.createBlog}/${blogId}`, {
    method: "PUT",
    body: formData,
  });
};

// Deletes a blog (creator only). The thumbnail + attachments are removed from
// Cloudinary by the server.
export const deleteBlog = async (blogId: string): Promise<void> => {
  await api(`${API_ENDPOINTS.createBlog}/${blogId}`, {
    method: "DELETE",
  });
};

export const getMyBlogs = async (page = 1, limit = 10): Promise<PaginatedBlogs> => {
  const data = await api(`${API_ENDPOINTS.getMyBlogs}?page=${page}&limit=${limit}`);
  return {
    blogs: data?.blogs ?? [],
    page: data?.page ?? page,
    totalBlogs: data?.totalBlogs ?? 0,
  };
};

// Fetches a single blog by id for the preview page.
export const getBlogById = async (blogId: string): Promise<BlogRecord | null> => {
  const data = await api(`${API_ENDPOINTS.createBlog}/${blogId}`);
  return data?.blog ?? data?.data?.blog ?? null;
};
