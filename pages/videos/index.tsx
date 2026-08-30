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
import { AdminLayout } from '@/layouts/AdminLayout';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { deleteVideo, getVideos } from '@/services/videoService';
import { CONTENT_MODULES, MODULE_CATEGORIES, type ContentModule, type ContentCategory } from '@/utils/constant';
import { mediaUrl } from '@/utils/media';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { VideoRecord } from '@/types/video';

const { Title, Text } = Typography;

const PAGE_SIZE = 10;

type Video = VideoRecord;

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
        videoUrl: v.videoUrl,
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
        const data = await getVideos(params.toString());
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
        src: mediaUrl(record.videoUrl),
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
          await deleteVideo(record.key);
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
        <div className="videos-cell-title">
          {record.thumbnailUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={mediaUrl(record.thumbnailUrl)}
              alt={text}
              className="videos-cell-thumb"
            />
          ) : (
            <div className="videos-cell-thumb-placeholder">
              <PlayCircleOutlined className="videos-cell-play" />
            </div>
          )}
          <Text strong className="videos-cell-name">{text}</Text>
        </div>
      ),
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => (
        <Text className="videos-cell-muted">{dayjs(text).format('DD MMM YYYY')}</Text>
      ),
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 160,
      render: (text: string) => (
        <Text className="videos-cell-muted">{text}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <div className="videos-action-group">
          <Button
            type="text"
            title="View"
            icon={<EyeOutlined className="videos-action-icon" />}
            onClick={() => handleView(record)}
          />
          <Button
            type="text"
            title="Edit"
            icon={<EditOutlined className="videos-action-icon" />}
            onClick={handleEdit}
          />
          <Button
            type="text"
            title="Delete"
            loading={deletingId === record.key}
            icon={<DeleteOutlined className="videos-action-delete" />}
            onClick={() => handleDelete(record)}
          />
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="videos-page-pad">
        <div className="blog-content videos-content">
          {/* Header */}
          <div className="videos-header">
            <div className="videos-header-icon">
              <PlayCircleOutlined />
            </div>
            <Title level={3} className="videos-header-title">
              Videos
            </Title>
          </div>

          {/* Create button */}
          <div className="videos-create-wrap">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push('/videos/create')}
              className="videos-create-btn"
            >
              Create
            </Button>
          </div>

          {/* Filters */}
          <Row gutter={24} className="videos-filters">
            <Col span={12}>
              <div className="videos-filter-group">
                <Text strong className="videos-filter-label">
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
                  className="videos-filter-select"
                />
              </div>
            </Col>
            <Col span={12}>
              <div className="videos-filter-group">
                <Text strong className="videos-filter-label">
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
                  className="videos-filter-select"
                />
              </div>
            </Col>
          </Row>

          {/* Video table */}
          <div className="videos-table-wrap">
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
            <Text type="secondary" className="videos-count-text">
              Showing {videos.length} of {total} videos
            </Text>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default withAdminAuth(Videos);