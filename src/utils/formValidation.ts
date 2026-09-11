import type { FormInstance } from 'antd';
import { countWords } from '@/constants';

// Shared validation helper for the Question/Answer word-count rules used by
// the FAQ create and edit forms. min/max bound the allowed word count and
// subject names the field in the rejection message.
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

// Scrolls the form to the first failing field on submit. Replaces the
// otherwise duplicated onFinishFailed body across the create/edit forms.
export const scrollToFirstError = (
  form: FormInstance,
  errorFields?: { name: Parameters<FormInstance['scrollToField']>[0] }[]
) => {
  if (errorFields && errorFields.length) {
    form.scrollToField(errorFields[0].name, { behavior: 'smooth', block: 'center' });
  }
};

// Shared form reset behaviour when the selected module changes: the category
// is always cleared so users have to pick a category valid for the module.
export const resetCategoryOnModuleChange =
  (form: FormInstance) => (changedValues: { module?: string }) => {
    if ('module' in changedValues) {
      form.setFieldsValue({ category: undefined });
    }
  };