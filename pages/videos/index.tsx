import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { App as AntApp, Button, Modal, Typography } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '@/layouts/AdminLayout';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { deleteVideo, getVideos } from '@/services/videoService';
import { CONTENT_MODULES, MODULE_CATEGORIES, PAGE_SIZE, VIDEO_PREVIEW_STORAGE_KEY, type ContentModule, type ContentCategory } from '@/constants';
import { mediaUrl } from '@/utils/media';
import defaultThumbnail from '@/assets/default.jpg';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { VideoRecord } from '@/types/video';
import { ViewAllTable } from '@/components/common/ViewAllTable';

const { Text } = Typography;

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
      VIDEO_PREVIEW_STORAGE_KEY,
      JSON.stringify({
        title: record.title,
        description: record.description,
        src: mediaUrl(record.videoUrl),
      })
    );
    router.push('/videos/preview');
  };

  const handleEdit = (record: Video) => {
    router.push(`/videos/create?id=${record.key}`);
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

  const columns: ColumnsType<Video> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: '38%',
      render: (text: string, record) => (
        <div className="videos-cell-title">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={record.thumbnailUrl ? mediaUrl(record.thumbnailUrl) : defaultThumbnail.src}
            alt={text}
            className="videos-cell-thumb"
          />
          <Text strong className="videos-cell-name">{text}</Text>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: '15%',
      render: (text: string) => (
        <Text className="videos-cell-muted">{text}</Text>
      ),
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '18%',
      render: (text: string) => (
        <Text className="videos-cell-muted">{dayjs(text).format('DD MMM YYYY')}</Text>
      ),
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: '17%',
      render: (text: string) => (
        <Text className="videos-cell-muted">{text}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '12%',
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
            onClick={() => handleEdit(record)}
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
      <ViewAllTable<Video>
        ns="videos"
        title="Videos"
        icon={<PlayCircleOutlined />}
        createHref="/videos/create"
        columns={columns}
        dataSource={videos}
        rowKey="key"
        loading={loading}
        total={total}
        page={page}
        onPageChange={(nextPage) => setPage(nextPage)}
        pageSize={PAGE_SIZE}
        emptyText="No videos uploaded yet."
        countNoun="videos"
        moduleFilter={moduleFilter}
        categoryFilter={categoryFilter}
        onModuleChange={(value) => {
          setModuleFilter(value);
          setCategoryFilter('All');
          setPage(1);
        }}
        onCategoryChange={(value) => {
          setCategoryFilter(value);
          setPage(1);
        }}
        tableLayout="fixed"
      />
    </AdminLayout>
  );
};

export default withAdminAuth(Videos);