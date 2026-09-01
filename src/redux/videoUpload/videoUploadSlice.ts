// =============================================
// VIDEO UPLOAD SLICE
//
// Backend-mirroring cache of video processing status. This slice NEVER
// decides or fabricates a status — it only records what the backend
// reported (via GET /videos/:id/status or the list refetch), so the
// backend remains the single source of truth. Both the Videos page and
// the Admin Dashboard read from here so status stays consistent app-wide.
// =============================================

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { VideoProcessingStatus } from "@/types/video";

export interface VideoUploadEntry {
  id: string;
  title: string;
  status: VideoProcessingStatus;
  error?: string;
}

export interface VideoUploadState {
  // Live uploads (accepted but not yet ready/failed), used to drive
  // status columns and notifications. Keyed by video id.
  uploads: Record<string, VideoUploadEntry>;
}

const initialState: VideoUploadState = {
  uploads: {},
};

const videoUploadSlice = createSlice({
  name: "videoUpload",
  initialState,
  reducers: {
    // Record that a background upload has been accepted and is processing.
    addUpload(
      state,
      action: PayloadAction<{ id: string; title: string; status: VideoProcessingStatus }>
    ) {
      const { id, title, status } = action.payload;
      state.uploads[id] = { id, title, status };
    },
    // Mirror an updated backend status for a known upload.
    setUploadStatus(
      state,
      action: PayloadAction<{
        id: string;
        status: VideoProcessingStatus;
        error?: string;
      }>
    ) {
      const { id, status, error } = action.payload;
      const entry = state.uploads[id];
      if (!entry) return;
      entry.status = status;
      if (error) entry.error = error;
    },
    // Remove an upload entry (e.g. after it settled and notification sent).
    removeUpload(state, action: PayloadAction<string>) {
      delete state.uploads[action.payload];
    },
  },
});

export const { addUpload, setUploadStatus, removeUpload } =
  videoUploadSlice.actions;
export default videoUploadSlice.reducer;
