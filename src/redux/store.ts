// =============================================
// REDUX STORE
// =============================================

import { configureStore } from "@reduxjs/toolkit";

import blogReducer from "./blog/blogSlice";
import dashboardReducer from "./dashboard/dashboardSlice";
import videoUploadReducer from "./videoUpload/videoUploadSlice";

export const store = configureStore({
  reducer: {
    blog: blogReducer,
    dashboard: dashboardReducer,
    videoUpload: videoUploadReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
