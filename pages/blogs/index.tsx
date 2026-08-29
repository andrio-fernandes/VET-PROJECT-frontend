import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { App as AntApp, Button, Col, Modal, Row, Select, Table, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { withAdminAuth } from '../../src/components/auth/with-admin-auth';
import { AdminLayout } from '../../src/components/layouts/admin-layout';

import {
  CONTENT_MODULES,
  MODULE_CATEGORIES,
  ROUTE_PATHS,
  type ContentCategory,
  type ContentModule,
} from '../../src/utils/constant';
import { mediaUrl } from '../../src/utils/media';
import { deleteBlog } from '../../src/services/blogService';
import { fetchBlogsPage } from '../../src/redux/blog/blogSlice';
import { selectBlogError, selectBlogLoading, selectBlogsForPage, selectBlogsTotal } from '../../src/redux/blog/selectors';
import { useAppDispatch, useAppSelector } from '../../src/redux/hooks';
import type { BlogListItem } from '../../src/types/blog';
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 380 }}>
          {record.thumbnail ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={mediaUrl(record.thumbnail)}
              alt={text}
              style={{ width: 96, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #f0f0f0', flexShrink: 0, display: 'block' }}
            />
          ) : (
            <div style={{ width: 96, height: 64, backgroundColor: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f', flexShrink: 0 }} />
          )}
          <Text strong style={{ color: '#262626', fontSize: 15 }}>{text}</Text>
        </div>
      ),
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => (
        <Text style={{ color: '#595959' }}>{dayjs(text).format('DD MMM YYYY')}</Text>
      ),
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 160,
      render: (_: unknown, record: BlogListItem) => (
        <Text style={{ color: '#595959' }}>{record.createdBy?.fullName || record.createdBy?.username || 'Admin'}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            type="text"
            title="View"
            icon={<EyeOutlined style={{ fontSize: 16, color: '#52c41a' }} />}
            onClick={() => router.push(`${ROUTE_PATHS.blogPreview}?id=${record._id}`)}
          />
          <Button
            type="text"
            title="Edit"
            icon={<EditOutlined style={{ fontSize: 16, color: '#52c41a' }} />}
            onClick={() => router.push(`${ROUTE_PATHS.uploadBlog}?id=${record._id}`)}
          />
          <Button
            type="text"
            title="Delete"
            loading={deletingId === record._id}
            icon={<DeleteOutlined style={{ fontSize: 16, color: '#ff4d4f' }} />}
            onClick={() => handleDelete(record)}
          />
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: '32px 40px 48px' }}>
        <div className="blog-content" style={{ maxWidth: 1080 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', backgroundColor: '#52c41a', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24, flexShrink: 0 }}>
              <FileTextOutlined />
            </div>
            <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#262626' }}>
              Blog
            </Title>
          </div>

          {/* Create button */}
          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push(ROUTE_PATHS.uploadBlog)}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', borderRadius: 6, padding: '0 24px', height: 38 }}
            >
              Create
            </Button>
          </div>

          {/* Filters */}
          <Row gutter={24} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong style={{ color: '#262626', fontSize: 14, whiteSpace: 'nowrap' }}>
                  Select module:
                </Text>
                <Select
                  value={moduleFilter}
                  onChange={(value) => {
                    setModuleFilter(value);
                    setCategoryFilter('All');
                  }}
                  options={[{ value: 'All', label: 'All' }, ...CONTENT_MODULES.map((module) => ({ value: module, label: module }))]}
                  style={{ width: 200 }}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong style={{ color: '#262626', fontSize: 14, whiteSpace: 'nowrap' }}>
                  Select Category:
                </Text>
                <Select
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  disabled={moduleFilter === 'All'}
                  options={categoryOptions}
                  style={{ width: 200 }}
                />
              </div>
            </Col>
          </Row>

          {/* Blog table */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e8e8e8',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
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
            <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'right', marginTop: 12 }}>
              Showing {filteredBlogs.length} of {total} blogs
            </Text>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default withAdminAuth(BlogsPage);
