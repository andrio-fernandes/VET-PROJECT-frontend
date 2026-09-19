// =============================================
// THUMBNAIL UPLOAD
//
// Dashed upload area for the blog thumbnail image, with validation,
// preview (with remove) and error display. The caller owns the state.
// Includes a crop modal so users can adjust the thumbnail before saving.
// =============================================

import React, { useState } from 'react';
import { Button, Typography, Upload } from 'antd';
import { CloseOutlined, UploadOutlined } from '@ant-design/icons';

import { THUMBNAIL_ACCEPT, THUMBNAIL_MAX_BYTES } from '@/constants/blog';
import type { PickedImage } from '@/types/blog';
import ThumbnailCropModal from '@/components/common/thumbnail-crop-modal';

const { Text } = Typography;

interface ThumbnailUploadProps {
  thumbnail: PickedImage | null;
  /** Existing server thumbnail shown in edit mode (kept until replaced). */
  existingThumbnail?: { name: string; url: string } | null;
  error: string;
  onChange: (file: File) => void;
  onRemove: () => void;
}

export const ThumbnailUpload: React.FC<ThumbnailUploadProps> = ({
  thumbnail,
  existingThumbnail,
  error,
  onChange,
  onRemove,
}) => {
  const showExisting = !thumbnail && existingThumbnail?.url;

  const [cropOpen, setCropOpen] = useState(false);
  const [pendingCropSrc, setPendingCropSrc] = useState<string>('');

  const handleFileSelect = (_file: File) => {
    const url = URL.createObjectURL(_file);
    setPendingCropSrc(url);
    setCropOpen(true);
  };

  const handleCropConfirm = (file: File) => {
    setCropOpen(false);
    URL.revokeObjectURL(pendingCropSrc);
    setPendingCropSrc('');
    onChange(file);
  };

  const handleCropCancel = () => {
    setCropOpen(false);
    URL.revokeObjectURL(pendingCropSrc);
    setPendingCropSrc('');
  };

  const renderPreview = (
    src: string | undefined,
    alt: string,
    name: string,
    removable = false
  ) => (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          position: 'relative',
          width: 260,
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid #e8e8e8',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }}
        />
        {removable && (
          <Button
            size="small"
            shape="circle"
            icon={<CloseOutlined />}
            onClick={onRemove}
            style={{ position: 'absolute', top: 6, right: 6 }}
          />
        )}
        <div
          style={{ padding: '6px 10px', fontSize: 12, color: '#595959', textAlign: 'left' }}
        >
          {name}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="blog-upload-area">
        {thumbnail ? (
          renderPreview(thumbnail.url, thumbnail.name, thumbnail.name, true)
        ) : showExisting ? (
          <div>
            {renderPreview(
              existingThumbnail?.url,
              existingThumbnail?.name || 'Current thumbnail',
              existingThumbnail?.name || 'Current thumbnail'
            )}
            <div style={{ marginTop: 12 }}>
              <Upload
                accept={THUMBNAIL_ACCEPT}
                showUploadList={false}
                beforeUpload={(_file, fileList) => {
                  if (fileList[0] === _file) {
                    handleFileSelect(_file);
                  }
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />} size="large" className="blog-outline-button">
                  Replace
                </Button>
              </Upload>
            </div>
          </div>
        ) : (
          <>
            <Upload
              accept={THUMBNAIL_ACCEPT}
              showUploadList={false}
              beforeUpload={(_file, fileList) => {
                if (fileList[0] === _file) {
                  handleFileSelect(_file);
                }
                return false;
              }}
            >
              <Button icon={<UploadOutlined />} size="large" className="blog-outline-button">
                Upload
              </Button>
            </Upload>
            <div className="blog-upload-hint">
              Maximum file {THUMBNAIL_MAX_BYTES / (1024 * 1024)}MB | PNG, JPG | Free crop
            </div>
          </>
        )}
      </div>
      {error && (
        <Text type="danger" className="blog-field-error">
          {error}
        </Text>
      )}
      {cropOpen && (
        <ThumbnailCropModal
          open={cropOpen}
          imageSrc={pendingCropSrc}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
    </>
  );
};
