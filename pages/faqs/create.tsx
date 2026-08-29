import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Form, Input, Button, Typography, Space, Select, Row, Col, Modal, App as AntApp } from 'antd';
import { useRouter } from 'next/router';
import { AdminLayout } from '../../src/components/layouts/admin-layout';
import { withAdminAuth } from '../../src/components/auth/with-admin-auth';
import { api } from '../../src/services/api';
import { API_ENDPOINTS, ROUTE_PATHS, CONTENT_MODULES, MODULE_CATEGORIES, type ContentModule, type ContentCategory } from '../../src/utils/constant';

const { Title, Text } = Typography;

const countWords = (text: string | undefined = ""): number =>
  text.trim() ? text.trim().split(/\s+/).length : 0;

const UploadFAQ = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { message } = AntApp.useApp();

  const [loading, setLoading] = useState(false);
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
  const selectedModule = Form.useWatch('module', form);

  useEffect(() => {
    const retainedData = localStorage.getItem('retained_faq_progress');
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
    localStorage.setItem('retained_faq_progress', JSON.stringify(allValues));
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await api(API_ENDPOINTS.createFaq, {
        method: 'POST',
        body: JSON.stringify({
          module: values.module,
          category: values.category,
          question: values.question,
          answer: values.answer,
        }),
      });
      message.success('FAQ uploaded successfully!');
      localStorage.removeItem('retained_faq_progress');
      setIsDirty(false);
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
    localStorage.removeItem('retained_faq_progress');
    retainedDataRef.current = null;
    setRestoreOpen(false);
  };

  const confirmSaveAndLeave = () => {
    const onLeave = confirmLeaveRef.current;
    localStorage.setItem('retained_faq_progress', JSON.stringify(form.getFieldsValue()));
    message.info('Progress saved.');
    setConfirmOpen(false);
    setIsDirty(false);
    if (onLeave) onLeave();
  };

  const confirmDiscardAndLeave = () => {
    const onLeave = confirmLeaveRef.current;
    localStorage.removeItem('retained_faq_progress');
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
      <div style={{ marginBottom: '28px' }}>
        <Text style={{ color: '#52c41a', fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '12px' }}>
          Question
        </Text>
        <Text strong style={{ fontSize: '18px', color: '#262626', lineHeight: 1.7, display: 'block' }}>
          {questionValue || 'Your question will appear here?'}
        </Text>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <Text style={{ color: '#52c41a', fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
          Answer
        </Text>
      </div>
      <div style={{ backgroundColor: '#f6ffed', padding: '22px 24px', borderRadius: '12px' }}>
        <Text style={{ fontSize: '16px', color: '#595959', lineHeight: 1.8, display: 'block' }}>
          {answerValue || 'Your answer description will appear here.'}
        </Text>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div style={{ padding: '32px', backgroundColor: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
        
        <div style={{ width: '100%' }}>
          
          {/* Header Section */}
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Title level={3} style={{ margin: 0, fontWeight: 600, color: '#262626' }}>
                Create New FAQs 
              </Title>
              {/* <Text type="secondary" style={{ fontSize: '13px', marginTop: '2px' }}>
                Add new FAQs to your list
              </Text> */}
            </div>
          </div>

          {/* Main Form Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px', border: '1px solid #e8e8e8' }}>
            <Title level={5} style={{ margin: '0 0 24px 0' }}>FAQ Details</Title>

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              onValuesChange={handleValuesChange}
              onFinishFailed={({ errorFields }) => {
                if (errorFields && errorFields.length) {
                  form.scrollToField(errorFields[0].name, { behavior: 'smooth', block: 'center' });
                }
              }}
              requiredMark={(label, { required }) =>
                required ? (
                  <span>
                    {label}
                    <span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span>
                  </span>
                ) : (
                  label
                )
              }
            >
              <Form.Item label={<span style={{ fontWeight: 600 }}>Question</span>} name="question" rules={[
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
                <Input placeholder="Enter Question" maxLength={200} size="large" style={{ borderRadius: '6px' }} />
              </Form.Item>

              <div className="word-counter">
                {countWords(questionValue)}/30
              </div>

              <Form.Item label={<span style={{ fontWeight: 600 }}>Answer</span>} name="answer" rules={[
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
                <Input.TextArea placeholder="Describe your Answer" maxLength={2000} size="large" rows={4} style={{ borderRadius: '6px', resize: 'none' }} />
              </Form.Item>

              <div className="word-counter">
                {countWords(answerValue)}/60
              </div>

              <Form.Item
                label={<span style={{ fontWeight: 600 }}>Select the module and categories</span>}
                required
                style={{ marginBottom: '24px' }}
              >
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="module" rules={[
                      { required: true, message: 'Please select a module' },
                    ]} style={{ marginBottom: 0 }}>
                      <Select
                        placeholder="Select Module"
                        size="large"
                        allowClear
                        options={CONTENT_MODULES.map((m) => ({ value: m, label: m }))}
                        style={{ borderRadius: '6px' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="category" rules={[
                      { required: true, message: 'Please select a category' },
                    ]} style={{ marginBottom: 0 }}>
                      <Select
                        placeholder={selectedModule ? 'Select Category' : 'Select a module first'}
                        size="large"
                        disabled={!selectedModule}
                        options={(selectedModule ? (MODULE_CATEGORIES[selectedModule as ContentModule] ?? []) : []).map((c: ContentCategory) => ({
                          value: c,
                          label: c,
                        }))}
                        style={{ borderRadius: '6px' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Form.Item>

              <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '32px 0 24px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button 
                  size="large" 
                  onClick={() => setPreviewVisible(true)} 
                  style={{ borderColor: '#52c41a', color: '#52c41a', borderRadius: '6px', padding: '0 32px' }}
                >
                  Preview
                </Button>

                <Space size="middle">
                  <Button size="large" onClick={handleCancel} style={{ borderColor: '#ff4d4f', color: '#ff4d4f', borderRadius: '6px', padding: '0 24px' }}>Cancel</Button>
                  <Button type="primary" htmlType="submit" size="large" loading={loading} style={{ backgroundColor: '#52c41a', borderRadius: '6px', padding: '0 32px' }}>Create</Button>
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