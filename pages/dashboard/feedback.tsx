import React, { useEffect, useState } from 'react';
import { App as AntApp, Button, Modal, Space, Table, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined,
  EyeOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { AdminLayout } from '@/layouts/AdminLayout';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { PAGE_SIZE } from '@/constants';
import {
  getFeedbacks,
  updateFeedbackStatus,
  type FeedbackRecord,
  type FeedbackStatus,
} from '@/services/feedbackService';

const { Text } = Typography;

const STATUS_TABS: { key: FeedbackStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'read', label: 'Read' },
  { key: 'resolved', label: 'Resolved' },
];

const STATUS_TAG_COLOR: Record<FeedbackStatus, string> = {
  new: 'gold',
  read: 'default',
  resolved: 'green',
};

const AdminFeedbackPage = () => {
  const { message } = AntApp.useApp();

  const [activeStatus, setActiveStatus] = useState<FeedbackStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<FeedbackRecord | null>(null);

  useEffect(() => {
    let ignore = false;

    getFeedbacks({ page, limit: PAGE_SIZE, status: activeStatus })
      .then((data) => {
        if (ignore) return;
        setFeedbacks(data.feedbacks);
        setTotal(data.totalFeedbacks);
      })
      .catch((error: any) => {
        if (!ignore) message.error(error.message || 'Failed to load feedback.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [page, activeStatus, message]);

  const refreshBadge = () => {
    // Tell the sidebar (AdminLayout) to re-fetch its unread count.
    window.dispatchEvent(new Event('feedback:count-changed'));
  };

  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    setUpdatingId(id);
    try {
      await updateFeedbackStatus(id, status);
      message.success(
        status === 'resolved' ? 'Feedback resolved.' : 'Feedback marked as read.'
      );
      setViewing((current) => (current && current._id === id ? { ...current, status } : current));
      setFeedbacks((current) =>
        activeStatus === 'all' || activeStatus === status
          ? current.map((f) => (f._id === id ? { ...f, status } : f))
          : current.filter((f) => f._id !== id)
      );
      refreshBadge();
    } catch (error: any) {
      message.error(error.message || 'Failed to update feedback.');
    } finally {
      setUpdatingId(null);
    }
  };

  const columns = [
    {
      title: 'From',
      dataIndex: 'email',
      key: 'email',
      width: '20%',
      render: (text: string) => (
        <Text strong style={{ color: '#000' }}>
          {text}
        </Text>
      ),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      width: '38%',
      ellipsis: true,
      render: (text: string, record: FeedbackRecord) => (
        <Text style={{ color: record.status === 'new' ? '#000' : undefined }}>
          {text}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '12%',
      render: (text: FeedbackStatus) => (
        <Tag color={STATUS_TAG_COLOR[text]} className="feed-tag">
          {text.charAt(0).toUpperCase() + text.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Received',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '18%',
      render: (text: string) => (
        <Text style={{ color: '#000' }}>{dayjs(text).format('DD/MM/YY HH:mm')}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '12%',
      render: (_: unknown, record: FeedbackRecord) => (
        <Space size="middle">
          <Button
            type="text"
            title="View"
            icon={<EyeOutlined style={{ color: '#000', fontSize: '16px' }} />}
            onClick={() => setViewing(record)}
          />
          {record.status !== 'resolved' && (
            <Button
              type="text"
              title="Mark resolved"
              loading={updatingId === record._id}
              icon={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />}
              onClick={() => handleStatusChange(record._id, 'resolved')}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="dash-page">
        <div className="dash-header">
          <div className="dash-title">Feedback</div>
          <Text className="dash-subtitle">
            Questions and feedback submitted by customers
          </Text>
        </div>

        <div className="dash-recent-box" style={{ marginTop: 24 }}>
          <div className="dash-tabs">
            {STATUS_TABS.map((tab) => (
              <div
                key={tab.key}
                onClick={() => {
                  setPage(1);
                  setActiveStatus(tab.key);
                  setLoading(true);
                }}
                className={`dash-tab${activeStatus === tab.key ? ' dash-tab-active' : ''}`}
              >
                {tab.label}
              </div>
            ))}
          </div>

          <Table
            columns={columns}
            dataSource={feedbacks}
            rowKey="_id"
            loading={loading}
            bordered={false}
            tableLayout="fixed"
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total,
              onChange: (nextPage) => {
                setPage(nextPage);
                setLoading(true);
              },
              showSizeChanger: false,
            }}
            locale={{ emptyText: loading ? 'Loading...' : 'No feedback yet.' }}
          />
        </div>
      </div>

      {/* VIEW FEEDBACK MODAL */}
      <Modal
        title={null}
        open={Boolean(viewing)}
        onCancel={() => setViewing(null)}
        footer={
          viewing && viewing.status !== 'resolved' ? (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={updatingId === viewing._id}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => handleStatusChange(viewing._id, 'resolved')}
            >
              Mark resolved
            </Button>
          ) : null
        }
        width={720}
        centered
      >
        {viewing && (
          <div>
            <div className="feed-modal-head">
              <MessageOutlined className="feed-modal-icon" />
              <Text strong style={{ fontSize: 16 }}>
                {viewing.email}
              </Text>
              <Tag color={STATUS_TAG_COLOR[viewing.status]}>
                {viewing.status.charAt(0).toUpperCase() + viewing.status.slice(1)}
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Received {dayjs(viewing.createdAt).format('DD/MM/YYYY HH:mm')}
            </Text>
            <div className="feed-modal-message">{viewing.message}</div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
};

export default withAdminAuth(AdminFeedbackPage);