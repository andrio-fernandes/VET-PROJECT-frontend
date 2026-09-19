import React, { useState } from 'react';
import { Form, Input, Typography, App as AntApp } from 'antd';
import { useRouter } from 'next/router';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { createFaq } from '@/services/faq-service';
import { ROUTE_PATHS, RETAINED_FAQ_STORAGE_KEY } from '@/constants';
import WordCount from '@/components/word-count';
import ModuleCategorySelects from '@/components/module-category-selects';
import { CreateContentLayout } from '@/components/common/create/create-content-layout';
import { CreatePageHeader } from '@/components/common/create/create-page-header';
import { CreateFormActions } from '@/components/common/create/create-form-actions';
import { FaqPreviewModal } from '@/components/common/faq-preview-modal';
import {
  wordCountValidator,
  scrollToFirstError,
  resetCategoryOnModuleChange,
} from '@/utils/form-validation';
import { useUnsavedNavigation } from '@/hooks/use-unsaved-navigation';
import { useDraftRestore } from '@/hooks/use-draft-restore';

const { Title } = Typography;

const UploadFAQ = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { message } = AntApp.useApp();

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const nav = useUnsavedNavigation({ router, isDirty });

  const { restoreOpen, confirmRestoreDraft, confirmDiscardDraft } = useDraftRestore({
    storageKey: RETAINED_FAQ_STORAGE_KEY,
    form,
    message,
    applyValues: (values) => form.setFieldsValue(values),
  });

  // Reactive values so the preview popover stays in sync while typing.
  const questionValue = Form.useWatch('question', form);
  const answerValue = Form.useWatch('answer', form);

  const handleValuesChange = (changedValues: any, allValues: any) => {
    setIsDirty(true);
    resetCategoryOnModuleChange(form)(changedValues);
    localStorage.setItem(RETAINED_FAQ_STORAGE_KEY, JSON.stringify(allValues));
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await createFaq({
        module: values.module,
        category: values.category,
        question: values.question,
        answer: values.answer,
      });
      message.success('FAQ uploaded successfully!');
      localStorage.removeItem(RETAINED_FAQ_STORAGE_KEY);
      setIsDirty(false);
      setSubmitted(false);
      form.resetFields();
      setPreviewVisible(false);
      nav.skipNextNavigation();
      router.push(ROUTE_PATHS.adminDashboard);
    } catch (error: any) {
      message.error(error.message || 'Failed to upload FAQ');
    } finally {
      setLoading(false);
    }
  };

  const confirmSaveAndLeave = () => {
    const onLeave = nav.confirmLeaveRef.current;
    localStorage.setItem(RETAINED_FAQ_STORAGE_KEY, JSON.stringify(form.getFieldsValue()));
    message.info('Progress saved.');
    nav.dismissLeaveConfirm();
    setIsDirty(false);
    if (onLeave) onLeave();
  };

  const confirmDiscardAndLeave = () => {
    const onLeave = nav.confirmLeaveRef.current;
    localStorage.removeItem(RETAINED_FAQ_STORAGE_KEY);
    nav.dismissLeaveConfirm();
    setIsDirty(false);
    if (onLeave) onLeave();
  };

  const handleCancel = () => {
    const values = form.getFieldsValue();
    const hasContent =
      Boolean(values.question?.trim()) ||
      Boolean(values.answer?.trim()) ||
      Boolean(values.module) ||
      Boolean(values.category);

    if (!hasContent) {
      form.resetFields();
      router.push(ROUTE_PATHS.adminDashboard);
      return;
    }
    nav.openLeaveConfirm(() => {
      form.resetFields();
      router.push(ROUTE_PATHS.adminDashboard);
    });
  };

  return (
    <CreateContentLayout
      pageClassName="create-page"
      innerClassName="create-inner"
      leaveConfirm={{
        open: nav.leaveConfirmOpen,
        onCancel: nav.dismissLeaveConfirm,
        onSave: confirmSaveAndLeave,
        onDiscard: confirmDiscardAndLeave,
      }}
      restoreDraft={{
        open: restoreOpen,
        noun: 'FAQ draft',
        onRestore: confirmRestoreDraft,
        onDiscard: confirmDiscardDraft,
      }}
    >
          {/* Header Section */}
          <CreatePageHeader
            wrapperClassName="create-header"
            bodyClassName="create-header-body"
            titleClassName="create-header-title"
            title="Create New FAQs"
            showBack={true}
            backHref={ROUTE_PATHS.adminDashboard}
            backOnClick={(event) => {
              event.preventDefault();
              router.push(ROUTE_PATHS.adminDashboard);
            }}
          />

          {/* Main Form Card */}
          <div className="create-card">
            <Title level={5} className="create-card-title">FAQ Details</Title>

            <Form
              form={form}
              layout="vertical"
              validateTrigger={submitted ? 'onChange' : 'onSubmit'}
              onFinish={onFinish}
              onValuesChange={handleValuesChange}
              onFinishFailed={({ errorFields }) => {
                setSubmitted(true);
                scrollToFirstError(form, errorFields);
              }}
            >
              <Form.Item label={<span className="create-label">Question</span>} name="question" required rules={[
                { required: true, message: 'Please Enter The Question' },
                // { min: 5, message: 'Question must be at least 5 characters' },
                { validator: wordCountValidator(5, 30, 'Question') },
              ]}>
                <Input placeholder="Enter question" maxLength={200} size="large" className="create-input" />
              </Form.Item>

              <WordCount value={questionValue} max={30} />

              <Form.Item label={<span className="create-label">Answer</span>} name="answer" required rules={[
                { required: true, message: 'Please provide an answer' },
                // { min: 10, message: 'Answer must be at least 10 characters' },
                { validator: wordCountValidator(10, 60, 'Answer') },
              ]}>
                <Input.TextArea placeholder="Describe your answer" maxLength={2000} size="large" rows={4} className="create-textarea" />
              </Form.Item>

              <WordCount value={answerValue} max={60} />

              <div className="create-select-block">
                <div className="create-section-label">
                  Select the module and categories
                  <span className="create-required">*</span>
                </div>
                <div className="create-hint">
                  Select the module and category where your FAQ should be placed
                </div>
                <ModuleCategorySelects
                  showFieldLabels
                  moduleItemClassName="create-select-item"
                  moduleSelectClassName="create-select"
                  categoryItemClassName="create-select-item"
                  categorySelectClassName="create-select"
                  moduleRequiredMessage="Please select a module"
                  categoryRequiredMessage="Please select a category"
                />
              </div>

              <div className="create-divider" />

              <CreateFormActions
                  onPreview={async () => {
                    try {
                      await form.validateFields();
                      setPreviewVisible(true);
                    } catch (err: any) {
                      setSubmitted(true);
                      scrollToFirstError(form, err?.errorFields);
                    }
                  }}
                  onCancel={handleCancel}
                  loading={loading}
                  submitLabel="Create"
                  wrapperClassName="create-footer"
                  previewButtonClassName="create-btn-preview"
                  cancelButtonClassName="create-btn-cancel"
                  cancelDisabled={loading}
                  submitButtonClassName="create-btn-create"
                />

              {/* PREVIEW MODAL */}
              <FaqPreviewModal
                open={previewVisible}
                question={questionValue}
                answer={answerValue}
                onClose={() => setPreviewVisible(false)}
              />
            </Form>
          </div>
    </CreateContentLayout>
  );
};

export default withAdminAuth(UploadFAQ);