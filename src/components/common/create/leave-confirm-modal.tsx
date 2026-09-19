// =============================================
// LEAVE CONFIRM MODAL
//
// Shared "You have unsaved changes" dialog shown when leaving a create/edit
// page with unsaved content. Identical across the Video, FAQ and Blog pages.
// The page supplies the save/discard handlers (which also navigate).
// =============================================

import React from 'react';
import { Button, Modal, Space } from 'antd';

interface LeaveConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onSave: () => void;
  onDiscard: () => void;
}

export const LeaveConfirmModal: React.FC<LeaveConfirmModalProps> = ({
  open,
  onCancel,
  onSave,
  onDiscard,
}) => (
  <Modal
    open={open}
    title="You have unsaved changes"
    onCancel={onCancel}
    closable
    mask={{ closable: true }}
    footer={
      <Space>
        <Button onClick={onDiscard}>No, Don&apos;t Save</Button>
        <Button type="primary" onClick={onSave}>
          Yes, Save
        </Button>
      </Space>
    }
  >
    <p>Do you want to save your changes before leaving?</p>
  </Modal>
);