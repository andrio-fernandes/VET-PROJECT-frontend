import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Typography, Modal, App as AntApp } from 'antd';
import { useRouter } from 'next/router';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { createFaq } from '@/services/faqService';
import { ROUTE_PATHS, RETAINED_FAQ_STORAGE_KEY, countWords } from '@/constants';
import WordCount from '@/components/WordCount';
import ModuleCategorySelects from '@/components/ModuleCategorySelects';
import { CreateContentLayout } from '@/components/common/create/CreateContentLayout';
import { CreatePageHeader } from '@/components/common/create/CreatePageHeader';
import { CreateFormActions } from '@/components/common/create/CreateFormActions';
import { useUnsavedNavigation } from '@/hooks/useUnsavedNavigation';

const { Title, Text } = Typography;

const UploadFAQ = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { message } = AntApp.useApp();

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const retainedDataRef = useRef<string | null>(null);

  const nav = useUnsavedNavigation({ router, isDirty });

  // Reactive values so the preview popover stays in sync while typing.
  const questionValue = Form.useWatch('question', form);
  const answerValue = Form.useWatch('answer', form);

  useEffect(() => {
    const retainedData = localStorage.getItem(RETAINED_FAQ_STORAGE_KEY);
    if (!retainedData) return;
    // Defer into a microtask so the setState is not called synchronously
    // within the effect body (avoids the React Compiler rule), while still
    // showing the restore prompt on first mount with the same behavior.
    queueMicrotask(() => {
      retainedDataRef.current = retainedData;
      setRestoreOpen(true);
    });
  }, [form, message]);

  const handleValuesChange = (changedValues: any, allValues: any) => {
    setIsDirty(true);
    if ('module' in changedValues) {
      form.setFieldsValue({ category: undefined });
    }
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

  const confirmRestoreDraft = () => {
    if (retainedDataRef.current) {
      form.setFieldsValue(JSON.parse(retainedDataRef.current));
      retainedDataRef.current = null;
      message.info('Restored your previous unsaved progress.');
    }
    setRestoreOpen(false);
  };

  const confirmDiscardDraft = () => {
    localStorage.removeItem(RETAINED_FAQ_STORAGE_KEY);
    retainedDataRef.current = null;
    setRestoreOpen(false);
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

  const previewContent = (
    <div>
      <div className="faqs-create-block">
        <Text className="faqs-create-preview-label faqs-create-preview-label-q">
          Question
        </Text>
        <Text strong className="faqs-create-preview-question">
          {questionValue || 'Your question will appear here?'}
        </Text>
      </div>

      <div className="faqs-create-preview-answer-block">
        <Text className="faqs-create-preview-label">
          Answer
        </Text>
      </div>
      <div className="faqs-create-preview-answer-box">
        <Text className="faqs-create-preview-answer">
          {answerValue || 'Your answer description will appear here.'}
        </Text>
      </div>
    </div>
  );

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
                if (errorFields && errorFields.length) {
                  form.scrollToField(errorFields[0].name, { behavior: 'smooth', block: 'center' });
                }
              }}
            >
              <Form.Item label={<span className="create-label">Question</span>} name="question" required rules={[
                { required: true, message: 'Please Enter The Question' },
                // { min: 5, message: 'Question must be at least 5 characters' },
                {
                  validator: (_rule, value) => {
                    if (!value) return Promise.resolve();
                    const wordCount = countWords(value);
                    if (wordCount < 5) return Promise.reject('Question must contain at least 5 words.');
                    if (wordCount > 30) return Promise.reject('Question must not exceed 30 words.');
                    return Promise.resolve();
                  },
                },
              ]}>
                <Input placeholder="Enter question" maxLength={200} size="large" className="create-input" />
              </Form.Item>

              <WordCount value={questionValue} max={30} />

              <Form.Item label={<span className="create-label">Answer</span>} name="answer" required rules={[
                { required: true, message: 'Please provide an answer' },
                // { min: 10, message: 'Answer must be at least 10 characters' },
                {
                  validator: (_rule, value) => {
                    if (!value) return Promise.resolve();
                    const wordCount = countWords(value);
                    if (wordCount < 10) return Promise.reject('Answer must contain at least 10 words.');
                    if (wordCount > 60) return Promise.reject('Answer must not exceed 60 words.');
                    return Promise.resolve();
                  },
                },
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
                  onPreview={() => setPreviewVisible(true)}
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
              <Modal
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={null}
                width={736}
                centered
                styles={{
                  mask: {
                    backdropFilter: 'blur(6px)',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  },
                  body: { borderRadius: '12px', padding: '24px' },
                }}
              >
                {previewContent}
              </Modal>
            </Form>
          </div>
    </CreateContentLayout>
  );
};

export default withAdminAuth(UploadFAQ);