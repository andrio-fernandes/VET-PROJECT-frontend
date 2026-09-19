/* =============================================
   VIDEO FILE UPLOAD

   Video dropzone for the Create/Edit Video form. Validates type and size,
   then hands a valid file to the caller's onFileChange (the caller owns
   the state). Shows the newly picked file, the current server video in
   edit mode, or the empty upload prompt.
   ============================================= */

import React from "react";
import { App as AntApp, Button, Form, Upload } from "antd";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { MAX_VIDEO_SIZE } from "@/constants";

interface VideoFileUploadProps {
  file: File | null;
  existingVideoUrl: string;
  editMode: boolean;
  onFileChange: (file: File) => void;
  onRemove: () => void;
}

export const VideoFileUpload: React.FC<VideoFileUploadProps> = ({
  file,
  existingVideoUrl,
  editMode,
  onFileChange,
  onRemove,
}) => {
  const { message } = AntApp.useApp();

  const beforeUpload = (file: File) => {
    if (!file.type.startsWith("video/")) {
      message.error("Please select a video file.");
      return Upload.LIST_IGNORE;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      message.error("Video size must not exceed 64 MB.");
      return Upload.LIST_IGNORE;
    }

    onFileChange(file);
    return false;
  };

  return (
    <Form.Item
      label={<span className="create-label">Upload Video</span>}
      required
      className="upload-section"
    >
      <div className="create-hint">
        Upload one video
      </div>

      <Upload.Dragger
        accept="video/mp4,video/*"
        beforeUpload={beforeUpload}
        showUploadList={false}
        multiple={false}
        className="video-upload"
      >
        <div className="vc-drop-inner">
          {file ? (
            <>
              <div className="vc-file-select">
                <span className="vc-file-name">{file.name}</span>
                <Button
                  danger
                  type="link"
                  icon={<DeleteOutlined />}
                  className="remove-file-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                >
                  Remove
                </Button>
              </div>
            </>
          ) : editMode && existingVideoUrl ? (
            <>
              <div className="vc-edit-info">
                <span className="vc-file-name">Current video</span>
                <span className="vc-file-replace-hint">Click to replace</span>
              </div>
            </>
          ) : (
            <Button
              icon={<UploadOutlined />}
              className="upload-button"
            >
              Upload Video
            </Button>
          )}
        </div>
      </Upload.Dragger>

      <div className="upload-info">
        Maximum file 64MB | Supported format: MP4
      </div>
    </Form.Item>
  );
};