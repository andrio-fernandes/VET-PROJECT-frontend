// =============================================
// FAILED-VIDEO NOTIFICATION HELPER
//
// The backend purges stale "failed" video records on GET /videos and reports
// them in the `purged` field. The Videos list and the dashboard both surface
// one popup per purged entry ("Video upload failed") instead of ever
// rendering the (already deleted) row.
//
// Dedup: a module-level Set keeps track of which purged ids we already popped
// during this session, so pagination / filter refetches (which re-fetch the
// purged list from the server) never fire a second notification for the same
// video. Because the backend deleted the row, a full page reload after the
// purge has no record to report again.
// =============================================

import type { PurgedVideo } from "@/types/video";

const notifiedIds = new Set<string>();

interface NotificationApi {
  error: (config: {
    message: string;
    description: string;
    placement?: "topRight";
  }) => void;
}

export const notifyFailedVideos = (
  notification: NotificationApi,
  purged: PurgedVideo[]
): void => {
  for (const entry of purged ?? []) {
    if (!entry || !entry.key) continue;
    if (notifiedIds.has(entry.key)) continue;
    notifiedIds.add(entry.key);

    notification.error({
      message: "Video upload failed",
      description: `"${entry.title || "Untitled video"}" could not be uploaded.`,
      placement: "topRight",
    });
  }
};
