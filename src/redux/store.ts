// =============================================
// REDUX STORE
// =============================================

import { configureStore } from "@reduxjs/toolkit";

import blogReducer from "./blog/blog-slice";
import dashboardReducer from "./dashboard/dashboard-slice";

export const store = configureStore({
  reducer: {
    blog: blogReducer,
    dashboard: dashboardReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
