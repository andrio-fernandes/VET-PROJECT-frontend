import type { RootState } from '@/redux/store';

export const selectDashboard = (state: RootState) => state.dashboard;

export const selectDashboardError = (state: RootState) => state.dashboard.error;
