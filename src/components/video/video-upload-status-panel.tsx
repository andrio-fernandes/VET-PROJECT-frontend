/* =============================================
   VIDEO UPLOAD STATUS PANEL

   Feedback shown under the Create/Edit Video form while media reaches
   Cloudinary: either the failed-upload banner (with a Retry button) or the
   per-phase progress bar. The caller owns the state and retry handler.
   ============================================= */

import React from "react";
import { Button, Progress, Typography } from "antd";

const { Text } = Typography;

interface VideoUploadStatusPanelProps {
  uploadFailed: string | null;
  uploadProgress: { phase: "video" | "thumbnail"; percent: number } | null;
  onRetry: () => void;
}

export const VideoUploadStatusPanel: React.FC<VideoUploadStatusPanelProps> = ({
  uploadFailed,
  uploadProgress,
  onRetry,
}) => (
  <>
    {uploadFailed && (
      <div className="vc-upload-failed">
        <Text type="danger">Upload failed: {uploadFailed}</Text>
        <Button
          danger
          size="small"
          className="vc-retry-btn"
          onClick={onRetry}
        >
          Retry
        </Button>
      </div>
    )}

    {uploadProgress && !uploadFailed && (
      <div className="vc-upload-status">
        <Progress
          percent={uploadProgress.percent}
          size="small"
          status="active"
          style={{ width: 240 }}
        />
        <Text className="vc-upload-label">
          {uploadProgress.phase === "thumbnail"
            ? "Uploading thumbnail..."
            : "Uploading video..."}
        </Text>
      </div>
    )}
  </>
);