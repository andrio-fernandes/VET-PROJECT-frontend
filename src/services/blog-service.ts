// Blog API service layer. Centralizes blog API calls.

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
  /** Optional new thumbnail; omit to keep existing. */
  thumbnail?: File | null;
  /** New attachment files to append. */
  attachments: File[];
  /** Existing attachment URLs to remove. */
  removeAttachmentUrls: string[];
}

// Guard against server's field-size limit (5MB).
const assertContentWithinLimit = (content: string): void => {
  if (content.length > BLOG_CONTENT_MAX_BYTES) {
    throw new Error(
      'Blog content is too large (max 5MB). Remove or compress embedded images and try again.'
    );
  }
};

// Shared multipart body for create + update.
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

// Update blog (creator only). Supports new thumbnail/attachments.
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

// Delete blog (creator only). Server removes attachments from Cloudinary.
export const deleteBlog = async (blogId: string): Promise<void> => {
  await del(itemEndpoint(API_ENDPOINTS.createBlog, blogId));
};

export const getMyBlogs = async (
  page = 1,
  limit = 10,
  module?: string,
  category?: string,
  q?: string
): Promise<PaginatedBlogs> => {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (module) query.set("module", module);
  if (category) query.set("category", category);
  if (q) query.set("q", q);
  const data = await get(`${API_ENDPOINTS.getMyBlogs}?${query.toString()}`);
  return {
    blogs: data?.blogs ?? [],
    page: data?.page ?? page,
    totalBlogs: data?.totalBlogs ?? 0,
  };
};

// Fetch blog by ID for preview.
export const getBlogById = async (blogId: string): Promise<BlogRecord | null> => {
  const data = await get(itemEndpoint(API_ENDPOINTS.createBlog, blogId));
  return getNested(data, "blog");
};
