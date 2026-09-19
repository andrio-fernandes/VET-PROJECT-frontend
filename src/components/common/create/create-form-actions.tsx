// =============================================
// CREATE FORM ACTIONS
//
// Bottom action row of the Video / FAQ / Blog create (and edit) forms:
// Preview on the left, Cancel + submit on the right. Rendered inside the
// <form> so the submit button submits via the page's form handler. Each page
// passes its own button/wrapper classes to keep the existing styling.
// =============================================

import React from 'react';
import { Button, Space } from 'antd';

interface CreateFormActionsProps {
  onPreview: () => void;
  onCancel: () => void;
  loading: boolean;
  /** Submit button label ("Create" / "Save Changes" ...). */
  submitLabel: string;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
  previewButtonClassName?: string;
  previewDisabled?: boolean;
  cancelButtonClassName?: string;
  cancelDisabled?: boolean;
  cancelDanger?: boolean;
  cancelStyle?: React.CSSProperties;
  submitButtonClassName?: string;
  submitStyle?: React.CSSProperties;
}

export const CreateFormActions: React.FC<CreateFormActionsProps> = ({
  onPreview,
  onCancel,
  loading,
  submitLabel,
  wrapperClassName,
  wrapperStyle = wrapperClassName
    ? undefined
    : {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
      },
  previewButtonClassName,
  previewDisabled,
  cancelButtonClassName,
  cancelDisabled = false,
  cancelDanger = false,
  cancelStyle,
  submitButtonClassName,
  submitStyle,
}) => (
  <div style={wrapperStyle} className={wrapperClassName}>
    <Button
      size="large"
      onClick={onPreview}
      disabled={previewDisabled}
      className={previewButtonClassName}
    >
      Preview
    </Button>

    <Space size="middle">
      <Button
        size="large"
        onClick={onCancel}
        danger={cancelDanger}
        disabled={cancelDisabled || loading}
        style={cancelStyle}
        className={cancelButtonClassName}
      >
        Cancel
      </Button>
      <Button
        type="primary"
        htmlType="submit"
        size="large"
        loading={loading}
        disabled={loading}
        style={submitStyle}
        className={submitButtonClassName}
      >
        {submitLabel}
      </Button>
    </Space>
  </div>
);