import type { FormInstance } from 'antd';
import { countWords } from '@/constants';

// Shared word-count validator for FAQ Question/Answer fields.
export const wordCountValidator =
  (min: number, max: number, subject: string) =>
  (_rule: unknown, value?: string) => {
    if (!value) return Promise.resolve();
    const wordCount = countWords(value);
    if (wordCount < min) {
      return Promise.reject(`${subject} must contain at least ${min} words.`);
    }
    if (wordCount > max) {
      return Promise.reject(`${subject} must not exceed ${max} words.`);
    }
    return Promise.resolve();
  };

// Scrolls to the first failing field on form submit.
export const scrollToFirstError = (
  form: FormInstance,
  errorFields?: { name: Parameters<FormInstance['scrollToField']>[0] }[]
) => {
  if (errorFields && errorFields.length) {
    form.scrollToField(errorFields[0].name, { behavior: 'smooth', block: 'center' });
  }
};

// Clears category when module changes so users pick a valid category.
export const resetCategoryOnModuleChange =
  (form: FormInstance) => (changedValues: { module?: string }) => {
    if ('module' in changedValues) {
      form.setFieldsValue({ category: undefined });
    }
  };