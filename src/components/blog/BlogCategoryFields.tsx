// =============================================
// BLOG CATEGORY FIELDS
//
// "Select module and categories" section of the Create Blog form: the Module
// and Feature dropdowns, wired to React Hook Form via its Controller.
// =============================================

import React from 'react';
import { Controller, useWatch } from 'react-hook-form';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { Divider, Select, Typography } from 'antd';

import {
  CONTENT_MODULES,
  MODULE_CATEGORIES,
  type ContentCategory,
  type ContentModule,
} from '@/constants';
import { RequiredLabel } from '@/components/blog/RequiredLabel';
import type { BlogFormValues } from '@/hooks/useBlogDraft';

const { Title, Text } = Typography;

interface BlogCategoryFieldsProps {
  control: Control<BlogFormValues>;
  trackChange: (setter: (value: unknown) => void) => (value: unknown) => void;
  setValue: UseFormSetValue<BlogFormValues>;
}

export const BlogCategoryFields: React.FC<BlogCategoryFieldsProps> = ({
  control,
  trackChange,
  setValue,
}) => {
  const selectedModule = useWatch({ control, name: 'module' });

  // On module change, clear the previously selected category (same as FAQ page).
  const moduleChange = (setter: (value: unknown) => void) => (value: unknown) => {
    setter(value);
    setValue('category', '', { shouldDirty: true });
  };

  return (
    <>
    <Title level={5} className="blog-section-label" style={{ margin: '0 0 2px 0' }}>
      Select the module and categories <span className="blog-required">*</span>
    </Title>
    <Text type="secondary" className="blog-section-hint">
      Select the module where the blog should be placed
    </Text>

    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 220, marginBottom: 8 }}>
        <Controller
          name="module"
          control={control}
          rules={{ required: 'Please select a module' }}
          render={({ field, fieldState }) => (
            <>
              <RequiredLabel label="Module" />
              <Select
                {...field}
                value={field.value || undefined}
                onChange={trackChange(moduleChange(field.onChange))}
                options={CONTENT_MODULES.map((m) => ({ value: m, label: m }))}
                placeholder="Select module"
                size="large"
                status={fieldState.error ? 'error' : undefined}
                style={{ width: '100%' }}
              />
              {fieldState.error && (
                <div className="blog-field-error">{fieldState.error.message}</div>
              )}
            </>
          )}
        />
      </div>

      <div style={{ flex: 1, minWidth: 220, marginBottom: 8 }}>
        <Controller
          name="category"
          control={control}
          rules={{ required: 'Please select a category' }}
          render={({ field, fieldState }) => (
            <>
              <RequiredLabel label="Category" />
              <Select
                {...field}
                value={field.value || undefined}
                onChange={trackChange(field.onChange)}
                options={(selectedModule ? (MODULE_CATEGORIES[selectedModule as ContentModule] ?? []) : []).map((c: ContentCategory) => ({
                  value: c,
                  label: c,
                }))}
                placeholder={selectedModule ? 'Select category' : 'Select a module first'}
                disabled={!selectedModule}
                size="large"
                status={fieldState.error ? 'error' : undefined}
                style={{ width: '100%' }}
              />
              {fieldState.error && (
                <div className="blog-field-error">{fieldState.error.message}</div>
              )}
            </>
          )}
        />
      </div>
    </div>

    <Divider className="blog-divider" />
  </>
  );
};
