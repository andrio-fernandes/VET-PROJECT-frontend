import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { App as AntApp, Button, Col, Modal, Row, Select, Table, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { AdminLayout } from '@/layouts/AdminLayout';

import {
  CONTENT_MODULES,
  MODULE_CATEGORIES,
  ROUTE_PATHS,
  type ContentCategory,
  type ContentModule,
} from '@/constants';
import { mediaUrl } from '@/utils/media';
import { deleteBlog } from '@/services/blogService';
import { fetchBlogsPage } from '@/redux/blog/blogSlice';
import { selectBlogError, selectBlogLoading, selectBlogsForPage, selectBlogsTotal } from '@/redux/blog/selectors';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import type { BlogListItem } from '@/types/blog';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

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

  const categoryOptions = moduleFilter === 'All'
    ? []
    : [
        { value: 'All', label: 'All' },
        ...(MODULE_CATEGORIES[moduleFilter as ContentModule] ?? []).map((category: ContentCategory) => ({ value: category, label: category })),
      ];

  const columns: ColumnsType<BlogListItem> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
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
            <div className="blogs-cell-thumb-placeholder" />
          )}
          <Text strong className="blogs-cell-name">{text}</Text>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 180,
      render: (text: string) => (
        <Text className="blogs-cell-muted">{text}</Text>
      ),
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => (
        <Text className="blogs-cell-muted">{dayjs(text).format('DD MMM YYYY')}</Text>
      ),
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 160,
      render: (_: unknown, record: BlogListItem) => (
        <Text className="blogs-cell-muted">{record.createdBy?.fullName || record.createdBy?.username || 'Admin'}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
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
      <div className="blogs-page-pad">
        <div className="blog-content blogs-content">
          {/* Header */}
          <div className="blogs-header">
            <div className="blogs-header-icon">
              <FileTextOutlined />
            </div>
            <Title level={3} className="blogs-header-title">
              Blog
            </Title>
          </div>

          {/* Create button */}
          <div className="blogs-create-wrap">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push(ROUTE_PATHS.uploadBlog)}
              className="blogs-create-btn"
            >
              Create
            </Button>
          </div>

          {/* Filters */}
          <Row gutter={24} className="blogs-filters">
            <Col span={12}>
              <div className="blogs-filter-group">
                <Text strong className="blogs-filter-label">
                  Select module:
                </Text>
                <Select
                  value={moduleFilter}
                  onChange={(value) => {
                    setModuleFilter(value);
                    setCategoryFilter('All');
                  }}
                  options={[{ value: 'All', label: 'All' }, ...CONTENT_MODULES.map((module) => ({ value: module, label: module }))]}
                  className="blogs-filter-select"
                />
              </div>
            </Col>
            <Col span={12}>
              <div className="blogs-filter-group">
                <Text strong className="blogs-filter-label">
                  Select Category:
                </Text>
                <Select
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  disabled={moduleFilter === 'All'}
                  options={categoryOptions}
                  className="blogs-filter-select"
                />
              </div>
            </Col>
          </Row>

          {/* Blog table */}
          <div className="blogs-table-wrap">
            <Table<BlogListItem>
              rowKey="_id"
              columns={columns}
              dataSource={filteredBlogs}
              loading={loading}
              locale={{ emptyText: loadError ? loadError : 'No blogs uploaded yet.' }}
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

          {!loading && !loadError && total > 0 && (
            <Text type="secondary" className="blogs-count-text">
              Showing {filteredBlogs.length} of {total} blogs
            </Text>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default withAdminAuth(BlogsPage);
