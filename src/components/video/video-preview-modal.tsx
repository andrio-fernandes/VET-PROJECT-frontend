/* eslint-disable @next/next/no-img-element */
/* =============================================
   VIDEO PREVIEW MODAL

   Preview dialog for the Create/Edit Video form: plays the picked or existing
   video full-screen and shows the title/description/thumbnail info card. The
   caller owns the open state and the object-URL cleanup on close.
   ============================================= */

import React from "react";
import { Modal, Typography } from "antd";

const { Title, Paragraph } = Typography;

export interface VideoPreviewData {
  src: string;
  title: string;
  description: string;
  thumbnail?: string;
}

interface VideoPreviewModalProps {
  open: boolean;
  data: VideoPreviewData | null;
  onClose: () => void;
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  open,
  data,
  onClose,
}) => (
  <Modal
    open={open}
    title="Video preview"
    onCancel={onClose}
    centered
    width={860}
    footer={null}
    styles={{
      mask: {
        backdropFilter: 'blur(6px)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
      },
    }}
  >
    {open && data && data.src && (
      <div className="vc-preview-modal">
        <video
          className="vc-preview-video"
          controls
          autoPlay
          src={data.src}
          disablePictureInPicture
          controlsList="nodownload"
        />
        {(data.title || data.description || data.thumbnail) && (
          <div className="vc-preview-info">
            <div className="vc-preview-info-head">
              {data.thumbnail && (
                <img
                  src={data.thumbnail}
                  alt={data.title}
                  className="vc-preview-thumb"
                />
              )}
              <div className="vc-preview-info-text">
                {data.title && (
                  <Title level={4} className="vc-preview-name">
                    {data.title}
                  </Title>
                )}
                <Paragraph className="vc-preview-desc">
                  {data.description || "No description provided."}
                </Paragraph>
              </div>
            </div>
          </div>
        )}
      </div>
    )}
  </Modal>
);