import type { RootState } from '@/redux/store';

export const selectBlogsForPage = (page: number) => (state: RootState) =>
  state.blog.blogsByPage[page] ?? [];

export const selectBlogsTotal = (state: RootState) => state.blog.totalBlogs;

export const selectBlogLoading = (state: RootState) => state.blog.loading;

export const selectBlogError = (state: RootState) => state.blog.error;
