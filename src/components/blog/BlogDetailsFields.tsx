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

import { DESCRIPTION_MAX_WORDS, TITLE_MAX_WORDS } from '@/constants';
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
    <Title level={5} className="create-card-title">
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
            id="blog-title"
            value={field.value ?? ''}
            onChange={(e) => trackChange(field.onChange)(e.target.value)}
            placeholder="Enter blog title"
            size="large"
            className="create-input"
            status={fieldState.error ? 'error' : undefined}
          />
          <div className="word-counter">
            {wordCountFormatter(TITLE_MAX_WORDS)({ value: field.value ?? '' })} word
          </div>
          {fieldState.error && (
            <div className="blog-field-error">{fieldState.error.message}</div>
          )}
        </>
      )}
    />

    <div style={{ height: 24 }} />

    <Controller
      name="description"
      control={control}
      rules={rhfDescriptionRules}
      render={({ field, fieldState }) => (
        <>
          <RequiredLabel label="Description" />
          <Input.TextArea
            id="blog-description"
            value={field.value ?? ''}
            onChange={(e) => trackChange(field.onChange)(e.target.value)}
            placeholder="Describe your blog..."
            rows={4}
            size="large"
            className="create-textarea"
            status={fieldState.error ? 'error' : undefined}
          />
          <div className="word-counter">
            {wordCountFormatter(DESCRIPTION_MAX_WORDS)({ value: field.value ?? '' })} word
          </div>
          {fieldState.error && (
            <div className="blog-field-error">{fieldState.error.message}</div>
          )}
        </>
      )}
    />

    <Divider className="create-divider" />
  </>
);
