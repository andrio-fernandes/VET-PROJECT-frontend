// =============================================
// VIDEO UPLOAD NOTIFICATIONS
//
// A tiny app-wide subscriber that watches the videoUpload slice (the
// backend-mirroring cache) and emits an Ant Design notification whenever a
// background upload *transitions* to a terminal state during this app
// session.
//
// Dedup: we keep a module-level map of the last observed status per video id
// and only fire when an entry flips to ready/failed. This means:
//  - a single job never fires a duplicate toast,
//  - a job that was already ready/failed on app load (e.g. resumed after a
//    refresh) does not re-notify,
//  - returning to the dashboard after completion does not re-notify.
// =============================================

import React, { useRef } from "react";
import { App as AntApp } from "antd";
import { useAppSelector } from "@/redux/hooks";
import { selectVideoUploads } from "@/redux/videoUpload/selectors";

// Last observed status per video id, across this JS session.
const prevStatus = new Map<string, string>();

const VideoUploadNotifications = () => {
  const { notification } = AntApp.useApp();
  const uploads = useAppSelector(selectVideoUploads);

  const notificationRef = useRef(notification);
  React.useLayoutEffect(() => {
    notificationRef.current = notification;
  }, [notification]);

  const entries = React.useMemo(() => Object.values(uploads), [uploads]);

  React.useEffect(() => {
    for (const entry of entries) {
      const previous = prevStatus.get(entry.id);
      prevStatus.set(entry.id, entry.status);

      // Only notify on a real transition into ready/failed this session.
      if (previous === entry.status) continue;
      if (entry.status === "ready") {
        notificationRef.current.success({
          message: "Video created successfully",
          placement: "topRight",
        });
      } else if (entry.status === "failed") {
        notificationRef.current.error({
          message: "Video processing failed",
          description:
            entry.error ||
            `"${entry.title}" could not be processed. Please retry.`,
          placement: "topRight",
        });
      }
    }
  }, [entries]);

  return null;
};

export default VideoUploadNotifications;