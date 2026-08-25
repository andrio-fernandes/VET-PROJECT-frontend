import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Form, Input, Button, Typography, Space, Popover, Select, Row, Col, Modal, App as AntApp } from 'antd';
import { useRouter } from 'next/router';
import { AdminLayout } from '../src/components/layouts/admin-layout';
import { withAdminAuth } from '../src/components/auth/with-admin-auth';
import { api } from '../src/services/api';
import { API_ENDPOINTS, ROUTE_PATHS, CONTENT_MODULES, CONTENT_CATEGORIES } from '../src/utils/constant';

const { Title, Text } = Typography;

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

const UploadFAQ = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { message } = AntApp.useApp();

  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const pendingNavRef = useRef<string | null>(null);

  // Reactive values so the preview popover stays in sync while typing.
  const questionValue = Form.useWatch('question', form);
  const answerValue = Form.useWatch('answer', form);

  useEffect(() => {
    const retainedData = localStorage.getItem('retained_faq_progress');
    if (retainedData) {
      form.setFieldsValue(JSON.parse(retainedData));
      message.info('Restored your previous unsaved progress.'); 
    }
  }, [form, message]);

  const handleValuesChange = (_changedValues: any, allValues: any) => {
    setIsDirty(true);
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

  const showLeaveConfirm = useCallback((onLeave: () => void) => {
    Modal.confirm({
      title: 'You have unsaved changes',
      content: 'Do you want to save your changes before leaving?',
      okText: 'Yes, Save',
      cancelText: "No, Don't Save",
      onOk() {
        localStorage.setItem('retained_faq_progress', JSON.stringify(form.getFieldsValue()));
        message.info('Progress saved.');
        setIsDirty(false);
        onLeave();
      },
      onCancel() {
        localStorage.removeItem('retained_faq_progress');
        setIsDirty(false);
        onLeave();
      },
    });
  }, [form, message]);

  const handleCancel = () => {
    if (isDirty) {
      showLeaveConfirm(() => {
        form.resetFields();
        router.push(ROUTE_PATHS.adminDashboard);
      });
    } else {
      form.resetFields();
      router.push(ROUTE_PATHS.adminDashboard);
    }
  };

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (!isDirty) return;
      pendingNavRef.current = url;
      showLeaveConfirm(() => {
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
  }, [isDirty, router, showLeaveConfirm]);

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
    <div style={{ width: '400px', padding: '12px' }}>
      <Text style={{ color: '#52c41a', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '12px' }}>
        Preview
      </Text>
      <div style={{ marginBottom: '8px' }}>
        <Text strong style={{ fontSize: '14px' }}>
          {questionValue || 'Your question will appear here?'}
        </Text>
      </div>
      <div style={{ backgroundColor: '#f6ffed', padding: '12px', borderRadius: '6px' }}>
        <Text style={{ fontSize: '13px', color: '#595959' }}>
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
              <Title level={3} style={{ margin: 0, color: '#262626' }}>
                Create New FAQs 
              </Title>
              <Text type="secondary" style={{ fontSize: '13px', marginTop: '2px' }}>
                add new FAQs to Your list
              </Text>
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
              requiredMark={(label, info) => <span>{label} {info.required && <span style={{ color: 'red' }}>*</span>}</span>}
            >
              <Form.Item label={<span style={{ fontWeight: 600 }}>Question</span>} name="question" rules={[
                { required: true, message: 'Please Enter The Question' },
                // { min: 5, message: 'Question must be at least 5 characters' },
                {
                  validator: (_rule, value) => {
                    if (!value) return Promise.resolve();
                    const wordCount = countWords(value);
                    if (wordCount < 10) return Promise.reject('Question must contain at least 10 words.');
                    if (wordCount > 30) return Promise.reject('Question must not exceed 30 words.');
                    return Promise.resolve();
                  },
                },
              ]}>
                <Input placeholder="Enter Question" maxLength={200} showCount size="large" style={{ borderRadius: '6px' }} />
              </Form.Item>

              <Form.Item label={<span style={{ fontWeight: 600 }}>Answer</span>} name="answer" rules={[
                { required: true, message: 'Please provide an answer' },
                // { min: 10, message: 'Answer must be at least 10 characters' },
                {
                  validator: (_rule, value) => {
                    if (!value) return Promise.resolve();
                    const wordCount = countWords(value);
                    if (wordCount < 20) return Promise.reject('Answer must contain at least 20 words.');
                    if (wordCount > 60) return Promise.reject('Answer must not exceed 60 words.');
                    return Promise.resolve();
                  },
                },
              ]}>
                <Input.TextArea placeholder="Describe your Answer" maxLength={2000} showCount size="large" rows={4} style={{ borderRadius: '6px', resize: 'none' }} />
              </Form.Item>

              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Select the module and categories </span>
                <span style={{ color: '#ff4d4f' }}>*</span>
                <div style={{ fontSize: '13px', color: '#8c8c8c', marginTop: '4px', marginBottom: '12px' }}>
                  select the module your FAQ should be places
                </div>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="module" rules={[
                      { required: true, message: 'Please select a module' },
                    ]} style={{ marginBottom: 0 }}>
                      <Select
                        placeholder="Select Module"
                        size="large"
                        options={CONTENT_MODULES.map((m) => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))}
                        style={{ borderRadius: '6px' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="category" rules={[
                      { required: true, message: 'Please select a category' },
                    ]} style={{ marginBottom: 0 }}>
                      <Select
                        placeholder="Select Category"
                        size="large"
                        options={CONTENT_CATEGORIES.map((c) => ({
                          value: c,
                          label: c.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                        }))}
                        style={{ borderRadius: '6px' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '32px 0 24px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Popover 
                  content={previewContent} 
                  trigger="click" 
                  open={previewVisible}
                  onOpenChange={setPreviewVisible}
                  placement="topLeft"
                  styles={{ container: { padding: 0, borderRadius: '12px' } }}
                >
                  <Button size="large" style={{ borderColor: '#52c41a', color: '#52c41a', borderRadius: '6px', padding: '0 32px' }}>Preview</Button>
                </Popover>

                <Space size="middle">
                  <Button size="large" onClick={handleCancel} style={{ borderColor: '#ff4d4f', color: '#ff4d4f', borderRadius: '6px', padding: '0 24px' }}>Cancel</Button>
                  <Button type="primary" htmlType="submit" size="large" loading={loading} style={{ backgroundColor: '#52c41a', borderRadius: '6px', padding: '0 32px' }}>Create</Button>
                </Space>
              </div>
            </Form>
          </div>
          
        </div>
      </div>
    </AdminLayout>
  );
};

export default withAdminAuth(UploadFAQ);