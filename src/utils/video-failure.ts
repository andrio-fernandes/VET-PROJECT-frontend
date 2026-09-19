// Video upload failure notification helper.
// Deduplicates notifications per session using a Set of purged IDs.

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
