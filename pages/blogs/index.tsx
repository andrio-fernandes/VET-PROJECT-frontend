import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { App as AntApp, Button, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';

import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { AdminLayout } from '@/layouts/admin-layout';
import { ViewAllTable } from '@/components/common/view-all-table';
import { buildContentColumns } from '@/components/common/content-columns';

import {
  ROUTE_PATHS,
  PAGE_SIZE,
} from '@/constants';
import { contentThumbnail } from '@/utils/media';
import { useCanManage } from '@/hooks/use-can-manage';
import { useContentFilters } from '@/hooks/use-content-filters';
import { useDeleteConfirm } from '@/hooks/use-delete-confirm';
import { useClampedRows } from '@/hooks/use-clamped-rows';
import { deleteBlog } from '@/services/blog-service';
import { fetchBlogsPage } from '@/redux/blog/blog-slice';
import { selectBlogError, selectBlogLoading, selectBlogsForPage, selectBlogsTotal } from '@/redux/blog/selectors';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import type { BlogListItem } from '@/types/blog';
import ClampedCellText from '@/components/common/clamped-cell-text';

const { Text } = Typography;

const BlogsPage = () => {
  const router = useRouter();
  const { message, modal } = AntApp.useApp();
  const dispatch = useAppDispatch();
  const { canManage } = useCanManage<BlogListItem>();
  const {
    page,
    setPage,
    moduleFilter,
    categoryFilter,
    onModuleChange,
    onCategoryChange,
  } = useContentFilters();

  const blogs = useAppSelector(selectBlogsForPage(page));
  const total = useAppSelector(selectBlogsTotal);
  const loading = useAppSelector(selectBlogLoading);
  const loadError = useAppSelector(selectBlogError);
  const blogClamp = useClampedRows();
  const [searchQuery, setSearchQuery] = useState('');

  const loadPage = useCallback(
    async (pageNum: number) => {
      try {
        await dispatch(
          fetchBlogsPage({
            page: pageNum,
            limit: PAGE_SIZE,
            module: moduleFilter === 'All' ? undefined : moduleFilter,
            category: categoryFilter === 'All' ? undefined : categoryFilter,
            q: searchQuery || undefined,
          })
        ).unwrap();
      } catch (error: any) {
        message.error(error.message || 'Failed to load blogs.');
      }
    },
    [dispatch, message, moduleFilter, categoryFilter, searchQuery]
  );

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  const { confirmDelete, deletingId } = useDeleteConfirm<BlogListItem>({
    modal,
    message,
    confirmTitle: 'Delete blog',
    confirmContent: 'Are you sure you want to delete this blog? Its thumbnail and attachments will also be removed. This action cannot be undone.',
    okText: 'Delete',
    cancelText: 'Cancel',
    getRecordId: (record) => record._id,
    deleteFn: deleteBlog,
    successMessage: 'Blog deleted successfully.',
    errorMessage: 'Failed to delete blog.',
    isLastItemOnPage: () => false,
    onPageBack: () => {},
    onReload: () => loadPage(page),
  });

  // Filtering is server-side: the fetched page already matches the current
  // module/category filters and the total reflects the filtered set, so no
  // client-side re-filtering of a single page's slice is performed.

  const columns = buildContentColumns<BlogListItem>({
    ns: 'blogs',
    renderTitle: (text, record) => (
      <div className="blogs-cell-title">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={contentThumbnail(record.thumbnail)}
          alt={text}
          className="blogs-cell-thumb"
        />
        <ClampedCellText
          text={text}
          expanded={blogClamp.isExpanded(String(record._id))}
          onToggle={() => blogClamp.toggle(String(record._id))}
        />
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
          onClick={() => router.push(`${ROUTE_PATHS.blogPreview}?id=${record._id}`)}
        />
        {canManage(record) && (
          <Button
            type="text"
            title="Edit"
            icon={<EditOutlined className="blogs-action-icon" />}
            onClick={() => router.push(`${ROUTE_PATHS.uploadBlog}?id=${record._id}`)}
          />
        )}
        {canManage(record) && (
          <Button
            type="text"
            title="Delete"
            loading={deletingId === record._id}
            icon={<DeleteOutlined className="blogs-action-delete" />}
            onClick={() => confirmDelete(record)}
          />
        )}
      </div>
    ),
  });

  return (
    <AdminLayout>
      <ViewAllTable<BlogListItem>
        ns="blogs"
        title="Blog"
        icon={<FileTextOutlined />}
        createHref={ROUTE_PATHS.uploadBlog}
        columns={columns}
        dataSource={blogs}
        rowKey="_id"
        loading={loading}
        total={total}
        page={page}
        onPageChange={(nextPage) => setPage(nextPage)}
        pageSize={PAGE_SIZE}
        emptyText={loadError ? loadError : 'No blogs uploaded yet.'}
        countNoun="blogs"
        moduleFilter={moduleFilter}
        categoryFilter={categoryFilter}
        onModuleChange={onModuleChange}
        onCategoryChange={onCategoryChange}
        showCount={!loadError}
        tableLayout="fixed"
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
        }}
      />
    </AdminLayout>
  );
};

export default withAdminAuth(BlogsPage);
