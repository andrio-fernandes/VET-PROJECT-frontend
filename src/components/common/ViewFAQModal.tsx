import React from 'react';
import { Modal, Typography } from 'antd';

const { Text } = Typography;

interface ViewFAQModalProps {
  open: boolean;
  question?: string;
  answer?: string;
  onClose: () => void;
}

export function ViewFAQModal({ open, question, answer, onClose }: ViewFAQModalProps) {
  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={null}
      width={736}
      centered
      className="faq-view-modal"
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
            {question}
          </Text>
        </div>

        <div className="faqs-create-preview-answer-block">
          <Text className="faqs-create-preview-label">
            Answer
          </Text>
        </div>
        <div className="faqs-create-preview-answer-box">
          <Text className="faqs-create-preview-answer">
            {answer}
          </Text>
        </div>
      </div>
    </Modal>
  );
}