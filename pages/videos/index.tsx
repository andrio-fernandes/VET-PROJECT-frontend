import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { App as AntApp, Button } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '@/layouts/admin-layout';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { useCanManage } from '@/hooks/use-can-manage';
import { useContentFilters } from '@/hooks/use-content-filters';
import { useDeleteConfirm } from '@/hooks/use-delete-confirm';
import { useClampedRows } from '@/hooks/use-clamped-rows';
import { deleteVideo, getVideos } from '@/services/video-service';
import { PAGE_SIZE, ROUTE_PATHS, VIDEO_PREVIEW_STORAGE_KEY } from '@/constants';
import { mediaUrl, contentThumbnail } from '@/utils/media';
import type { VideoRecord, VideoProcessingStatus } from '@/types/video';
import { ViewAllTable } from '@/components/common/view-all-table';
import { buildContentColumns } from '@/components/common/content-columns';
import { notifyFailedVideos } from '@/utils/video-failure';
import ClampedCellText from '@/components/common/clamped-cell-text';

type Video = VideoRecord;

const isReady = (record: Video) =>
  !record.processingStatus || record.processingStatus === 'ready';

const Videos = () => {
  const router = useRouter();
  const { message, modal, notification } = AntApp.useApp();
  const { canManage } = useCanManage<Video>();
  const videoClamp = useClampedRows();
  const {
    page,
    setPage,
    moduleFilter,
    categoryFilter,
    onModuleChange,
    onCategoryChange,
  } = useContentFilters();

  const [videos, setVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const applyVideosFromData = useCallback((data: any) => {
    setVideos(
      (data?.videos ?? []).map((v: any) => ({
        key: v.key ?? v._id,
        title: v.title,
        description: v.description,
        createdAt: v.createdAt,
        createdBy:
          typeof v.createdBy === 'string'
            ? v.createdBy
            : v.createdBy?.fullName || v.createdBy?.username || 'Unknown',
        module: v.module,
        category: v.category,
        videoUrl: v.videoUrl,
        thumbnailUrl: v.thumbnailUrl,
        processingStatus: v.processingStatus as VideoProcessingStatus | undefined,
        createdById: v.createdById ?? v.createdBy?._id ?? null,
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
      if (searchQuery) params.set('q', searchQuery);

      try {
        const data = await getVideos(params.toString());
        if (!ignore) {
          applyVideosFromData(data);
          // The backend purges failed records on this call; pop once per
          // purged video instead of showing the deleted row.
          notifyFailedVideos(notification, data.purged ?? []);
        }
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
  }, [page, moduleFilter, categoryFilter, searchQuery, message, notification, applyVideosFromData, reloadKey]);

  const handleView = (record: Video) => {
    if (!isReady(record)) {
      message.warning('This video is not ready to view yet.');
      return;
    }
    sessionStorage.setItem(
      VIDEO_PREVIEW_STORAGE_KEY,
      JSON.stringify({
        id: record.key,
        title: record.title,
        description: record.description,
        src: mediaUrl(record.videoUrl),
      })
    );
    router.push('/videos/preview');
  };

  const handleEdit = (record: Video) => {
    if (!canManage(record)) return;
    router.push(`/videos/create?id=${record.key}`);
  };

  const { confirmDelete, deletingId } = useDeleteConfirm<Video>({
    modal,
    message,
    confirmTitle: 'Delete video',
    confirmContent: 'Are you sure you want to delete this video? This action cannot be undone.',
    okText: 'Delete',
    cancelText: 'Cancel',
    getRecordId: (record) => record.key,
    deleteFn: deleteVideo,
    successMessage: 'Video deleted successfully.',
    errorMessage: 'Failed to delete video.',
    isLastItemOnPage: () => videos.length === 1 && page > 1,
    onPageBack: () => setPage(page - 1),
    onReload: () => {
      setLoading(true);
      setReloadKey((key) => key + 1);
    },
  });

  const handleDelete = (record: Video) => {
    if (!canManage(record)) return;
    confirmDelete(record);
  };

  const columns = buildContentColumns<Video>({
    ns: 'videos',
    renderTitle: (text, record) => (
      <div className="videos-cell-title">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={contentThumbnail(record.thumbnailUrl)}
          alt={text}
          className="videos-cell-thumb"
        />
        <ClampedCellText
          text={text}
          expanded={videoClamp.isExpanded(record.key)}
          onToggle={() => videoClamp.toggle(record.key)}
        />
      </div>
    ),
    renderActions: (record) => (
      <div className="videos-action-group">
        <Button
          type="text"
          title={isReady(record) ? 'View' : 'Not ready yet'}
          disabled={!isReady(record)}
          icon={<EyeOutlined className="videos-action-icon" />}
          onClick={() => handleView(record)}
        />
        {canManage(record) && (
          <Button
            type="text"
            title="Edit"
            icon={<EditOutlined className="videos-action-icon" />}
            onClick={() => handleEdit(record)}
          />
        )}
        {canManage(record) && (
          <Button
            type="text"
            title="Delete"
            loading={deletingId === record.key}
            icon={<DeleteOutlined className="videos-action-delete" />}
            onClick={() => handleDelete(record)}
          />
        )}
      </div>
    ),
  });

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
        onModuleChange={onModuleChange}
        onCategoryChange={onCategoryChange}
        tableLayout="fixed"
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          if (val) onModuleChange('All');
          setLoading(true);
        }}
      />
    </AdminLayout>
  );
};

export default withAdminAuth(Videos);