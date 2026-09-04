// =============================================
// ATTACHMENT UPLOAD
//
// Dashed upload area for blog attachments: lists the selected files with a
// remove button, plus an upload button and validation error display.
// =============================================

import React from 'react';
import { Button, Space, Typography, Upload } from 'antd';
import { DeleteOutlined, PaperClipOutlined, UploadOutlined } from '@ant-design/icons';

import { ATTACHMENT_ACCEPT, ATTACHMENT_MAX_BYTES, GREEN } from '@/constants/blog';
import type { PickedAttachment } from '@/types/blog';

const { Text } = Typography;

interface AttachmentUploadProps {
  attachments: PickedAttachment[];
  /** Existing (server) attachments shown in edit mode. */
  existingAttachments?: { name: string; url: string }[];
  error: string;
  onChange: (file: File) => void;
  onRemove: (index: number) => void;
  onRemoveExisting: (index: number) => void;
}

export const AttachmentUpload: React.FC<AttachmentUploadProps> = ({
  attachments,
  existingAttachments = [],
  error,
  onChange,
  onRemove,
  onRemoveExisting,
}) => {
  const total = existingAttachments.length + attachments.length;

  return (
    <>
      <div className="blog-upload-area">
        {existingAttachments.map((att, index) => (
          <div key={`existing-${index}`} className="blog-attachment-row">
            <Space className="blog-attachment-name">
              <PaperClipOutlined style={{ fontSize: 20, color: GREEN }} />
              <span style={{ fontSize: 14 }}>{att.name}</span>
            </Space>
            <Button
              size="small"
              shape="circle"
              icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
              onClick={() => onRemoveExisting(index)}
            />
          </div>
        ))}
        {attachments.map((att, index) => (
          <div key={`new-${index}`} className="blog-attachment-row">
            <Space className="blog-attachment-name">
              <PaperClipOutlined style={{ fontSize: 20, color: GREEN }} />
              <span style={{ fontSize: 14 }}>{att.name}</span>
            </Space>
            <Button
              size="small"
              shape="circle"
              icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
              onClick={() => onRemove(index)}
            />
          </div>
        ))}
        <div className="blog-attachment-upload">
          <Upload
            accept={ATTACHMENT_ACCEPT}
            showUploadList={false}
            multiple
            beforeUpload={(_file, fileList) => {
              for (const f of fileList) {
                onChange(f);
              }
              return false;
            }}
          >
            <Button
              icon={<UploadOutlined />}
              size="large"
              className="blog-upload-button"
              disabled={total >= 5}
            >
              Upload
            </Button>
          </Upload>
        </div>
        <div className="blog-upload-hint">
          Maximum file {ATTACHMENT_MAX_BYTES / (1024 * 1024)}MB | Supported format: Excel, PDF, DOC, PNG
        </div>
      </div>
      {error && (
        <Text type="danger" className="blog-field-error">
          {error}
        </Text>
      )}
    </>
  );
};
