// =============================================
// BLOG CONTENT FIELD
//
// "Blog content" section of the Create Blog form: the rich text editor,
// wired to React Hook Form via its Controller (validation for non-empty text
// included).
// =============================================

import React from 'react';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { Divider, Typography } from 'antd';

import { rhfContentRules } from '@/utils/validation';
import { RichTextEditor } from '@/components/blog/RichTextEditor';
import type { BlogFormValues } from '@/hooks/useBlogDraft';

const { Title } = Typography;

interface BlogContentFieldProps {
  control: Control<BlogFormValues>;
  trackChange: (setter: (value: unknown) => void) => (value: unknown) => void;
}

export const BlogContentField: React.FC<BlogContentFieldProps> = ({
  control,
  trackChange,
}) => (
  <>
    <Title level={5} className="create-section-label">
      Blog content <span className="create-required">*</span>
    </Title>

    <Controller
      name="content"
      control={control}
      rules={rhfContentRules}
      render={({ field, fieldState }) => (
        <>
          <RichTextEditor value={field.value} onChange={trackChange(field.onChange)} contentId="blog-content" />
          {fieldState.error && (
            <div className="blog-field-error">{fieldState.error.message}</div>
          )}
        </>
      )}
    />

    <Divider className="create-divider" />
  </>
);
