/* =============================================
   UPLOAD IN PROGRESS MODAL

   "Upload in progress" dialog shown when the user tries to leave the
   Create/Edit Video page (or clicks Cancel) while the browser is still
   pushing bytes to Cloudinary. The caller owns the open state and the
   stay/leave decisions.
   ============================================= */

import React from "react";
import { Button, Modal, Space } from "antd";

interface UploadInProgressModalProps {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export const UploadInProgressModal: React.FC<UploadInProgressModalProps> = ({
  open,
  onStay,
  onLeave,
}) => (
  <Modal
    open={open}
    title="Upload in progress"
    onCancel={onStay}
    closable
    mask={{ closable: false }}
    footer={
      <Space>
        <Button type="primary" onClick={onStay}>
          Keep Uploading
        </Button>
        <Button danger onClick={onLeave}>
          Leave Anyway
        </Button>
      </Space>
    }
  >
    <p>
      Your video is still uploading. If you leave now, the video will not
      be created. Do you want to keep uploading?
    </p>
  </Modal>
);