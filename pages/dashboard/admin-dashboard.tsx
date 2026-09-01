/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { Typography, Card, Space, Table, Button, Spin, App as AntApp } from 'antd';
import dayjs from 'dayjs';
import {
  PlayCircleOutlined,
  QuestionCircleOutlined,
  FileTextOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '@/layouts/AdminLayout';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  fetchDashboardStats,
  fetchRecentBlogs,
  fetchRecentFaqs,
  fetchRecentVideos,
} from '@/redux/dashboard/dashboardSlice';
import { selectDashboard, selectDashboardError } from '@/redux/dashboard/selectors';
import { useCurrentUser } from '@/hooks/useAuth';
import { ROUTE_PATHS } from '@/constants';

const { Text } = Typography;

interface TableItem {
  key: string;
  title: string;
  createdAt: string;
  createdByName: string;
  category?: string;
  thumbnailUrl?: string;
}

const Dashboard = () => {
  const router = useRouter();
  const { message } = AntApp.useApp();
  const dispatch = useAppDispatch();
  const storedUser = useCurrentUser();
  const rawAdminName = storedUser?.fullName || storedUser?.username || 'Admin';
  const adminDisplayName = rawAdminName.charAt(0).toUpperCase() + rawAdminName.slice(1);
  const [activeTab, setActiveTab] = useState('Video');

  const { stats, recentVideos, recentBlogs, recentFaqs, loading, faqsLoading } =
    useAppSelector(selectDashboard);
  const dashboardError = useAppSelector(selectDashboardError);

  const shownErrorRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (dashboardError && dashboardError !== shownErrorRef.current) {
      shownErrorRef.current = dashboardError;
      message.error('Could not load dashboard data.');
    }
  }, [dashboardError, message]);

  useEffect(() => {
    if (activeTab === 'Video') {
      dispatch(fetchRecentVideos('Unknown'));
    } else if (activeTab === 'Blog') {
      dispatch(fetchRecentBlogs(adminDisplayName));
    } else if (activeTab === 'FAQs') {
      dispatch(fetchRecentFaqs());
    }
    dispatch(fetchDashboardStats());
  }, [activeTab, adminDisplayName, dispatch]);

  const summaryCards = [
    { title: 'Total Video', count: stats.totalVideos, icon: <PlayCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} />, onViewAll: () => router.push(ROUTE_PATHS.videos) },
    { title: 'Total Blog', count: stats.totalBlogs, icon: <PlayCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} />, onViewAll: () => router.push(ROUTE_PATHS.blogs) },
    { title: 'Total FAQs', count: stats.totalFaqs, icon: <QuestionCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} />, onViewAll: () => router.push(ROUTE_PATHS.faqs) },
  ];

  const quickActions = [
    { title: 'Create New Videos', path: ROUTE_PATHS.createVideo, icon: <PlayCircleOutlined style={{ color: '#52c41a', fontSize: '28px' }} /> },
    { title: 'Upload New Blog', path: ROUTE_PATHS.uploadBlog, icon: <FileTextOutlined style={{ color: '#52c41a', fontSize: '28px' }} /> },
    { title: 'Create New FAQs', path: '/faqs/create', icon: <QuestionCircleOutlined style={{ color: '#52c41a', fontSize: '28px' }} /> },
  ];

  const activeRecentData: TableItem[] = React.useMemo(() => {
    if (activeTab === 'Video') return recentVideos;
    if (activeTab === 'Blog') return recentBlogs;
    return recentFaqs.map((faq) => ({
      key: faq._id,
      title: faq.question,
      createdAt: faq.createdAt,
      createdByName:
        faq.createdBy?.fullName || faq.createdBy?.username || 'Unknown',
      category: faq.category,
    }));
  }, [activeTab, recentVideos, recentBlogs, recentFaqs]);

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
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (text: string) => <Text style={{ color: '#000' }}>{text}</Text>
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
                ? router.push(ROUTE_PATHS.videos)
                : activeTab === 'Blog'
                  ? router.push(ROUTE_PATHS.blogs)
                  : router.push(ROUTE_PATHS.faqs)
            }
          />
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="dash-page">
      {/* Header Section */}
      <div className="dash-header">
        <div className="dash-title">Welcome, {adminDisplayName}</div>
        <Text className="dash-subtitle">Review the complete set of uploaded data</Text>
      </div>

      {/* SUMMARY CARDS */}
      <Spin spinning={loading}>
        <div className="dash-summary-row">
          {summaryCards.map((card, index) => (
            <Card
              key={index}
              className="lively-card"
              styles={{ body: { padding: '16px' } }}
              style={{ width: '220px', borderRadius: '10px', border: '1px solid #b7eb8f', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer' }}
            >
              <div className="dash-summary-body">
                <div className="dash-summary-top">
                  <div className="dash-summary-icon">
                    {card.icon}
                  </div>
                  <div className="dash-summary-count">
                    <div className="dash-summary-label">{card.title}</div>
                    <div className="dash-summary-value">{card.count}</div>
                  </div>
                </div>
                <div className="dash-summary-footer">
                  {card.onViewAll ? (
                    <Button
                      type="link"
                      size="small"
                      onClick={card.onViewAll}
                      className="dash-view-link"
                    >
                      View all
                    </Button>
                  ) : (
                    <span className="dash-view-span">View all</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Spin>

      {/* QUICK ACTIONS */}
      <div className="dash-section-title">Quick action</div>
      <div className="dash-quick-row">
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
              <div className="dash-quick-title">{action.title}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* RECENTLY UPLOADED CONTENT */}
      <div className="dash-section-title">Recently uploaded content</div>
      <div className="dash-recent-box">

        <div className="dash-tabs">
          {['Video', 'Blog', 'FAQs'].map((tab) => (
            <div
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`dash-tab${activeTab === tab ? ' dash-tab-active' : ''}`}
            >
              {tab}
            </div>
          ))}
        </div>

        <Table
          columns={tableColumns}
          dataSource={activeRecentData}
          rowKey="key"
          loading={activeTab === 'FAQs' ? faqsLoading : loading}
          pagination={false}
          bordered={false}
          locale={{ emptyText: loading || faqsLoading ? 'Loading...' : `No ${activeTab === 'FAQs' ? 'FAQs' : activeTab + 's'} uploaded yet.` }}
        />

      </div>
      </div>
    </AdminLayout>
  );
};

export default withAdminAuth(Dashboard);
