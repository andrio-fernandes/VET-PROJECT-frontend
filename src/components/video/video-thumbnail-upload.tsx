/* eslint-disable @next/next/no-img-element */
/* =============================================
   VIDEO THUMBNAIL UPLOAD

   Thumbnail dropzone for the Create/Edit Video form. Validates type and size,
   then hands a valid file to the caller's onFileChange (the caller owns the
   state). Shows the newly picked preview, the existing server thumbnail in
   edit mode, or the default thumbnail.
   ============================================= */

import React from "react";
import { App as AntApp, Button, Form, Upload } from "antd";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { MAX_THUMBNAIL_SIZE } from "@/constants";
import { contentThumbnail } from "@/utils/media";

interface VideoThumbnailUploadProps {
  thumbnail: File | null;
  thumbnailPreview: string;
  existingThumbnailUrl: string;
  editMode: boolean;
  onFileChange: (file: File) => void;
  onRemove: () => void;
}

export const VideoThumbnailUpload: React.FC<VideoThumbnailUploadProps> = ({
  thumbnail,
  thumbnailPreview,
  existingThumbnailUrl,
  editMode,
  onFileChange,
  onRemove,
}) => {
  const { message } = AntApp.useApp();

  const beforeUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      message.error("Please select an image file for the thumbnail.");
      return Upload.LIST_IGNORE;
    }

    if (file.size > MAX_THUMBNAIL_SIZE) {
      message.error("Thumbnail size must not exceed 5 MB.");
      return Upload.LIST_IGNORE;
    }

    onFileChange(file);
    return false;
  };

  return (
    <Form.Item
      label={<span className="create-label">Upload Thumbnail</span>}
      className="vc-thumb-block"
    >
      <div className="create-hint">
        Choose a visual cover for your video (16:9). Optional — a default
        thumbnail is used if you skip this.
      </div>

      <Upload.Dragger
        accept="image/*"
        beforeUpload={beforeUpload}
        showUploadList={false}
        multiple={false}
        className="thumbnail-upload"
      >
        {thumbnail ? (
          <div className="selected-thumbnail">
            <img
              src={thumbnailPreview}
              alt="Thumbnail preview"
              className="thumbnail-preview"
            />
            <span className="thumbnail-name">{thumbnail.name}</span>

            <Button
              danger
              type="link"
              icon={<DeleteOutlined />}
              className="thumbnail-remove-btn remove-file-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              Remove
            </Button>
          </div>
        ) : editMode && existingThumbnailUrl ? (
          <div className="selected-thumbnail">
            <img
              src={contentThumbnail(existingThumbnailUrl)}
              alt="Current thumbnail"
              className="thumbnail-preview"
            />
            <span className="thumbnail-name">Current thumbnail</span>
            <span className="thumbnail-replace-hint">Click to replace</span>
          </div>
        ) : editMode ? (
          <div className="selected-thumbnail">
            <img
              src={contentThumbnail()}
              alt="Default thumbnail"
              className="thumbnail-preview"
            />
            <span className="thumbnail-name">Default thumbnail</span>
            <span className="thumbnail-replace-hint">Click to replace</span>
          </div>
        ) : (
          <Button
            icon={<UploadOutlined />}
            className="upload-button"
          >
            Upload Thumbnail
          </Button>
        )}
      </Upload.Dragger>

      <div className="upload-info">
        Maximum file 5MB | Supported format: JPG, PNG
      </div>
    </Form.Item>
  );
};