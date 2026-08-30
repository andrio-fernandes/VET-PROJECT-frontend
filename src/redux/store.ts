// =============================================
// REDUX STORE
// =============================================

import { configureStore } from "@reduxjs/toolkit";

import blogReducer from "./blog/blogSlice";
import dashboardReducer from "./dashboard/dashboardSlice";

export const store = configureStore({
  reducer: {
    blog: blogReducer,
    dashboard: dashboardReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
