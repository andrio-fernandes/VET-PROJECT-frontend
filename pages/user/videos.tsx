import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { App as AntApp, Button } from 'antd';
import { EyeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { UserLayout } from '@/layouts/user-layout';
import { withAuth } from '@/components/auth/with-auth';
import { useContentFilters } from '@/hooks/use-content-filters';
import { useClampedRows } from '@/hooks/use-clamped-rows';
import { PAGE_SIZE, ROUTE_PATHS, VIDEO_PREVIEW_STORAGE_KEY, VIEWED_FLASH_STORAGE_KEY } from '@/constants';
import { getLibraryVideos } from '@/services/library-service';
import { mediaUrl, contentThumbnail } from '@/utils/media';
import type { VideoRecord, VideoProcessingStatus } from '@/types/video';
import { ViewAllTable } from '@/components/common/view-all-table';
import { buildContentColumns } from '@/components/common/content-columns';
import ViewedBadge from '@/components/common/viewed-badge';
import NewBadge from '@/components/common/new-badge';
import useViewedFlash from '@/hooks/use-viewed-flash';
import useNewBadge from '@/hooks/use-new-badge';
import ClampedCellText from '@/components/common/clamped-cell-text';

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
  const [searchQuery, setSearchQuery] = useState('');
  const { flashIds, flashView } = useViewedFlash();
  const videoClamp = useClampedRows();
  const { isNew, isFading } = useNewBadge('video', videos);

  useEffect(() => {
    // Restore the "just viewed" flash across the list → preview navigation.
    const pending: string[] = [];
    try {
      const raw = sessionStorage.getItem(VIEWED_FLASH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) pending.push(...parsed.map(String));
      }
    } catch {
      // Malformed storage is safe to ignore.
    }
    if (pending.length) {
      sessionStorage.removeItem(VIEWED_FLASH_STORAGE_KEY);
      pending.forEach((id) => flashView(id));
    }
  }, [flashView]);

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
        isNew: v.isNew,
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
          q: searchQuery || undefined,
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
  }, [page, moduleFilter, categoryFilter, searchQuery, message, applyVideosFromData]);

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
    const pending: string[] = [];
    try {
      const raw = sessionStorage.getItem(VIEWED_FLASH_STORAGE_KEY);
      if (raw) pending.push(...JSON.parse(raw));
    } catch {
      // Malformed storage is safe to ignore.
    }
    pending.push(String(record.key));
    sessionStorage.setItem(VIEWED_FLASH_STORAGE_KEY, JSON.stringify(pending));
    flashView(String(record.key));
    router.push(ROUTE_PATHS.userVideoPreview);
  };

  const columns = buildContentColumns<Video>({
    ns: 'videos',
    renderTitle: (text, record) => (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={contentThumbnail(record.thumbnailUrl)}
            alt={text}
            className="videos-cell-thumb"
          />
          {isNew(String(record.key)) && <NewBadge fading={isFading} />}
        </div>
        <div>
          <ClampedCellText
            text={text}
            expanded={videoClamp.isExpanded(record.key)}
            onToggle={() => videoClamp.toggle(record.key)}
          />
          {(flashIds.has(String(record.key))) && <ViewedBadge />}
        </div>
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
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setLoading(true);
        }}
      />
    </UserLayout>
  );
};

export default withAuth(UserVideos);