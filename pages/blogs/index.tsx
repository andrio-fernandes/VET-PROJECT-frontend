import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import defaultThumbnail from '@/assets/default.jpg';
import { App as AntApp, Button, Modal, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ViewAllTable } from '@/components/common/ViewAllTable';

import {
  ROUTE_PATHS,
} from '@/constants';
import { mediaUrl } from '@/utils/media';
import { deleteBlog } from '@/services/blogService';
import { fetchBlogsPage } from '@/redux/blog/blogSlice';
import { selectBlogError, selectBlogLoading, selectBlogsForPage, selectBlogsTotal } from '@/redux/blog/selectors';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import type { BlogListItem } from '@/types/blog';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

const PAGE_SIZE = 10;

const BlogsPage = () => {
  const router = useRouter();
  const { message } = AntApp.useApp();
  const dispatch = useAppDispatch();

  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const blogs = useAppSelector(selectBlogsForPage(page));
  const total = useAppSelector(selectBlogsTotal);
  const loading = useAppSelector(selectBlogLoading);
  const loadError = useAppSelector(selectBlogError);

  const loadPage = useCallback(
    async (pageNum: number) => {
      try {
        await dispatch(fetchBlogsPage({ page: pageNum, limit: PAGE_SIZE })).unwrap();
      } catch (error: any) {
        message.error(error.message || 'Failed to load blogs.');
      }
    },
    [dispatch, message]
  );

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (record: BlogListItem) => {
    Modal.confirm({
      title: 'Delete blog',
      content: 'Are you sure you want to delete this blog? Its thumbnail and attachments will also be removed. This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setDeletingId(record._id);
        try {
          await deleteBlog(record._id);
          message.success('Blog deleted successfully.');
          await loadPage(page);
        } catch (error: any) {
          message.error(error.message || 'Failed to delete blog.');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const filteredBlogs = blogs.filter((blog) => {
    const matchesModule = moduleFilter === 'All' || blog.module === moduleFilter;
    const matchesCategory = categoryFilter === 'All' || blog.category === categoryFilter;
    return matchesModule && matchesCategory;
  });

  const columns: ColumnsType<BlogListItem> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: '38%',
      render: (text: string, record) => (
        <div className="blogs-cell-title">
          {record.thumbnail ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={mediaUrl(record.thumbnail)}
              alt={text}
              className="blogs-cell-thumb"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={defaultThumbnail.src}
              alt={text}
              className="blogs-cell-thumb"
            />
          )}
          <Text strong className="blogs-cell-name">{text}</Text>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: '15%',
      ellipsis: true,
      render: (text: string) => (
        <Text className="blogs-cell-muted">{text}</Text>
      ),
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '18%',
      render: (text: string) => (
        <Text className="blogs-cell-muted">{dayjs(text).format('DD MMM YYYY')}</Text>
      ),
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: '17%',
      ellipsis: true,
      render: (_: unknown, record: BlogListItem) => (
        <Text className="blogs-cell-muted">{record.createdBy?.fullName || record.createdBy?.username || 'Admin'}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '12%',
      render: (_, record) => (
        <div className="blogs-action-group">
          <Button
            type="text"
            title="View"
            icon={<EyeOutlined className="blogs-action-icon" />}
            onClick={() => router.push(`${ROUTE_PATHS.blogPreview}?id=${record._id}`)}
          />
          <Button
            type="text"
            title="Edit"
            icon={<EditOutlined className="blogs-action-icon" />}
            onClick={() => router.push(`${ROUTE_PATHS.uploadBlog}?id=${record._id}`)}
          />
          <Button
            type="text"
            title="Delete"
            loading={deletingId === record._id}
            icon={<DeleteOutlined className="blogs-action-delete" />}
            onClick={() => handleDelete(record)}
          />
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <ViewAllTable<BlogListItem>
        ns="blogs"
        title="Blog"
        icon={<FileTextOutlined />}
        createHref={ROUTE_PATHS.uploadBlog}
        columns={columns}
        dataSource={filteredBlogs}
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
        onModuleChange={(value) => {
          setModuleFilter(value);
          setCategoryFilter('All');
        }}
        onCategoryChange={setCategoryFilter}
        showCount={!loadError}
        tableLayout="fixed"
      />
    </AdminLayout>
  );
};

export default withAdminAuth(BlogsPage);
