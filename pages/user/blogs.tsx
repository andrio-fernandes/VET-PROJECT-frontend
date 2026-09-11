import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { App as AntApp, Button, Typography } from 'antd';
import { EyeOutlined, FileTextOutlined } from '@ant-design/icons';

import { withAuth } from '@/components/auth/with-auth';
import { UserLayout } from '@/layouts/UserLayout';
import { ViewAllTable } from '@/components/common/ViewAllTable';
import { buildContentColumns } from '@/components/common/contentColumns';
import { ROUTE_PATHS, PAGE_SIZE } from '@/constants';
import { useContentFilters } from '@/hooks/useContentFilters';
import { getLibraryBlogs, getViewedIds } from '@/services/libraryService';
import type { BlogListItem } from '@/types/blog';
import ViewedBadge from '@/components/common/ViewedBadge';

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
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let ignore = false;
    getViewedIds()
      .then((data) => {
        if (!ignore) setViewedIds(new Set(data.blog));
      })
      .catch(() => {
        // Badge is best-effort; ignoring failures keeps the page usable.
      });
    return () => {
      ignore = true;
    };
  }, []);

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
  }, [page, moduleFilter, categoryFilter, message, applyBlogsFromData]);

  const columns = buildContentColumns<BlogListItem>({
    ns: 'blogs',
    renderTitle: (text, record) => (
      <div className="blogs-cell-title">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={record.thumbnail}
          alt={text}
          className="blogs-cell-thumb"
        />
        <Text strong className="blogs-cell-name">{text}</Text>
        {viewedIds.has(String(record._id)) && <ViewedBadge />}
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
          onClick={() => router.push(`${ROUTE_PATHS.userBlogPreview}?id=${record._id}`)}
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
      />
    </UserLayout>
  );
};

export default withAuth(UserBlogs);