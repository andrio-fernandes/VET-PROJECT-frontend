// =============================================
// RESTORE DRAFT MODAL
//
// Shared "Restore previous draft?" dialog shown when a saved draft exists on
// a create page. Identical copy across the Video, FAQ and Blog pages; the
// page supplies the noun ("video draft" / "FAQ draft" / "blog draft") and
// the restore/discard handlers.
// =============================================

import React from 'react';
import { Button, Modal, Space } from 'antd';

interface RestoreDraftModalProps {
  open: boolean;
  /** Identifies the draft in the prompt, e.g. "video draft" / "blog draft". */
  noun: string;
  onRestore: () => void;
  onDiscard: () => void;
}

export const RestoreDraftModal: React.FC<RestoreDraftModalProps> = ({
  open,
  noun,
  onRestore,
  onDiscard,
}) => (
  <Modal
    open={open}
    title="Restore previous draft?"
    onCancel={onDiscard}
    closable
    mask={{ closable: true }}
    footer={
      <Space>
        <Button onClick={onDiscard}>No, Start Fresh</Button>
        <Button type="primary" onClick={onRestore}>
          Yes, Restore
        </Button>
      </Space>
    }
  >
    <p>You have a previously unsaved {noun}. Would you like to restore it?</p>
  </Modal>
);