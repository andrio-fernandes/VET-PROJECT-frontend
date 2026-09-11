import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { App as AntApp, Button, Typography } from 'antd';
import { EyeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { UserLayout } from '@/layouts/UserLayout';
import { withAuth } from '@/components/auth/with-auth';
import { useContentFilters } from '@/hooks/useContentFilters';
import { PAGE_SIZE, ROUTE_PATHS, VIDEO_PREVIEW_STORAGE_KEY } from '@/constants';
import { getLibraryVideos, getViewedIds } from '@/services/libraryService';
import { mediaUrl, contentThumbnail } from '@/utils/media';
import type { VideoRecord, VideoProcessingStatus } from '@/types/video';
import { ViewAllTable } from '@/components/common/ViewAllTable';
import { buildContentColumns } from '@/components/common/contentColumns';
import ViewedBadge from '@/components/common/ViewedBadge';

const { Text } = Typography;

type Video = VideoRecord;

const isReady = (record: Video) =>
  !record.processingStatus || record.processingStatus === 'ready';

const UserVideos = () => {
  const router = useRouter();
  const { message } = AntApp.useApp();
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
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let ignore = false;
    getViewedIds()
      .then((data) => {
        if (!ignore) setViewedIds(new Set(data.video));
      })
      .catch(() => {
        // Badge is best-effort; ignoring failures keeps the page usable.
      });
    return () => {
      ignore = true;
    };
  }, []);

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
      try {
        const data = await getLibraryVideos({
          page,
          limit: PAGE_SIZE,
          module: moduleFilter === 'All' ? undefined : moduleFilter,
          category: categoryFilter === 'All' ? undefined : categoryFilter,
        });
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
  }, [page, moduleFilter, categoryFilter, message, applyVideosFromData]);

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
    router.push(ROUTE_PATHS.userVideoPreview);
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
        <Text strong className="videos-cell-name">{text}</Text>
        {viewedIds.has(String(record.key)) && <ViewedBadge />}
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
      </div>
    ),
  });

  return (
    <UserLayout activeKey={ROUTE_PATHS.userVideos}>
      <ViewAllTable<Video>
        ns="videos"
        title="Videos"
        icon={<PlayCircleOutlined />}
        createHref={ROUTE_PATHS.videos}
        hideCreateButton
        columns={columns}
        dataSource={videos}
        rowKey="key"
        loading={loading}
        total={total}
        page={page}
        onPageChange={(nextPage) => setPage(nextPage)}
        pageSize={PAGE_SIZE}
        emptyText="No videos available yet."
        countNoun="videos"
        moduleFilter={moduleFilter}
        categoryFilter={categoryFilter}
        onModuleChange={onModuleChange}
        onCategoryChange={onCategoryChange}
        tableLayout="fixed"
      />
    </UserLayout>
  );
};

export default withAuth(UserVideos);