import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { App as AntApp, Button, Col, Modal, Row, Select, Table, Typography } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { api } from '@/services/api';
import { API_ENDPOINTS, CONTENT_MODULES, MODULE_CATEGORIES, type ContentModule, type ContentCategory } from '@/utils/constant';
import { mediaUrl } from '@/utils/media';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

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

  const handleView = (record: Video) => {
    sessionStorage.setItem(
      'video_preview',
      JSON.stringify({
        title: record.title,
        description: record.description,
        src: '',
      })
    );
    router.push('/videos/preview');
  };

  const handleEdit = () => {
    router.push('/videos/create');
  };

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

  const categoryOptions = moduleFilter === 'All'
    ? []
    : [
        { value: 'All', label: 'All' },
        ...(MODULE_CATEGORIES[moduleFilter as ContentModule] ?? []).map((category: ContentCategory) => ({ value: category, label: category })),
      ];

  const columns: ColumnsType<Video> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 380 }}>
          {record.thumbnailUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={mediaUrl(record.thumbnailUrl)}
              alt={text}
              style={{ width: 96, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #f0f0f0', flexShrink: 0, display: 'block' }}
            />
          ) : (
            <div style={{ width: 96, height: 64, backgroundColor: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52c41a' }}>
              <PlayCircleOutlined style={{ fontSize: 22 }} />
            </div>
          )}
          <Text strong style={{ color: '#262626', fontSize: 15 }}>{text}</Text>
        </div>
      ),
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => (
        <Text style={{ color: '#595959' }}>{dayjs(text).format('DD MMM YYYY')}</Text>
      ),
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 160,
      render: (text: string) => (
        <Text style={{ color: '#595959' }}>{text}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            type="text"
            title="View"
            icon={<EyeOutlined style={{ fontSize: 16, color: '#52c41a' }} />}
            onClick={() => handleView(record)}
          />
          <Button
            type="text"
            title="Edit"
            icon={<EditOutlined style={{ fontSize: 16, color: '#52c41a' }} />}
            onClick={handleEdit}
          />
          <Button
            type="text"
            title="Delete"
            loading={deletingId === record.key}
            icon={<DeleteOutlined style={{ fontSize: 16, color: '#ff4d4f' }} />}
            onClick={() => handleDelete(record)}
          />
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: '32px 40px 48px' }}>
        <div className="blog-content" style={{ maxWidth: 1080 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', backgroundColor: '#52c41a', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24, flexShrink: 0 }}>
              <PlayCircleOutlined />
            </div>
            <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#262626' }}>
              Videos
            </Title>
          </div>

          {/* Create button */}
          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push('/videos/create')}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', borderRadius: 6, padding: '0 24px', height: 38 }}
            >
              Create
            </Button>
          </div>

          {/* Filters */}
          <Row gutter={24} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong style={{ color: '#262626', fontSize: 14, whiteSpace: 'nowrap' }}>
                  Select module:
                </Text>
                <Select
                  value={moduleFilter}
                  onChange={(value) => {
                    setModuleFilter(value);
                    setCategoryFilter('All');
                    setPage(1);
                  }}
                  options={[{ value: 'All', label: 'All' }, ...CONTENT_MODULES.map((module) => ({ value: module, label: module }))]}
                  style={{ width: 200 }}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong style={{ color: '#262626', fontSize: 14, whiteSpace: 'nowrap' }}>
                  Select Category:
                </Text>
                <Select
                  value={categoryFilter}
                  onChange={(value) => {
                    setCategoryFilter(value);
                    setPage(1);
                  }}
                  disabled={moduleFilter === 'All'}
                  options={categoryOptions}
                  style={{ width: 200 }}
                />
              </div>
            </Col>
          </Row>

          {/* Video table */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e8e8e8',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <Table<Video>
              rowKey="key"
              columns={columns}
              dataSource={videos}
              loading={loading}
              locale={{ emptyText: 'No videos uploaded yet.' }}
              pagination={{
                current: page,
                pageSize: PAGE_SIZE,
                total,
                onChange: (nextPage) => setPage(nextPage),
                showSizeChanger: false,
              }}
              rowClassName="blogs-table-row"
            />
          </div>

          {!loading && total > 0 && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'right', marginTop: 12 }}>
              Showing {videos.length} of {total} videos
            </Text>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default withAdminAuth(Videos);