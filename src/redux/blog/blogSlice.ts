// =============================================
// BLOG SLICE
//
// Holds the authenticated user's paginated blog list (getMyBlogs) as a
// single source of truth shared by the All Blogs page and the Dashboard
// ("recent blogs" tab + "My Blogs" modal). Create Blog form state stays in
// React Hook Form - only server data that crosses pages lives here.
// =============================================

import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { getMyBlogs } from "@/services/blogService";
import type { BlogListItem } from "@/types/blog";

export interface BlogListState {
  // Cached list per page so All Blogs and the Dashboard can both read the
  // same page without each keeping its own copy.
  blogsByPage: Record<number, BlogListItem[]>;
  totalBlogs: number;
  currentPage: number;
  loading: boolean;
  error: string;
}

const initialState: BlogListState = {
  blogsByPage: {},
  totalBlogs: 0,
  currentPage: 1,
  loading: false,
  error: "",
};

export const fetchBlogsPage = createAsyncThunk(
  "blog/fetchBlogsPage",
  async ({
    page,
    limit = 10,
    module,
    category,
  }: {
    page: number;
    limit?: number;
    module?: string;
    category?: string;
  }) => {
    const data = await getMyBlogs(page, limit, module, category);
    // Use the requested page as the cache key so determinism is preserved
    // even if the server echoes a different page.
    return { page, blogs: data.blogs, totalBlogs: data.totalBlogs };
  }
);

const blogSlice = createSlice({
  name: "blog",
  initialState,
  reducers: {
    clearBlogs: (state) => {
      state.blogsByPage = {};
      state.totalBlogs = 0;
      state.currentPage = 1;
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBlogsPage.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(
        fetchBlogsPage.fulfilled,
        (state, action: PayloadAction<{ page: number; blogs: BlogListItem[]; totalBlogs: number }>) => {
          const { page, blogs, totalBlogs } = action.payload;
          state.blogsByPage[page] = blogs;
          state.totalBlogs = totalBlogs;
          state.currentPage = page;
          state.loading = false;
        }
      )
      .addCase(fetchBlogsPage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to load blogs.";
      });
  },
});

export const { clearBlogs } = blogSlice.actions;
export default blogSlice.reducer;
