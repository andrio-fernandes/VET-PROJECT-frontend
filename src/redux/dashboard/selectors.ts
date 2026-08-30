// =============================================
// REDUX SELECTORS FOR THE DASHBOARD SLICE
// =============================================

import type { RootState } from "../store";

export const selectDashboard = (state: RootState) => state.dashboard;

export const selectDashboardStats = (state: RootState) => state.dashboard.stats;

export const selectRecentVideos = (state: RootState) =>
  state.dashboard.recentVideos;

export const selectRecentBlogs = (state: RootState) =>
  state.dashboard.recentBlogs;

export const selectRecentFaqs = (state: RootState) =>
  state.dashboard.recentFaqs;

export const selectDashboardLoading = (state: RootState) =>
  state.dashboard.loading;

export const selectFaqsLoading = (state: RootState) =>
  state.dashboard.faqsLoading;

export const selectDashboardError = (state: RootState) => state.dashboard.error;
