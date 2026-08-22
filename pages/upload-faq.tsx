import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Space, Popover, message } from 'antd';
import { useRouter } from 'next/router';
import { AdminLayout } from '../src/components/layouts/admin-layout';
import { withAdminAuth } from '../src/components/auth/with-admin-auth';
import { api } from '../src/services/api';
import { API_ENDPOINTS, ROUTE_PATHS } from '../src/utils/constant';

const { Title, Text } = Typography;

const UploadFAQ = () => {
  const [form] = Form.useForm();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Reactive values so the preview popover stays in sync while typing.
  const questionValue = Form.useWatch('question', form);
  const answerValue = Form.useWatch('answer', form);

  useEffect(() => {
    const retainedData = localStorage.getItem('retained_faq_progress');
    if (retainedData) {
      form.setFieldsValue(JSON.parse(retainedData));
      message.info('Restored your previous unsaved progress.'); 
    }
  }, [form]);

  const handleValuesChange = (_changedValues: any, allValues: any) => {
    localStorage.setItem('retained_faq_progress', JSON.stringify(allValues));
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await api(API_ENDPOINTS.createFaq, {
        method: 'POST',
        body: JSON.stringify({
          question: values.question,
          answer: values.answer,
        }),
      });
      message.success('FAQ uploaded successfully!');
      localStorage.removeItem('retained_faq_progress');
      form.resetFields();
      setPreviewVisible(false);
    } catch (error: any) {
      message.error(error.message || 'Failed to upload FAQ');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    localStorage.removeItem('retained_faq_progress');
    form.resetFields();
    router.push(ROUTE_PATHS.adminDashboard);
  };

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
        
        <div style={{ maxWidth: '800px' }}>
          
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
                { required: true, message: 'Please enter the question' },
                { min: 5, message: 'Question must be at least 5 characters' },
              ]}>
                <Input placeholder="Enter Question" maxLength={200} showCount size="large" style={{ borderRadius: '6px' }} />
              </Form.Item>

              <Form.Item label={<span style={{ fontWeight: 600 }}>Answer</span>} name="answer" rules={[
                { required: true, message: 'Please provide an answer' },
                { min: 10, message: 'Answer must be at least 10 characters' },
              ]}>
                <Input.TextArea placeholder="Describe your Answer" maxLength={2000} showCount rows={4} style={{ borderRadius: '6px', resize: 'none' }} />
              </Form.Item>

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
                  <Button size="large" type="text" onClick={() => message.success('Progress retained successfully!')} style={{ color: '#1890ff', fontWeight: 500 }}>Retain Progress</Button>
                  <Button size="large" onClick={handleCancel} style={{ borderColor: '#ff4d4f', color: '#ff4d4f', borderRadius: '6px', padding: '0 24px' }}>Cancel</Button>
                  <Button type="primary" htmlType="submit" size="large" loading={loading} style={{ backgroundColor: '#52c41a', borderRadius: '6px', padding: '0 32px' }}>Upload</Button>
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