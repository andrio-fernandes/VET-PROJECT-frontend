import React, { useEffect, useState } from 'react';
import { App as AntApp, Button, Divider, Space, Tag, Typography } from 'antd';
import { EyeOutlined, FileTextOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';

import { withAuth } from '@/components/auth/with-auth';
import { UserLayout } from '@/layouts/user-layout';
import { PageHeader } from '@/components/blog/page-header';
import PageLoading from '@/components/common/page-loading';
import { ROUTE_PATHS } from '@/constants';
import {
  buildDocumentViewerUrl,
  getAttachmentExtension,
  mediaUrl,
  parseBlogAttachments,
} from '@/utils/media';
import { hasVisibleText, sanitizeRichText } from '@/utils/rich-text';
import { getLibraryBlogById, markViewed } from '@/services/library-service';
import type { BlogRecord, ParsedAttachment } from '@/types/blog';

const { Title, Text } = Typography;

const UserBlogPreview = () => {
  const router = useRouter();
  const { message } = AntApp.useApp();

  const [loading, setLoading] = useState(false);
  const [blog, setBlog] = useState<BlogRecord | null>(null);
  const [loadError, setLoadError] = useState('');

  const blogId =
    typeof router.query.id === 'string' && router.query.id ? router.query.id : '';
  const from = router.query.from as string | undefined;
  const tab = router.query.tab as string | undefined;
  const section = router.query.section as string | undefined;
  const searchQ = router.query.q as string | undefined;
  const buildSearchBackHref = () => {
    const params = new URLSearchParams();
    if (tab) params.set('tab', tab);
    if (searchQ) params.set('q', searchQ);
    const qs = params.toString();
    return `${ROUTE_PATHS.search}${qs ? `?${qs}` : ''}`;
  };
  const backHref = from === 'search'
    ? buildSearchBackHref()
    : from === 'dashboard'
      ? `${ROUTE_PATHS.userDashboard}?section=${section || 'latest-content'}${tab ? `&tab=${tab}` : ''}`
      : ROUTE_PATHS.userBlogs;

  useEffect(() => {
    if (!router.isReady || !blogId) return;
    let ignore = false;

    const fetchBlog = async () => {
      setLoading(true);
      setLoadError('');

      try {
        const blogRecord = await getLibraryBlogById(blogId);
        if (!ignore) {
          setBlog(blogRecord);
          // Record that this user has viewed the blog (badge + continue feed).
          markViewed('blog', blogId).catch(() => {
            // Best-effort update; ignore failures.
          });
        }
      } catch (error: any) {
        if (!ignore) {
          setLoadError(error.message || 'Failed to load the blog');
          message.error(error.message || 'Failed to load the blog');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchBlog();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, blogId]);

  const attachmentUrls = parseBlogAttachments(blog?.attachment).map((a) => ({
    ...a,
    url: mediaUrl(a.url),
  }));
  const contentHtml = sanitizeRichText(blog?.content);

  const openAttachment = (att: ParsedAttachment) => {
    if (getAttachmentExtension(att.name) === 'pdf') {
      fetch(att.url)
        .then((res) => res.arrayBuffer())
        .then((buf) => {
          const blobUrl = URL.createObjectURL(new Blob([buf], { type: 'application/pdf' }));
          window.open(blobUrl, '_blank');
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        })
        .catch(() => {
          window.open(att.url, '_blank');
        });
      return;
    }

    if (!att.url.startsWith('data:')) {
      const viewerUrl = buildDocumentViewerUrl(att.name, att.url);
      if (viewerUrl) {
        window.open(viewerUrl, '_blank');
        return;
      }
    }

    if (att.url.startsWith('data:')) {
      fetch(att.url)
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        })
        .catch(() => {
          window.open(att.url, '_blank');
        });
    } else {
      window.open(att.url, '_blank');
    }
  };

  return (
    <UserLayout activeKey={ROUTE_PATHS.userBlogs}>
      <div className="bp-page">
        <PageHeader
          backHref={backHref}
          title="Blog"
          icon={<FileTextOutlined />}
          showBack
        />

        <div className="bp-card">
          {loading ? (
            <PageLoading />
          ) : loadError && !blog ? (
            <Text type="secondary" className="bp-empty-text">
              {loadError}
            </Text>
          ) : !blog ? (
            <Text type="secondary" className="bp-empty-text">
              No blog selected.
            </Text>
          ) : (
            <>
              <Title level={2} className="bp-title">
                {blog.title}
              </Title>

              <Text type="secondary" className="bp-description">
                {blog.description}
              </Text>

              {(blog.module || blog.category) && (
                <div className="bp-tags">
                  <Space size="small" wrap>
                    {blog.module && <Tag color="green">{blog.module}</Tag>}
                    {blog.category && <Tag color="green">{blog.category}</Tag>}
                  </Space>
                </div>
              )}

              {blog.thumbnail && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={mediaUrl(blog.thumbnail)}
                  alt={blog.title || 'Blog thumbnail'}
                  className="bp-thumb"
                />
              )}

              {hasVisibleText(contentHtml) && (
                <>
                  <Divider className="create-divider" />
                  <div
                    className="blog-rich-content bp-rich-content"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                  />
                </>
              )}

              {attachmentUrls.length > 0 && (
                <>
                  <Divider className="create-divider" />
                  <Title level={5} className="create-section-label">
                    Attachment
                  </Title>
                  {attachmentUrls.map((att, idx) => (
                    <div
                      key={idx}
                      className={`bp-attachment-item${idx < attachmentUrls.length - 1 ? '' : ' bp-attachment-item-last'}`}
                    >
                      <PaperClipOutlined className="bp-attachment-icon" />
                      <span className="bp-attachment-name">
                        {att.name}
                      </span>
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => openAttachment(att)}
                        className="bp-attachment-view"
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default withAuth(UserBlogPreview);