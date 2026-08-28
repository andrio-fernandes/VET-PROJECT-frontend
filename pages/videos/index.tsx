import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { App as AntApp, Button, Col, Modal, Row, Select, Table, Typography } from 'antd';
import {
  DeleteOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { api } from '@/services/api';
import { API_ENDPOINTS, CONTENT_MODULES, MODULE_CATEGORIES, type ContentModule, type ContentCategory } from '@/utils/constant';
import { mediaUrl } from '@/utils/media';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const PAGE_SIZE = 10;

interface Video {
  key: string;
  title: string;
  description: string;
  createdAt: string;
  createdBy: string;
  module: string;
  category: string;
  thumbnailUrl?: string;
}

const Videos = () => {
  const router = useRouter();
  const { message } = AntApp.useApp();

  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [videos, setVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const applyVideosFromData = useCallback((data: any) => {
    setVideos(
      (data?.videos ?? []).map((v: any) => ({
        key: v._id,
        title: v.title,
        description: v.description,
        createdAt: v.createdAt,
        createdBy: v.createdBy?.fullName || v.createdBy?.username || 'Unknown',
        module: v.module,
        category: v.category,
        thumbnailUrl: v.thumbnailUrl,
      }))
    );
    setTotal(data?.totalVideos ?? 0);
  }, []);

  useEffect(() => {
    let ignore = false;

    const fetchVideos = async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (moduleFilter !== 'All') params.set('module', moduleFilter);
      if (categoryFilter !== 'All') params.set('category', categoryFilter);

      try {
        const data = await api(`${API_ENDPOINTS.getVideos}?${params.toString()}`);
        if (!ignore) applyVideosFromData(data);
      } catch (error: any) {
        if (!ignore) message.error(error.message || 'Failed to load videos.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchVideos();

    return () => {
      ignore = true;
    };
  }, [page, moduleFilter, categoryFilter, message, applyVideosFromData, reloadKey]);

  const handleDelete = (record: Video) => {
    Modal.confirm({
      title: 'Delete video',
      content: 'Are you sure you want to delete this video? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setDeletingId(record.key);
        try {
          await api(API_ENDPOINTS.deleteVideo(record.key), { method: 'DELETE' });
          message.success('Video deleted successfully.');
          if (videos.length === 1 && page > 1) {
            setPage(page - 1);
          } else {
            setLoading(true);
            setReloadKey((k) => k + 1);
          }
        } catch (error: any) {
          message.error(error.message || 'Failed to delete video.');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Video) => (
        <div className="video-title-cell">
          {record.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(record.thumbnailUrl)}
              alt={text}
              style={{ width: 125, height: 70, objectFit: 'cover', borderRadius: 6, border: '1px solid #f0f0f0', flexShrink: 0 }}
            />
          ) : (
            <div className="video-thumb">
              <PlayCircleOutlined />
            </div>
          )}
          <Text strong className="video-title-text">
            {text}
          </Text>
        </div>
      ),
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => <Text className="video-date">{dayjs(text).format('DD MMM YYYY')}</Text>,
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      render: (text: string) => <Text className="video-date">{text}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Video) => (
        <Button
          type="text"
          title="Delete"
          loading={deletingId === record.key}
          icon={<DeleteOutlined style={{ fontSize: 16, color: '#ff4d4f' }} />}
          onClick={() => handleDelete(record)}
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="videos-page">
        {/* Header */}
        <div className="videos-header">
          <div className="videos-header-icon">
            <PlayCircleOutlined />
          </div>
          <Title level={1} className="videos-heading">
            Videos
          </Title>
        </div>

        {/* Main card */}
        <div className="videos-card">
          <div className="videos-card-top">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="videos-create-btn"
              onClick={() => router.push('/videos/create')}
            >
              Create
            </Button>
          </div>

          {/* Filters */}
          <Row gutter={24} className="videos-filters">
            <Col xs={24} lg={12}>
              <div className="video-filter">
                <Text className="video-filter-label">Select module :</Text>
                <Select
                  value={moduleFilter}
                  options={['All', ...CONTENT_MODULES].map((value) => ({ label: value, value }))}
                  className="video-filter-select"
                  popupMatchSelectWidth={false}
                  onChange={(value) => {
                    setModuleFilter(value);
                    setCategoryFilter('All');
                    setPage(1);
                  }}
                />
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <div className="video-filter">
                <Text className="video-filter-label">Select Category :</Text>
                <Select
                  value={categoryFilter}
                  onChange={(value) => {
                    setCategoryFilter(value);
                    setPage(1);
                  }}
                  options={[
                    { label: 'All', value: 'All' },
                    ...(
                      (moduleFilter !== 'All'
                        ? (MODULE_CATEGORIES[moduleFilter as ContentModule] ?? [])
                        : [] as readonly ContentCategory[]
                      ).map((c: ContentCategory) => ({ label: c, value: c }))
                    ),
                  ]}
                  className="video-filter-select"
                  popupMatchSelectWidth={false}
                  disabled={moduleFilter === 'All'}
                />
              </div>
            </Col>
          </Row>

          <div className="videos-divider" />

          {/* Table */}
          <Table
            columns={columns}
            dataSource={videos}
            rowKey="key"
            className="videos-table"
            loading={loading}
            locale={{ emptyText: 'No videos uploaded yet.' }}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total,
              onChange: (nextPage) => setPage(nextPage),
              showSizeChanger: false,
            }}
          />
        </div>
      </div>
    </AdminLayout>
  );
};

export default withAdminAuth(Videos);
