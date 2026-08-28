// =============================================
// BLOG DETAILS FIELDS
//
// "Blog Details" section of the Create Blog form: the Title and Description
// text fields, wired to React Hook Form via its Controller.
// =============================================

import React from 'react';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { Divider, Input, Typography } from 'antd';

import { DESCRIPTION_MAX_WORDS, TITLE_MAX_WORDS } from '@/constants/blog';
import {
  rhfDescriptionRules,
  rhfTitleRules,
  wordCountFormatter,
} from '@/utils/validation';
import { RequiredLabel } from '@/components/blog/RequiredLabel';
import type { BlogFormValues } from '@/hooks/useBlogDraft';

const { Title } = Typography;

interface BlogDetailsFieldsProps {
  control: Control<BlogFormValues>;
  trackChange: (setter: (value: unknown) => void) => (value: unknown) => void;
}

export const BlogDetailsFields: React.FC<BlogDetailsFieldsProps> = ({
  control,
  trackChange,
}) => (
  <>
    <Title level={5} className="blog-section-label" style={{ margin: '0 0 18px 0' }}>
      Blog Details
    </Title>

    <Controller
      name="title"
      control={control}
      rules={rhfTitleRules}
      render={({ field, fieldState }) => (
        <>
          <RequiredLabel label="Title" />
          <Input
            value={field.value ?? ''}
            onChange={(e) => trackChange(field.onChange)(e.target.value)}
            placeholder="Enter blog title"
            size="large"
            style={{ borderRadius: 6 }}
            status={fieldState.error ? 'error' : undefined}
            showCount={{ formatter: wordCountFormatter(TITLE_MAX_WORDS) }}
          />
          {fieldState.error && (
            <div className="blog-field-error">{fieldState.error.message}</div>
          )}
        </>
      )}
    />

    <div style={{ height: 4 }} />

    <Controller
      name="description"
      control={control}
      rules={rhfDescriptionRules}
      render={({ field, fieldState }) => (
        <>
          <RequiredLabel label="Description" />
          <Input.TextArea
            value={field.value ?? ''}
            onChange={(e) => trackChange(field.onChange)(e.target.value)}
            placeholder="Describe your blog..."
            rows={3}
            style={{ borderRadius: 6, resize: 'none' }}
            status={fieldState.error ? 'error' : undefined}
            showCount={{ formatter: wordCountFormatter(DESCRIPTION_MAX_WORDS) }}
          />
          {fieldState.error && (
            <div className="blog-field-error">{fieldState.error.message}</div>
          )}
        </>
      )}
    />

    <Divider className="blog-divider" />
  </>
);
