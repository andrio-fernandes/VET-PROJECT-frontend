import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { App as AntApp, Button, Typography } from 'antd';
import { EyeOutlined, FileTextOutlined } from '@ant-design/icons';

import { withAuth } from '@/components/auth/with-auth';
import { UserLayout } from '@/layouts/UserLayout';
import { ViewAllTable } from '@/components/common/ViewAllTable';
import { buildContentColumns } from '@/components/common/contentColumns';
import { ROUTE_PATHS, PAGE_SIZE, VIEWED_FLASH_STORAGE_KEY } from '@/constants';
import { useContentFilters } from '@/hooks/useContentFilters';
import { useClampedRows } from '@/hooks/useClampedRows';
import { getLibraryBlogs } from '@/services/libraryService';
import type { BlogListItem } from '@/types/blog';
import { contentThumbnail } from '@/utils/media';
import ViewedBadge from '@/components/common/ViewedBadge';
import NewBadge from '@/components/common/NewBadge';
import useViewedFlash from '@/hooks/useViewedFlash';
import useNewBadge from '@/hooks/useNewBadge';
import ClampedCellText from '@/components/common/ClampedCellText';

const { Text } = Typography;

const UserBlogs = () => {
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

  const [blogs, setBlogs] = useState<BlogListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { flashIds, flashView } = useViewedFlash();
  const blogClamp = useClampedRows();
  const { isNew, isFading } = useNewBadge('blog', blogs);

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

  const applyBlogsFromData = useCallback((data: any) => {
    setBlogs(data?.blogs ?? []);
    setTotal(data?.totalBlogs ?? 0);
  }, []);

  useEffect(() => {
    let ignore = false;

    const fetchBlogs = async () => {
      try {
        const data = await getLibraryBlogs({
          page,
          limit: PAGE_SIZE,
          module: moduleFilter === 'All' ? undefined : moduleFilter,
          category: categoryFilter === 'All' ? undefined : categoryFilter,
          q: searchQuery || undefined,
        });
        if (!ignore) applyBlogsFromData(data);
      } catch (error: any) {
        if (!ignore) message.error(error.message || 'Failed to load blogs.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchBlogs();

    return () => {
      ignore = true;
    };
  }, [page, moduleFilter, categoryFilter, searchQuery, message, applyBlogsFromData]);

  const columns = buildContentColumns<BlogListItem>({
    ns: 'blogs',
    renderTitle: (text, record) => (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={contentThumbnail(record.thumbnail)}
            alt={text}
            className="blogs-cell-thumb"
          />
          {isNew(String(record._id)) && <NewBadge fading={isFading} />}
        </div>
        <div>
          <ClampedCellText
            text={text}
            expanded={blogClamp.isExpanded(String(record._id))}
            onToggle={() => blogClamp.toggle(String(record._id))}
          />
          {flashIds.has(String(record._id)) && <ViewedBadge />}
        </div>
      </div>
    ),
    categoryEllipsis: true,
    createdByEllipsis: true,
    renderCreatedBy: (record) => (
      <Text className="blogs-cell-muted">{record.createdBy?.fullName || record.createdBy?.username || 'Admin'}</Text>
    ),
    renderActions: (record) => (
      <div className="blogs-action-group">
        <Button
          type="text"
          title="View"
          icon={<EyeOutlined className="blogs-action-icon" />}
          onClick={() => {
            const pending: string[] = [];
            try {
              const raw = sessionStorage.getItem(VIEWED_FLASH_STORAGE_KEY);
              if (raw) pending.push(...JSON.parse(raw));
            } catch {
              // Malformed storage is safe to ignore.
            }
            pending.push(String(record._id));
            sessionStorage.setItem(VIEWED_FLASH_STORAGE_KEY, JSON.stringify(pending));
            flashView(String(record._id));
            router.push(`${ROUTE_PATHS.userBlogPreview}?id=${record._id}`);
          }}
        />
      </div>
    ),
  });

  return (
    <UserLayout activeKey={ROUTE_PATHS.userBlogs}>
      <ViewAllTable<BlogListItem>
        ns="blogs"
        title="Blog"
        icon={<FileTextOutlined />}
        createHref={ROUTE_PATHS.blogs}
        hideCreateButton
        columns={columns}
        dataSource={blogs}
        rowKey="_id"
        loading={loading}
        total={total}
        page={page}
        onPageChange={(nextPage) => setPage(nextPage)}
        pageSize={PAGE_SIZE}
        emptyText="No blogs available yet."
        countNoun="blogs"
        moduleFilter={moduleFilter}
        categoryFilter={categoryFilter}
        onModuleChange={onModuleChange}
        onCategoryChange={onCategoryChange}
        showCount
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

export default withAuth(UserBlogs);