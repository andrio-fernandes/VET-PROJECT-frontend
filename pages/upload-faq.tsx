import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Typography, Space, Popover, Row, Col, message } from 'antd';
import { useRouter } from 'next/router';
import { AdminLayout } from '../src/components/layouts/admin-layout';
import { withAdminAuth } from '../src/components/auth/with-admin-auth';

const { Title, Text } = Typography;
const { Option } = Select;

const UploadFAQ = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

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

  const onFinish = (values: any) => {
    setLoading(true);
    setTimeout(() => {
      message.success('FAQ uploaded successfully!');
      localStorage.removeItem('retained_faq_progress');
      form.resetFields();
      setLoading(false);
      setPreviewVisible(false);
    }, 1000);
  };

  const handleCancel = () => {
    localStorage.removeItem('retained_faq_progress');
    form.resetFields();
    router.push('/dashboard'); 
  };

  const previewContent = (
    <div style={{ width: '400px', padding: '12px' }}>
      <Text style={{ color: '#52c41a', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '12px' }}>
        Preview
      </Text>
      <div style={{ marginBottom: '8px' }}>
        <Text strong style={{ fontSize: '14px' }}>
          {form.getFieldValue('question') || 'Your question will appear here?'}
        </Text>
      </div>
      <div style={{ backgroundColor: '#f6ffed', padding: '12px', borderRadius: '6px' }}>
        <Text style={{ fontSize: '13px', color: '#595959' }}>
          {form.getFieldValue('answer') || 'Your answer description will appear here.'}
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
              <Form.Item label={<span style={{ fontWeight: 600 }}>Question</span>} name="question" rules={[{ required: true, message: 'Please enter the question' }]}>
                <Input placeholder="Enter Question" maxLength={100} showCount size="large" style={{ borderRadius: '6px' }} />
              </Form.Item>

              <Form.Item label={<span style={{ fontWeight: 600 }}>Answer</span>} name="answer" rules={[{ required: true, message: 'Please provide an answer' }]}>
                <Input.TextArea placeholder="Describe your Answer" maxLength={300} showCount rows={4} style={{ borderRadius: '6px', resize: 'none' }} />
              </Form.Item>

              <div style={{ marginTop: '32px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Select the module and catagories <span style={{ color: 'red' }}>*</span></Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '13px' }}>select the module your FAQ should be places</Text>
                </div>
                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item name="module" rules={[{ required: true, message: 'Please select a module' }]}>
                      <Select placeholder="Module" size="large"><Option value="sale">Sale</Option></Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="feature" rules={[{ required: true, message: 'Please select a feature' }]}>
                      <Select placeholder="Feature" size="large">
                        <Option value="enquiry">Enquiry</Option>
                        <Option value="customer_order">Customer order</Option>
                        <Option value="quotation">Quotation</Option>
                      </Select>
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