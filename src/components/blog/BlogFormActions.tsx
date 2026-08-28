// =============================================
// BLOG FORM ACTIONS
//
// Bottom action row of the Create Blog form: Preview, Cancel and the Create
// submit button. Rendered inside the <form> so the Create button submits via
// React Hook Form's handleSubmit.
// =============================================

import React from 'react';
import { Button, Space } from 'antd';

interface BlogFormActionsProps {
  handlePreview: () => void;
  onCancel: () => void;
  loading: boolean;
  /** Submit button label ("Create" for new blogs, "Save Changes" for edits). */
  submitLabel?: string;
}

export const BlogFormActions: React.FC<BlogFormActionsProps> = ({
  handlePreview,
  onCancel,
  loading,
  submitLabel = 'Create',
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    }}
  >
    <Button size="large" onClick={handlePreview} className="blog-outline-button">
      Preview
    </Button>

    <Space size="middle">
      <Button
        size="large"
        danger
        onClick={onCancel}
        style={{ borderRadius: 6, padding: '0 24px' }}
      >
        Cancel
      </Button>
      <Button
        type="primary"
        htmlType="submit"
        size="large"
        loading={loading}
        disabled={loading}
        className="blog-green-button"
        style={{ padding: '0 36px' }}
      >
        {submitLabel}
      </Button>
    </Space>
  </div>
);
