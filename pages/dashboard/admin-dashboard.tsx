/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/router';
import React, { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { Typography, Card, Space, Table, Button, Spin, App as AntApp } from 'antd';
import dayjs from 'dayjs';
import {
  PlayCircleOutlined,
  QuestionCircleOutlined,
  VideoCameraAddOutlined,
  EyeOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { AdminLayout } from '../../src/components/layouts/admin-layout';
import { withAdminAuth } from '../../src/components/auth/with-admin-auth';
import { api } from '../../src/services/api';
import { API_ENDPOINTS, USER_KEY } from '../../src/utils/constant';

const { Text } = Typography;

// 1. Define the TypeScript interfaces for data
interface TableItem {
  key: string;
  title: string;
  createdAt: string;
  createdByName: string;
  thumbnailUrl?: string;
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
  createdBy?: { fullName?: string; username?: string };
}

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

const emptySubscribe = () => () => {};

let storedUserCache: { fullName?: string; username?: string } | null | undefined;

const readStoredUser = (): { fullName?: string; username?: string } | null => {
  if (storedUserCache === undefined) {
    try {
      const raw = localStorage.getItem(USER_KEY);
      storedUserCache = raw ? JSON.parse(raw) : null;
    } catch {
      storedUserCache = null;
    }
  }
  return storedUserCache ?? null;
};

const Dashboard = () => {
  const router = useRouter();
  const { message } = AntApp.useApp();
  const storedUser = useSyncExternalStore(
    emptySubscribe,
    () => readStoredUser() ?? null,
    () => null
  );
  const rawAdminName = storedUser?.fullName || storedUser?.username || 'Admin';
  const adminDisplayName = rawAdminName.charAt(0).toUpperCase() + rawAdminName.slice(1);
  const [activeTab, setActiveTab] = useState('Video');

  // 2. Apply the interfaces to state variables
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ totalVideos: 0, totalBlogs: 0, totalFaqs: 0 });
  const [tableData, setTableData] = useState<TableItem[]>([]);

  // "Recently uploaded" FAQ list
  const [faqs, setFaqs] = useState<FaqRecord[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(false);

  const fetchMyFaqs = useCallback(
    async () => {
      setFaqsLoading(true);
      try {
        const data = await api(`${API_ENDPOINTS.getMyFaqs}?limit=4`);
        setFaqs(data?.faqs ?? []);
      } catch (error: any) {
        message.error(error.message || 'Failed to load FAQs.');
      } finally {
        setFaqsLoading(false);
      }
    },
    [message]
  );

  useEffect(() => {
    let ignore = false;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        setStats({ totalVideos: 0, totalBlogs: 0, totalFaqs: 0 });

        if (activeTab === 'Video') {
          const videoData = await api(`${API_ENDPOINTS.getVideos}?page=1&limit=4`);
          if (!ignore) {
            const rows: TableItem[] = (videoData?.videos ?? []).map(
              (video: any) => ({
                key: video._id,
                title: video.title,
                createdAt: video.createdAt,
                createdByName:
                  video.createdBy?.fullName || video.createdBy?.username || 'Unknown',
                thumbnailUrl: video.thumbnailUrl,
              })
            );
            setTableData(rows);
          }
        } else if (activeTab === 'Blog') {
          const blogData = await api(`${API_ENDPOINTS.getMyBlogs}?page=1&limit=4`);
          if (!ignore) {
            const rows: TableItem[] = (blogData?.blogs ?? []).map(
              (blog: any) => ({
                key: blog._id,
                title: blog.title,
                createdAt: blog.createdAt,
                createdByName:
                  blog.createdBy?.fullName || blog.createdBy?.username || adminDisplayName,
                thumbnailUrl: blog.thumbnail,
              })
            );
            setTableData(rows);
          }
        } else {
          fetchMyFaqs();
        }

        const data = await api(API_ENDPOINTS.dashboardStats);
        if (!ignore) {
          setStats((previous) => ({
            ...previous,
            totalFaqs: data?.data?.totalFaqs ?? 0,
            totalVideos: data?.data?.totalVideos ?? 0,
            totalBlogs: data?.data?.totalBlogs ?? 0,
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
  }, [activeTab, message, fetchMyFaqs]);

  const summaryCards = [
    { title: 'Total Video', count: stats.totalVideos, icon: <PlayCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} />, onViewAll: () => router.push('/videos') },
    { title: 'Total Blog', count: stats.totalBlogs, icon: <PlayCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} />, onViewAll: () => router.push('/blogs') },
    { title: 'Total FAQs', count: stats.totalFaqs, icon: <QuestionCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} />, onViewAll: () => router.push('/faqs') },
  ];

  const quickActions = [
    { title: 'Create New Videos', path: '/videos/create', icon: <PlayCircleOutlined style={{ color: '#52c41a', fontSize: '28px' }} /> },
    { title: 'Upload New Blog', path: '/blogs/create', icon: <FileTextOutlined style={{ color: '#52c41a', fontSize: '28px' }} /> },
    { title: 'Create New FAQs', path: '/faqs/create', icon: <QuestionCircleOutlined style={{ color: '#52c41a', fontSize: '28px' }} /> },
  ];

  const tableColumns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: TableItem) => (
        <Space>
          {activeTab !== 'FAQs' &&
            (record.thumbnailUrl ? (
              <img
                src={record.thumbnailUrl}
                alt={text}
                style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }}
              />
            ) : (
              <div style={{ width: 60, height: 40, backgroundColor: '#e6f7ff', borderRadius: 4, border: '1px solid #d9d9d9' }} />
            ))}
          <Text strong style={{ color: '#000' }}>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => <Text style={{ color: '#000' }}>{dayjs(text).format('DD MMM YYYY')}</Text>
    },
    {
      title: 'Created By',
      dataIndex: 'createdByName',
      key: 'createdByName',
      render: (text: string) => <Text style={{ color: '#000' }}>{text}</Text>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined style={{ color: '#000', fontSize: '16px' }} />}
            onClick={() =>
              activeTab === 'Video'
                ? router.push('/videos')
                : activeTab === 'Blog'
                  ? router.push('/blogs')
                  : router.push('/faqs')
            }
          />
        </Space>
      ),
    },
  ];

  const faqRows: TableItem[] = useMemo(
    () =>
      faqs.map((faq) => ({
        key: faq._id,
        title: faq.question,
        createdAt: faq.createdAt,
        createdByName:
          faq.createdBy?.fullName || faq.createdBy?.username || 'Unknown',
      })),
    [faqs]
  );

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

      <div style={{ padding: '32px', minHeight: '100vh' }}>
      {/* Header Section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#000' }}>Welcome, {adminDisplayName}</div>
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
              {/* <div style={{ color: '#8c8c8c', fontSize: '11px', marginTop: '2px' }}>{action.desc}</div> */}
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

        {activeTab === 'FAQs' ? (
          <Table
            columns={tableColumns}
            dataSource={faqRows}
            rowKey="key"
            loading={faqsLoading}
            pagination={false}
            locale={{ emptyText: faqsLoading ? 'Loading...' : 'No FAQs uploaded yet.' }}
          />
        ) : (
          <Table
            columns={tableColumns}
            dataSource={tableData}
            pagination={false}
            bordered={false}
            loading={loading}
            locale={{ emptyText: loading ? 'Loading...' : `No ${activeTab}s uploaded yet.` }}
          />
        )}

      </div>
      </div>
    </AdminLayout>
  );
};

export default withAdminAuth(Dashboard);