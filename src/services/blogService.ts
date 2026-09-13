// =============================================
// BLOG API SERVICE LAYER
//
// Centralizes every blog API call so components never build endpoints or
// parse responses themselves. The underlying `api` helper (src/services/api)
// handles auth headers, token refresh and error normalization.
// =============================================

import { del, get, getNested, itemEndpoint, post, put } from "./api";
import { API_ENDPOINTS } from "@/constants";
import { BLOG_CONTENT_MAX_BYTES } from "@/constants/blog";
import type { BlogListItem, BlogRecord } from "@/types/blog";

interface PaginatedBlogs {
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
  thumbnail?: File | null;
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

// Blog HTML (text + inline base64 images) is ASCII, so `length` is a good
// byte proxy. Guards the multipart field-size limit the server enforces
// (LIMIT_FIELD_VALUE) with a message the admin actually understands.
const assertContentWithinLimit = (content: string): void => {
  if (content.length > BLOG_CONTENT_MAX_BYTES) {
    throw new Error(
      'Blog content is too large (max 5MB). Remove or compress embedded images and try again.'
    );
  }
};

// Shared multipart body for create + update. The optional removeAttachmentUrls
// list is only sent by updateBlog.
const buildBlogFormData = (
  payload: { title: string; description: string; module: string; category: string; content: string; thumbnail?: File | null; attachments: File[] },
  removeAttachmentUrls?: string[]
): FormData => {
  const formData = new FormData();
  formData.append("title", payload.title.trim());
  formData.append("description", payload.description.trim());
  formData.append("module", payload.module);
  formData.append("category", payload.category);
  formData.append("content", payload.content || "");

  if (payload.thumbnail) {
    formData.append("thumbnail", payload.thumbnail);
  }

  if (removeAttachmentUrls && removeAttachmentUrls.length > 0) {
    formData.append("removeAttachmentUrls", JSON.stringify(removeAttachmentUrls));
  }

  for (const att of payload.attachments) {
    formData.append("attachment", att);
  }

  return formData;
};

export const createBlog = async (payload: CreateBlogPayload): Promise<void> => {
  assertContentWithinLimit(payload.content);
  await post(API_ENDPOINTS.createBlog, buildBlogFormData(payload));
};

// Updates an existing blog (creator only). Multipart so a new thumbnail /
// attachments can optionally be uploaded.
export const updateBlog = async (
  blogId: string,
  payload: UpdateBlogPayload
): Promise<void> => {
  assertContentWithinLimit(payload.content);
  await put(
    itemEndpoint(API_ENDPOINTS.createBlog, blogId),
    buildBlogFormData(payload, payload.removeAttachmentUrls)
  );
};

// Deletes a blog (creator only). The thumbnail + attachments are removed from
// Cloudinary by the server.
export const deleteBlog = async (blogId: string): Promise<void> => {
  await del(itemEndpoint(API_ENDPOINTS.createBlog, blogId));
};

export const getMyBlogs = async (
  page = 1,
  limit = 10,
  module?: string,
  category?: string
): Promise<PaginatedBlogs> => {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (module) query.set("module", module);
  if (category) query.set("category", category);
  const data = await get(`${API_ENDPOINTS.getMyBlogs}?${query.toString()}`);
  return {
    blogs: data?.blogs ?? [],
    page: data?.page ?? page,
    totalBlogs: data?.totalBlogs ?? 0,
  };
};

// Fetches a single blog by id for the preview page.
export const getBlogById = async (blogId: string): Promise<BlogRecord | null> => {
  const data = await get(itemEndpoint(API_ENDPOINTS.createBlog, blogId));
  return getNested(data, "blog");
};
