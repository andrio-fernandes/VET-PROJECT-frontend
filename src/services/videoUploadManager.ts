// =============================================
// VIDEO UPLOAD MANAGER
//
// Module-level (non-React) background job runner for video uploads. It owns
// the XMLHttpRequest transfer AND the status polling, entirely outside the
// React component lifecycle, so navigating away from the Create Video page
// never cancels the upload. It mirrors status into the videoUpload Redux
// slice, which drives the status columns and global notifications.
//
// The backend is the source of truth: we only ever write statuses that the
// backend reported (202 accepted -> processing; GET /:id/status -> ready /
// failed). Nothing here fabricates a "ready".
// =============================================

import { store } from "@/redux/store";
import {
  addUpload,
  setUploadStatus,
  removeUpload,
} from "@/redux/videoUpload/videoUploadSlice";
import { api, uploadWithProgress } from "./api";
import { API_ENDPOINTS } from "@/constants";

export interface StartVideoUploadPayload {
  title: string;
  description: string;
  module: string;
  category: string;
  video: File;
  thumbnail: File;
  onProgress?: (percent: number, loaded: number, total: number) => void;
}

export type SettleReason =
  | { kind: "ready" }
  | { kind: "failed"; error: string }
  | { kind: "timeout"; error: string };

// Polling config (matches the previous waitForVideoReady behavior).
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000;

// Key used to persist in-flight uploads across full page reloads so the app
// can re-sync status from the backend (which is authoritative).
const ACTIVE_UPLOADS_KEY = "video_upload_active_jobs";

interface ActiveJob {
  id: string;
  title: string;
  resolve: (reason: SettleReason) => void;
  settled: boolean;
  reason?: SettleReason;
}

const activeJobs = new Map<string, ActiveJob>();

const loadPersistedJobs = (): Array<{ id: string; title: string }> => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_UPLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const persistJobs = () => {
  if (typeof window === "undefined") return;
  const jobs = [...activeJobs.values()].map((j) => ({ id: j.id, title: j.title }));
  try {
    window.sessionStorage.setItem(ACTIVE_UPLOADS_KEY, JSON.stringify(jobs));
  } catch {
    /* ignore quota / private-mode errors */
  }
};

const clearPersisted = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ACTIVE_UPLOADS_KEY);
  } catch {
    /* ignore */
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Poll GET /videos/:id/status until it reaches a terminal state. On ready
// dispatch the status; on failed dispatch the error; on timeout return a
// non-terminal result so the caller can drop the entry instead of labeling it
// failed. Returns the reason.
const pollUntilTerminal = async (videoId: string): Promise<SettleReason> => {
  const startedAt = Date.now();
  while (true) {
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      return {
        kind: "timeout",
        error: "Video processing timed out. Please try again.",
      };
    }

    await sleep(POLL_INTERVAL_MS);

    // Use the shared `api` helper so polling carries the same
    // Authorization/token-refresh handling as the rest of the app. API errors
    // (network, 5xx, expired session refresh) are treated as transient: we
    // keep polling until the timeout rather than killing the job.
    let data: any = null;
    try {
      data = await api(API_ENDPOINTS.getVideoStatus(videoId));
    } catch {
      data = null;
    }

    const status = data?.status as string | undefined;
    if (status === "ready") return { kind: "ready" };
    if (status === "failed") {
      return {
        kind: "failed",
        error: data?.error || "Video processing failed.",
      };
    }
    // pending / processing (or transient fetch error): keep polling.
  }
};

// Begin polling for an accepted video and update the store as the backend
// reports. Creates the ActiveJob if needed. If a job for this id already
// settled, resolve the provided reason immediately.
const trackAndPoll = (
  id: string,
  title: string,
  resolve: (reason: SettleReason) => void
): void => {
  const existing = activeJobs.get(id);
  if (existing) {
    // Another caller already owns this job. If it has settled, resolve the
    // caller immediately with the stored reason; otherwise latch the caller's
    // resolver so it gets notified when the job settles.
    if (existing.settled && existing.reason) {
      resolve(existing.reason);
    } else {
      activeJobs.set(id, { ...existing, resolve });
    }
    return;
  }

  activeJobs.set(id, { id, title, resolve, settled: false });
  store.dispatch(addUpload({ id, title, status: "processing" }));
  persistJobs();

  void (async () => {
    const reason = await pollUntilTerminal(id);
    const job = activeJobs.get(id);
    if (!job) return;
    job.settled = true;
    job.reason = reason;
    if (reason.kind === "ready") {
      store.dispatch(setUploadStatus({ id, status: "ready" }));
    } else if (reason.kind === "failed") {
      store.dispatch(
        setUploadStatus({ id, status: "failed", error: reason.error })
      );
    } else {
      // Timeout is non-terminal: we don't know the backend outcome, so drop
      // the entry instead of labeling it failed. The create page surfaces the
      // timeout via `settled` so the admin can retry if needed.
      store.dispatch(removeUpload(id));
    }
    job.resolve(reason);
    activeJobs.delete(id);
    if (activeJobs.size === 0) clearPersisted();
    else persistJobs();
  })();
};

// Called on app start to re-sync uploads that were in flight before a hard
// refresh. The backend is authoritative, so re-polling by id gives the real
// current status and fires the appropriate notification downstream.
export const initVideoUploadManager = (): void => {
  const persisted = loadPersistedJobs();
  for (const { id, title } of persisted) {
    trackAndPoll(id, title, () => {});
  }
};

// Start a video upload in the background.
//
// Returns:
//  - idPromise: resolves with the new video id once the backend ACCEPTS the
//    job (202). Rejects if the upload itself fails (network/validation).
//  - settled:   resolves with { kind: "ready" } | { kind: "failed" | "timeout", error }
//    once the background processing reaches a terminal state. Never resolves
//    while merely "processing" — so the UI can keep showing an indeterminate
//    spinner without a fake percentage.
export const startVideoUpload = (
  payload: StartVideoUploadPayload
): { idPromise: Promise<string>; settled: Promise<SettleReason> } => {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("description", payload.description);
  formData.append("module", payload.module);
  formData.append("category", payload.category);
  formData.append("video", payload.video);
  formData.append("thumbnail", payload.thumbnail);

  // 1) Upload; wait only for the 202 (accepted) response, not for processing.
  const idPromise = uploadWithProgress(
    API_ENDPOINTS.createVideo,
    formData,
    payload.onProgress
  ).then((data) => {
    const videoId = data?.video?._id || data?.video?.id;
    if (!videoId) {
      throw new Error("Video was accepted but no processing ID was returned.");
    }
    return videoId as string;
  });

  // 2) Once accepted, start background polling. `settled` resolves only at a
  //    terminal state, independent of any React page lifecycle.
  const settled = idPromise.then(
    (id) =>
      new Promise<SettleReason>((resolve) => {
        trackAndPoll(id, payload.title, resolve);
      }),
    (err: unknown) =>
      Promise.resolve<SettleReason>({
        kind: "failed",
        error: err instanceof Error ? err.message : "Video upload failed.",
      })
  );

  return { idPromise, settled };
};

let initialized = false;
export const ensureVideoUploadManager = (): void => {
  if (initialized) return;
  initialized = true;
  initVideoUploadManager();
};
