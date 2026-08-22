import { useRouter } from 'next/router';
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Card, Space, Table, Button, Spin, Modal, Form, Input, App as AntApp } from 'antd';
import dayjs from 'dayjs';
import {
  PlayCircleOutlined,
  QuestionCircleOutlined,
  VideoCameraAddOutlined,
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons';
import { AdminLayout } from '../../src/components/layouts/admin-layout';
import { withAdminAuth } from '../../src/components/auth/with-admin-auth';
import { api } from '../../src/services/api';
import { API_ENDPOINTS } from '../../src/utils/constant';

const { Text } = Typography;

// 1. Define the TypeScript interfaces for data
interface TableItem {
  key: string;
  title: string;
  uploadDate: string;
}

interface DashboardStats {
  totalVideos: number;
  totalBlogs: number;
  totalFaqs: number;
}

interface FaqRecord {
  _id: string;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

const Dashboard = () => {
  const router = useRouter();
  const { message } = AntApp.useApp();
  const [activeTab, setActiveTab] = useState('Video');

  // 2. Apply the interfaces to state variables
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ totalVideos: 0, totalBlogs: 0, totalFaqs: 0 });
  const [tableData, setTableData] = useState<TableItem[]>([]);

  // "View all" FAQ list + editing
  const [isFaqListOpen, setIsFaqListOpen] = useState(false);
  const [faqs, setFaqs] = useState<FaqRecord[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(false);
  const [faqsPage, setFaqsPage] = useState(1);
  const [faqsTotal, setFaqsTotal] = useState(0);
  const [editingFaq, setEditingFaq] = useState<FaqRecord | null>(null);
  const [savingFaq, setSavingFaq] = useState(false);
  const [editForm] = Form.useForm<{ question: string; answer: string }>();

  const fetchMyFaqs = useCallback(
    async (page = 1) => {
      setFaqsLoading(true);
      try {
        const data = await api(`${API_ENDPOINTS.getMyFaqs}?page=${page}&limit=10`);
        setFaqs(data?.faqs ?? []);
        setFaqsPage(data?.page ?? page);
        setFaqsTotal(data?.totalFaqs ?? 0);
      } catch (error: any) {
        message.error(error.message || 'Failed to load FAQs.');
      } finally {
        setFaqsLoading(false);
      }
    },
    [message]
  );

  const openFaqList = () => {
    setIsFaqListOpen(true);
    fetchMyFaqs(1);
  };

  const openEditFaq = (faq: FaqRecord) => {
    setEditingFaq(faq);
    editForm.resetFields();
    editForm.setFieldsValue({ question: faq.question, answer: faq.answer });
  };

  const handleEditFaqSave = async () => {
    if (!editingFaq) return;

    let values: { question: string; answer: string };
    try {
      values = await editForm.validateFields();
    } catch {
      return;
    }

    setSavingFaq(true);
    try {
      await api(`${API_ENDPOINTS.createFaq}/${editingFaq._id}`, {
        method: 'PUT',
        body: JSON.stringify(values),
      });

      message.success('FAQ updated successfully!');
      setEditingFaq(null);
      fetchMyFaqs(faqsPage);
    } catch (error: any) {
      message.error(error.message || 'Failed to update FAQ.');
    } finally {
      setSavingFaq(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Videos/blogs have no backend yet; FAQ count comes from the real API.
        setStats({ totalVideos: 0, totalBlogs: 0, totalFaqs: 0 });

        if (activeTab === 'Video') {
          setTableData([
            { key: '1', title: 'Quotation Workflow', uploadDate: '20 Aug 2026' },
            { key: '2', title: 'What is enquiry', uploadDate: '18 Aug 2026' },
          ]);
        } else if (activeTab === 'Blog') {
          setTableData([
            { key: '1', title: '5 Sales Tips', uploadDate: '19 Aug 2026' },
          ]);
        } else {
          setTableData([]);
        }

        const data = await api(API_ENDPOINTS.dashboardStats);
        if (!ignore) {
          setStats((previous) => ({
            ...previous,
            totalFaqs: data?.data?.totalFaqs ?? 0,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        if (!ignore) {
          message.error('Could not load dashboard data.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      ignore = true;
    };
  }, [activeTab, message]);

  const summaryCards = [
    { title: 'Total Video', count: stats.totalVideos, icon: <PlayCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} />, onViewAll: undefined },
    { title: 'Total Blog', count: stats.totalBlogs, icon: <PlayCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} />, onViewAll: undefined },
    { title: 'Total FAQs', count: stats.totalFaqs, icon: <QuestionCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} />, onViewAll: openFaqList },
  ];

  const quickActions = [
    { title: 'Upload new FAQs', desc: 'Create new FAQ', path: '/upload-faq', icon: <QuestionCircleOutlined style={{ color: '#52c41a', fontSize: '28px' }} /> },
  ];

  const tableColumns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => (
        <Space>
          <div style={{ width: 60, height: 40, backgroundColor: '#e6f7ff', borderRadius: 4, border: '1px solid #d9d9d9' }} />
          <Text strong style={{ color: '#000' }}>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Upload date',
      dataIndex: 'uploadDate', 
      key: 'uploadDate',
      render: (text: string) => <Text style={{ color: '#000' }}>{text}</Text>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Space size="middle">
          <Button type="text" icon={<EyeOutlined style={{ color: '#000', fontSize: '16px' }} />} />
          <Button type="text" icon={<EditOutlined style={{ color: '#000', fontSize: '16px' }} />} />
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <style>{`
        .lively-card {
          transition: all 0.3s ease;
        }
        .lively-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
          border-color: transparent !important;
          transform: translateY(-2px);
        }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#000' }}>Welcome, Admin!</div>
        <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>Review the complete set of uploaded data</Text>
      </div>

      {/* SUMMARY CARDS */}
      <Spin spinning={loading}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {summaryCards.map((card, index) => (
            <Card 
              key={index}
              className="lively-card" 
              styles={{ body: { padding: '16px' } }} 
              style={{ width: '220px', borderRadius: '10px', border: '1px solid #b7eb8f', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: 48, height: 48, backgroundColor: '#f6ffed', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                    {card.icon}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#000' }}>{card.title}</div>
                    <div style={{ fontWeight: 600, fontSize: '24px', color: '#52c41a', lineHeight: 1.2 }}>{card.count}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginTop: '8px' }}>
                  {card.onViewAll ? (
                    <Button
                      type="link"
                      size="small"
                      onClick={card.onViewAll}
                      style={{ color: '#52c41a', fontSize: '11px', fontWeight: 600, padding: 0, height: 'auto' }}
                    >
                      View all
                    </Button>
                  ) : (
                    <span style={{ color: '#52c41a', fontSize: '11px', fontWeight: 600 }}>View all</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Spin>

      {/* QUICK ACTIONS */}
      <div style={{ fontSize: '16px', fontWeight: 700, color: '#000', marginBottom: 16 }}>Quick action</div>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {quickActions.map((action, index) => (
          <Card 
            key={index}
            className="lively-card"
            onClick={() => router.push(action.path)} 
            styles={{ body: { display: 'flex', alignItems: 'center', gap: '15px', padding: '16px 20px' } }} 
            style={{ 
              width: '280px', 
              borderRadius: '8px', 
              border: '1px solid #b7eb8f',
              cursor: 'pointer' 
            }}
          >
            {action.icon}
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#000' }}>{action.title}</div>
              <div style={{ color: '#8c8c8c', fontSize: '11px', marginTop: '2px' }}>{action.desc}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* RECENTLY UPLOADED CONTENT */}
      <div style={{ fontSize: '16px', fontWeight: 700, color: '#000', marginBottom: 16 }}>Recently uploaded content</div>
      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '20px', backgroundColor: '#fff' }}>
        
        <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
          {['Video', 'Blog', 'FAQs'].map((tab) => (
            <div 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ padding: '6px 24px', backgroundColor: activeTab === tab ? '#52c41a' : '#f0f0f0', color: activeTab === tab ? '#fff' : '#595959', cursor: 'pointer', fontWeight: activeTab === tab ? 600 : 500, fontSize: '13px', borderRadius: '2px' }}
            >
              {tab}
            </div>
          ))}
        </div>

        <Table 
          columns={tableColumns} 
          dataSource={tableData} 
          pagination={false} 
          bordered={false}
          loading={loading}
          locale={{ emptyText: loading ? 'Loading...' : `No ${activeTab}s uploaded yet.` }}
        />

      </div>

      {/* MY FAQ LIST MODAL */}
      <Modal
        title={`My FAQs (${faqsTotal})`}
        open={isFaqListOpen}
        onCancel={() => setIsFaqListOpen(false)}
        footer={null}
        width={760}
      >
        <Table
          dataSource={faqs}
          rowKey="_id"
          loading={faqsLoading}
          pagination={{
            current: faqsPage,
            pageSize: 10,
            total: faqsTotal,
            onChange: (page) => fetchMyFaqs(page),
            hideOnSinglePage: true,
          }}
          columns={[
            {
              title: 'Question',
              dataIndex: 'question',
              key: 'question',
              ellipsis: true,
              render: (text: string) => <Text strong style={{ color: '#000' }}>{text}</Text>,
            },
            {
              title: 'Answer',
              dataIndex: 'answer',
              key: 'answer',
              ellipsis: true,
              render: (text: string) => <Text style={{ color: '#000' }}>{text}</Text>,
            },
            {
              title: 'Created',
              dataIndex: 'createdAt',
              key: 'createdAt',
              width: 110,
              render: (text: string) => <Text style={{ color: '#000' }}>{dayjs(text).format('DD MMM YYYY')}</Text>,
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 80,
              render: (_, record: FaqRecord) => (
                <Button type="link" icon={<EditOutlined />} onClick={() => openEditFaq(record)}>
                  Edit
                </Button>
              ),
            },
          ]}
        />
      </Modal>

      {/* EDIT FAQ MODAL */}
      <Modal
        title="Edit FAQ"
        open={Boolean(editingFaq)}
        onCancel={() => setEditingFaq(null)}
        onOk={handleEditFaqSave}
        confirmLoading={savingFaq}
        okText="Save"
      >
        <Form form={editForm} layout="vertical" requiredMark={false}>
          <Form.Item
            label={<Text strong>Question</Text>}
            name="question"
            rules={[
              { required: true, message: 'Please enter the question' },
              { min: 5, message: 'Question must be at least 5 characters' },
              { max: 200, message: 'Question cannot exceed 200 characters' },
            ]}
          >
            <Input placeholder="Enter Question" maxLength={200} showCount size="large" style={{ borderRadius: '6px' }} />
          </Form.Item>

          <Form.Item
            label={<Text strong>Answer</Text>}
            name="answer"
            rules={[
              { required: true, message: 'Please provide an answer' },
              { min: 10, message: 'Answer must be at least 10 characters' },
              { max: 2000, message: 'Answer cannot exceed 2000 characters' },
            ]}
          >
            <Input.TextArea
              placeholder="Describe your Answer"
              maxLength={2000}
              showCount
              rows={4}
              style={{ borderRadius: '6px', resize: 'none' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  );
};

export default withAdminAuth(Dashboard);