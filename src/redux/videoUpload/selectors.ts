import type { RootState } from "../store";
import type { VideoUploadEntry } from "./videoUploadSlice";

export const selectVideoUploads = (
  state: RootState
): Record<string, VideoUploadEntry> => state.videoUpload.uploads;

export const selectUploadById = (
  state: RootState,
  id?: string
): VideoUploadEntry | undefined =>
  id ? state.videoUpload.uploads[id] : undefined;
