import React from 'react';
import { Modal, Typography } from 'antd';

const { Text } = Typography;

interface FaqPreviewModalProps {
  open: boolean;
  question?: string;
  answer?: string;
  onClose: () => void;
}

// Shared preview dialog for the FAQ create/edit forms. The reactive question
// and answer values are passed in so the preview stays in sync while typing.
export const FaqPreviewModal: React.FC<FaqPreviewModalProps> = ({
  open,
  question,
  answer,
  onClose,
}) => (
  <Modal
    open={open}
    onCancel={onClose}
    footer={null}
    width={736}
    centered
    styles={{
      mask: {
        backdropFilter: 'blur(6px)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
      },
      body: { borderRadius: '12px', padding: '24px' },
    }}
  >
    <div>
      <div className="faqs-create-block">
        <Text className="faqs-create-preview-label faqs-create-preview-label-q">
          Question
        </Text>
        <Text strong className="faqs-create-preview-question">
          {question || 'Your question will appear here?'}
        </Text>
      </div>

      <div className="faqs-create-preview-answer-block">
        <Text className="faqs-create-preview-label">
          Answer
        </Text>
      </div>
      <div className="faqs-create-preview-answer-box">
        <Text className="faqs-create-preview-answer">
          {answer || 'Your answer description will appear here.'}
        </Text>
      </div>
    </div>
  </Modal>
);