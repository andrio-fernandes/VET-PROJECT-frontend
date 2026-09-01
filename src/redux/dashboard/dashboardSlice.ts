// =============================================
// DASHBOARD SLICE
//
// Holds the admin dashboard's server data (summary stats + recent
// content for the active tab) as a single source of truth so the
// dashboard page uses useAppSelector / useAppDispatch instead of
// local useState + useEffect. Payloads mirror the previous api()
// calls exactly - do not change them.
// =============================================

import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { api } from "@/services/api";
import { API_ENDPOINTS } from "@/constants";
import type {
  DashboardStats,
  RecentItem,
  DashboardFaqRecord as FaqRecord,
} from "@/types/dashboard";

export interface DashboardState {
  stats: DashboardStats;
  recentVideos: RecentItem[];
  recentBlogs: RecentItem[];
  recentFaqs: FaqRecord[];
  loading: boolean;
  faqsLoading: boolean;
  error: string;
}

const initialState: DashboardState = {
  stats: { totalVideos: 0, totalBlogs: 0, totalFaqs: 0 },
  recentVideos: [],
  recentBlogs: [],
  recentFaqs: [],
  loading: false,
  faqsLoading: false,
  error: "",
};

const toRecentItem = (
  record: any,
  fallbackName: string
): RecentItem => ({
  key: record._id,
  title: record.title,
  createdAt: record.createdAt,
  createdByName:
    record.createdBy?.fullName || record.createdBy?.username || fallbackName,
  category: record.category,
  thumbnailUrl: record.thumbnailUrl ?? record.thumbnail,
});

export const fetchDashboardStats = createAsyncThunk(
  "dashboard/fetchStats",
  async (): Promise<DashboardStats> => {
    const data = await api(API_ENDPOINTS.dashboardStats);
    return {
      totalFaqs: data?.data?.totalFaqs ?? 0,
      totalVideos: data?.data?.totalVideos ?? 0,
      totalBlogs: data?.data?.totalBlogs ?? 0,
    };
  }
);

export const fetchRecentVideos = createAsyncThunk(
  "dashboard/fetchRecentVideos",
  async (fallbackName: string): Promise<RecentItem[]> => {
    const data = await api(`${API_ENDPOINTS.getVideos}?page=1&limit=4`);
    return (data?.videos ?? []).map((video: any) =>
      toRecentItem(video, "Unknown")
    );
  }
);

export const fetchRecentBlogs = createAsyncThunk(
  "dashboard/fetchRecentBlogs",
  async (fallbackName: string): Promise<RecentItem[]> => {
    const data = await api(`${API_ENDPOINTS.getMyBlogs}?page=1&limit=4`);
    return (data?.blogs ?? []).map((blog: any) =>
      toRecentItem(blog, fallbackName)
    );
  }
);

export const fetchRecentFaqs = createAsyncThunk(
  "dashboard/fetchRecentFaqs",
  async (): Promise<FaqRecord[]> => {
    const data = await api(`${API_ENDPOINTS.getMyFaqs}?limit=4`);
    return data?.faqs ?? [];
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboard: (state) => {
      state.stats = { totalVideos: 0, totalBlogs: 0, totalFaqs: 0 };
      state.recentVideos = [];
      state.recentBlogs = [];
      state.recentFaqs = [];
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.stats = action.payload;
        state.loading = false;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to load dashboard data.";
      })
      .addCase(fetchRecentVideos.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRecentVideos.fulfilled, (state, action) => {
        state.recentVideos = action.payload;
        state.loading = false;
      })
      .addCase(fetchRecentVideos.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchRecentBlogs.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRecentBlogs.fulfilled, (state, action) => {
        state.recentBlogs = action.payload;
        state.loading = false;
      })
      .addCase(fetchRecentBlogs.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchRecentFaqs.pending, (state) => {
        state.faqsLoading = true;
      })
      .addCase(fetchRecentFaqs.fulfilled, (state, action) => {
        state.recentFaqs = action.payload;
        state.faqsLoading = false;
      })
      .addCase(fetchRecentFaqs.rejected, (state, action) => {
        state.faqsLoading = false;
        state.error = action.error.message || "Failed to load FAQs.";
      });
  },
});

export const { clearDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;
