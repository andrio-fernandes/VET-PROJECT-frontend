import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Form, Input, Button, Typography, Space, Modal, App as AntApp } from 'antd';
import { useRouter } from 'next/router';
import { AdminLayout } from '@/layouts/AdminLayout';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { createFaq } from '@/services/faqService';
import { ROUTE_PATHS, RETAINED_FAQ_STORAGE_KEY, countWords } from '@/constants';
import WordCount from '@/components/WordCount';
import ModuleCategorySelects from '@/components/ModuleCategorySelects';

const { Title, Text } = Typography;

const UploadFAQ = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { message } = AntApp.useApp();

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const pendingNavRef = useRef<string | null>(null);
  const confirmLeaveRef = useRef<(() => void) | null>(null);
  const retainedDataRef = useRef<string | null>(null);

  // Reactive values so the preview popover stays in sync while typing.
  const questionValue = Form.useWatch('question', form);
  const answerValue = Form.useWatch('answer', form);

  useEffect(() => {
    const retainedData = localStorage.getItem(RETAINED_FAQ_STORAGE_KEY);
    if (retainedData) {
      retainedDataRef.current = retainedData;
      setRestoreOpen(true);
    }
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
    } catch (error: any) {
      message.error(error.message || 'Failed to upload FAQ');
    } finally {
      setLoading(false);
    }
  };

  const openLeaveConfirm = useCallback((onLeave: () => void) => {
    confirmLeaveRef.current = onLeave;
    setConfirmOpen(true);
  }, []);

  const closeLeaveConfirm = () => {
    confirmLeaveRef.current = null;
    setConfirmOpen(false);
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
    const onLeave = confirmLeaveRef.current;
    localStorage.setItem(RETAINED_FAQ_STORAGE_KEY, JSON.stringify(form.getFieldsValue()));
    message.info('Progress saved.');
    setConfirmOpen(false);
    setIsDirty(false);
    if (onLeave) onLeave();
  };

  const confirmDiscardAndLeave = () => {
    const onLeave = confirmLeaveRef.current;
    localStorage.removeItem(RETAINED_FAQ_STORAGE_KEY);
    setConfirmOpen(false);
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
    openLeaveConfirm(() => {
      form.resetFields();
      router.push(ROUTE_PATHS.adminDashboard);
    });
  };

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (!isDirty) return;
      pendingNavRef.current = url;
      openLeaveConfirm(() => {
        pendingNavRef.current = null;
        router.push(url);
      });
      router.events.emit('routeChangeError');
      throw 'Navigation cancelled';
    };
    const handleRouteChangeError = (err: any) => {
      if (err !== 'Navigation cancelled') throw err;
    };
    router.events.on('routeChangeStart', handleRouteChange);
    router.events.on('routeChangeError', handleRouteChangeError);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, [isDirty, router, openLeaveConfirm]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

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
    <AdminLayout>
      <div className="faqs-create-page">
        
        <div className="faqs-create-inner">
          
          {/* Header Section */}
          <div className="faqs-create-header">
            <div className="faqs-create-header-body">
              <Title level={3} className="faqs-create-header-title">
                Create New FAQs 
              </Title>
              {/* <Text type="secondary" style={{ fontSize: '13px', marginTop: '2px' }}>
                Add new FAQs to your list
              </Text> */}
            </div>
          </div>

          {/* Main Form Card */}
          <div className="faqs-create-card">
            <Title level={5} className="faqs-create-card-title">FAQ Details</Title>

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
              requiredMark={(label, { required }) =>
                required ? (
                  <span>
                    {label}
                    <span className="faqs-create-required">*</span>
                  </span>
                ) : (
                  label
                )
              }
            >
              <Form.Item label={<span className="faqs-create-label">Question</span>} name="question" rules={[
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
                <Input placeholder="Enter Question" maxLength={200} size="large" className="faqs-create-input" />
              </Form.Item>

              <WordCount value={questionValue} max={30} />

              <Form.Item label={<span className="faqs-create-label">Answer</span>} name="answer" rules={[
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
                <Input.TextArea placeholder="Describe your Answer" maxLength={2000} size="large" rows={4} className="faqs-create-textarea" />
              </Form.Item>

              <WordCount value={answerValue} max={60} />

              <Form.Item
                label={<span className="faqs-create-label">Select the module and categories</span>}
                required
                className="faqs-create-select-block"
              >
                <ModuleCategorySelects
                  showFieldLabels
                  moduleItemClassName="faqs-create-select-item"
                  moduleSelectClassName="faqs-create-select"
                  categoryItemClassName="faqs-create-select-item"
                  categorySelectClassName="faqs-create-select"
                  moduleRequiredMessage="Please select a module"
                  categoryRequiredMessage="Please select a category"
                />
              </Form.Item>

              <div className="faqs-create-divider" />

              <div className="faqs-create-footer">
                <Button 
                  size="large" 
                  onClick={() => setPreviewVisible(true)} 
                  className="faqs-create-btn-preview"
                >
                  Preview
                </Button>

                <Space size="middle">
                  <Button size="large" onClick={handleCancel} className="faqs-create-btn-cancel">Cancel</Button>
                  <Button type="primary" htmlType="submit" size="large" loading={loading} className="faqs-create-btn-create">Create</Button>
                </Space>
              </div>

              {/* PREVIEW MODAL */}
              <Modal
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={null}
                width={736}
                centered
                maskStyle={{ 
                  backdropFilter: 'blur(6px)', 
                  backgroundColor: 'rgba(0, 0, 0, 0.2)' 
                }}
                styles={{ body: { borderRadius: '12px', padding: '24px' } }}
              >
                {previewContent}
              </Modal>
            </Form>
          </div>
          
        </div>
      </div>

      <Modal
        open={confirmOpen}
        title="You have unsaved changes"
        onCancel={closeLeaveConfirm}
        closable
        maskClosable
        footer={
          <Space>
            <Button onClick={confirmDiscardAndLeave}>No, Don&apos;t Save</Button>
            <Button type="primary" onClick={confirmSaveAndLeave}>
              Yes, Save
            </Button>
          </Space>
        }
      >
        <p>Do you want to save your changes before leaving?</p>
      </Modal>

      {/* RESTORE PREVIOUS DRAFT MODAL */}
      <Modal
        open={restoreOpen}
        title="Restore previous draft?"
        onCancel={confirmDiscardDraft}
        closable
        maskClosable
        footer={
          <Space>
            <Button onClick={confirmDiscardDraft}>No, Start Fresh</Button>
            <Button type="primary" onClick={confirmRestoreDraft}>
              Yes, Restore
            </Button>
          </Space>
        }
      >
        <p>You have a previously unsaved FAQ draft. Would you like to restore it?</p>
      </Modal>
    </AdminLayout>
  );
};

export default withAdminAuth(UploadFAQ);