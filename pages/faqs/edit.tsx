import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Form, Input, Button, Typography, Space, Spin, Modal, App as AntApp } from 'antd';
import { useRouter } from 'next/router';
import { AdminLayout } from '@/layouts/AdminLayout';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { updateFaq, getFaqById } from '@/services/faqService';
import { ROUTE_PATHS, countWords } from '@/constants';
import WordCount from '@/components/WordCount';
import ModuleCategorySelects from '@/components/ModuleCategorySelects';

const { Title, Text } = Typography;

const EditFAQ = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { message } = AntApp.useApp();

  const faqId = typeof router.query.id === 'string' && router.query.id ? router.query.id : '';
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(Boolean(faqId));
  const [submitted, setSubmitted] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  // Original server values used as the baseline so Cancel only prompts when the
  // user actually changed something.
  const [baseline, setBaseline] = useState<{
    question: string;
    answer: string;
    module?: string;
    category?: string;
  }>({ question: '', answer: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingNavRef = useRef<(() => void) | null>(null);

  const questionValue = Form.useWatch('question', form);
  const answerValue = Form.useWatch('answer', form);

  const openLeaveConfirm = useCallback((onLeave: () => void) => {
    pendingNavRef.current = onLeave;
    setConfirmOpen(true);
  }, []);

  const closeLeaveConfirm = () => {
    pendingNavRef.current = null;
    setConfirmOpen(false);
  };

  const confirmDiscardAndLeave = () => {
    const onLeave = pendingNavRef.current;
    pendingNavRef.current = null;
    setConfirmOpen(false);
    if (onLeave) onLeave();
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

  useEffect(() => {
    if (!faqId || !router.isReady) return;
    let ignore = false;

    const loadFaq = async () => {
      setSeeding(true);
      try {
        const faq = await getFaqById(faqId);
        if (ignore || !faq) return;
        form.setFieldsValue({
          question: faq.question ?? '',
          answer: faq.answer ?? '',
          module: faq.module ?? undefined,
          category: faq.category ?? undefined,
        });
        setBaseline({
          question: faq.question ?? '',
          answer: faq.answer ?? '',
          module: faq.module ?? '',
          category: faq.category ?? '',
        });
      } catch (error: any) {
        if (!ignore) message.error(error.message || 'Failed to load the FAQ.');
      } finally {
        if (!ignore) setSeeding(false);
      }
    };

    loadFaq();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faqId, router.isReady]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await updateFaq(faqId, {
        module: values.module,
        category: values.category,
        question: values.question,
        answer: values.answer,
      });
      message.success('FAQ updated successfully!');
      router.push(ROUTE_PATHS.faqs);
    } catch (error: any) {
      message.error(error.message || 'Failed to update FAQ.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const values = form.getFieldsValue();
    const hasChanges =
      (values.question ?? '') !== baseline.question ||
      (values.answer ?? '') !== baseline.answer ||
      (values.module ?? '') !== baseline.module ||
      (values.category ?? '') !== baseline.category;

    if (!hasChanges) {
      router.push(ROUTE_PATHS.faqs);
      return;
    }
    openLeaveConfirm(() => {
      router.push(ROUTE_PATHS.faqs);
    });
  };

  return (
    <AdminLayout>
      <div className="faqs-create-page">
        <div className="faqs-create-inner">

          {/* Header Section */}
          <div className="faqs-create-header">
            <div className="faqs-create-header-body">
              <Title level={3} className="faqs-create-header-title">
                Edit FAQ
              </Title>
            </div>
          </div>

          {/* Main Form Card */}
          <div className="faqs-create-card">
            <Title level={5} className="faqs-create-card-title">FAQ Details</Title>

            {seeding ? (
              <div className="faqs-create-loading">
                <Spin size="large" />
              </div>
            ) : (
            <Form
              form={form}
              layout="vertical"
              validateTrigger={submitted ? 'onChange' : 'onSubmit'}
              onFinish={onFinish}
              onValuesChange={(changedValues: any) => {
                if ('module' in changedValues) {
                  form.setFieldsValue({ category: undefined });
                }
              }}
              onFinishFailed={({ errorFields }) => {
                setSubmitted(true);
                if (errorFields && errorFields.length) {
                  form.scrollToField(errorFields[0].name, { behavior: 'smooth', block: 'center' });
                }
              }}
            >
              <Form.Item
                label={<span className="faqs-create-label">Question</span>}
                name="question"
                required
                rules={[
                  { required: true, message: 'Please Enter The Question' },
                  {
                    validator: (_rule, value) => {
                      if (!value) return Promise.resolve();
                      const wordCount = countWords(value);
                      if (wordCount < 5) return Promise.reject('Question must contain at least 5 words.');
                      if (wordCount > 30) return Promise.reject('Question must not exceed 30 words.');
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input placeholder="Enter question" maxLength={200} size="large" className="faqs-create-input" />
              </Form.Item>

              <WordCount value={questionValue} max={30} />

              <Form.Item
                label={<span className="faqs-create-label">Answer</span>}
                name="answer"
                required
                rules={[
                  { required: true, message: 'Please provide an answer' },
                  {
                    validator: (_rule, value) => {
                      if (!value) return Promise.resolve();
                      const wordCount = countWords(value);
                      if (wordCount < 10) return Promise.reject('Answer must contain at least 10 words.');
                      if (wordCount > 60) return Promise.reject('Answer must not exceed 60 words.');
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input.TextArea
                  placeholder="Describe your answer"
                  maxLength={2000}
                  size="large"
                  rows={4}
                  className="faqs-create-textarea"
                />
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
                  <Button size="large" onClick={handleCancel} disabled={loading} className="faqs-create-btn-cancel">Cancel</Button>
                  <Button type="primary" htmlType="submit" size="large" loading={loading} className="faqs-create-btn-create">Save</Button>
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
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                }}
                styles={{ body: { borderRadius: '12px', padding: '24px' } }}
              >
                {previewContent}
              </Modal>
            </Form>
            )}
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
            <Button type="primary" onClick={closeLeaveConfirm}>
              Yes, Save
            </Button>
          </Space>
        }
      >
        <p>Do you want to save your changes before leaving?</p>
      </Modal>
    </AdminLayout>
  );
};

export default withAdminAuth(EditFAQ);
