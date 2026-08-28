// =============================================
// REDUX SELECTORS FOR THE BLOG SLICE
// =============================================

import { createSelector } from "@reduxjs/toolkit";

import type { RootState } from "../store";

export const selectBlogState = (state: RootState) => state.blog;

export const selectBlogsByPage = (state: RootState) => state.blog.blogsByPage;

export const selectBlogsTotal = (state: RootState) => state.blog.totalBlogs;

export const selectBlogCurrentPage = (state: RootState) => state.blog.currentPage;

export const selectBlogLoading = (state: RootState) => state.blog.loading;

export const selectBlogError = (state: RootState) => state.blog.error;

// Selects the cached blog list for a specific page (empty array if absent).
export const selectBlogsForPage = (page: number) =>
  createSelector([selectBlogsByPage], (byPage) => byPage[page] ?? []);
