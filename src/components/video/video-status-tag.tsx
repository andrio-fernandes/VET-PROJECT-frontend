import { Tag } from "antd";
import type { VideoProcessingStatus } from "@/types/video";

type StatusKey = VideoProcessingStatus | "uploading";

// Human-friendly label + color for a video's backend-processing status.
const STATUS_META: Record<StatusKey, { label: string; color: string }> = {
  uploading: { label: "Uploading...", color: "processing" },
  processing: { label: "Processing...", color: "processing" },
  ready: { label: "Ready", color: "success" },
  failed: { label: "Failed", color: "error" },
  pending: { label: "Pending", color: "default" },
};

interface VideoStatusTagProps {
  status?: StatusKey;
}

const VideoStatusTag = ({ status }: VideoStatusTagProps) => {
  const meta = STATUS_META[status || "pending"];
  if (!meta) return null;
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

export default VideoStatusTag;
