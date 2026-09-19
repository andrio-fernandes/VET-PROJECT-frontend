// =============================================
// DASHBOARD SLICE
//
// Holds the admin dashboard's server data (summary stats + recent
// content for the active tab) as a single source of truth so the
// dashboard page uses useAppSelector / useAppDispatch instead of
// local useState + useEffect. Payloads mirror the previous api()
// calls exactly - do not change them.
// =============================================

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api } from "@/services/api";
import { API_ENDPOINTS } from "@/constants";
import { getVideos } from "@/services/videoService";
import { getMyBlogs } from "@/services/blogService";
import { getMyFaqs } from "@/services/faqService";
import type {
  DashboardStats,
  RecentItem,
  DashboardFaqRecord as FaqRecord,
} from "@/types/dashboard";
import type { PurgedVideo } from "@/types/video";

interface DashboardState {
  stats: DashboardStats;
  recentVideos: RecentItem[];
  recentBlogs: RecentItem[];
  recentFaqs: FaqRecord[];
  // Failed videos the backend purged on the last recent-videos fetch; the
  // dashboard pops once per entry instead of every showing the deleted row.
  purgedVideos: PurgedVideo[];
  loading: boolean;
  faqsLoading: boolean;
  error: string;
}

const initialState: DashboardState = {
  stats: { totalVideos: 0, totalBlogs: 0, totalFaqs: 0 },
  recentVideos: [],
  recentBlogs: [],
  recentFaqs: [],
  purgedVideos: [],
  loading: false,
  faqsLoading: false,
  error: "",
};

// Consumes both raw (populated createdBy object, _id key) and normalized
// (createdBy string, key) records so the recent tabs can share one mapper.
const toRecentItem = (
  record: any,
  fallbackName: string
): RecentItem => ({
  key: record.key ?? record._id,
  title: record.title,
  createdAt: record.createdAt,
  createdByName:
    record.createdBy && typeof record.createdBy === "object"
      ? record.createdBy.fullName || record.createdBy.username || fallbackName
      : record.createdBy || fallbackName,
  category: record.category,
  thumbnailUrl: record.thumbnailUrl ?? record.thumbnail,
  processingStatus: record.processingStatus,
  videoUrl: record.videoUrl,
  description: record.description,
  createdById: record.createdById ?? record.createdBy?._id ?? null,
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
  async (fallbackName: string): Promise<{ list: RecentItem[]; purged: PurgedVideo[] }> => {
    const data = await getVideos("page=1&limit=4");
    return {
      list: data.videos.map((video) => toRecentItem(video, "Unknown")),
      purged: data.purged ?? [],
    };
  }
);

export const fetchRecentBlogs = createAsyncThunk(
  "dashboard/fetchRecentBlogs",
  async (fallbackName: string): Promise<RecentItem[]> => {
    const data = await getMyBlogs(1, 4);
    return (data.blogs ?? []).map((blog) => toRecentItem(blog, fallbackName));
  }
);

export const fetchRecentFaqs = createAsyncThunk(
  "dashboard/fetchRecentFaqs",
  async (): Promise<FaqRecord[]> => {
    const data = await getMyFaqs({ page: 1, limit: 4 });
    return data.faqs ?? [];
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
      state.purgedVideos = [];
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
        state.purgedVideos = [];
      })
      .addCase(fetchRecentVideos.fulfilled, (state, action) => {
        state.recentVideos = action.payload.list;
        state.purgedVideos = action.payload.purged;
        state.loading = false;
      })
      .addCase(fetchRecentVideos.rejected, (state) => {
        state.loading = false;
        state.purgedVideos = [];
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
