import React, { useEffect, useState } from 'react';
import { App as AntApp, Button, Divider, Space, Spin, Tag, Typography } from 'antd';
import { EyeOutlined, FileTextOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';

import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { AdminLayout } from '@/layouts/AdminLayout';
import { PageHeader } from '@/components/blog/PageHeader';

import { BLOG_PREVIEW_STORAGE_KEY } from '@/constants/blog';
import { ROUTE_PATHS } from '@/constants';
import {
  buildDocumentViewerUrl,
  fileNameFromUrl,
  mediaUrl,
} from '@/utils/media';
import { hasVisibleText, sanitizeRichText } from '@/utils/richText';
import { getBlogById } from '@/services/blogService';
import type { BlogRecord, ParsedAttachment, PreviewDraft } from '@/types/blog';

const { Title, Text } = Typography;

const BlogPreview = () => {
  const router = useRouter();
  const { message } = AntApp.useApp();

  const [loading, setLoading] = useState(false);
  const [blog, setBlog] = useState<BlogRecord | null>(null);
  const [loadError, setLoadError] = useState('');

  const blogId =
    typeof router.query.id === 'string' && router.query.id ? router.query.id : '';

  const isPreviewMode =
    typeof router.query.preview === 'string' && router.query.preview === '1';

  useEffect(() => {
    if (!router.isReady) return;

    // Preview mode: load from localStorage instead of API
    if (isPreviewMode) {
      try {
        const raw = localStorage.getItem(BLOG_PREVIEW_STORAGE_KEY);
        if (raw) {
          const draft: PreviewDraft = JSON.parse(raw);
          // Tolerate drafts saved before the rename of `feature` -> `category`.
          const category =
            (draft as any).category ?? (draft as any).feature;
          // Draft restore intentionally seeds state from localStorage on mount.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setBlog({
            title: draft.title,
            description: draft.description,
            module: draft.module,
            category,
            content: draft.content,
            thumbnail: draft.thumbnail || undefined,
            attachment: draft.attachments?.length ? JSON.stringify(draft.attachments) : undefined,
          });
        }
        // Only clean up the preview draft once it has been read (or confirmed
        // absent), so it is never removed before the read above completes.
        try {
          localStorage.removeItem(BLOG_PREVIEW_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      } catch {
        /* ignore */
      }
      return;
    }

    // Normal mode: fetch from API
    if (!blogId) return;

    let ignore = false;

    const fetchBlog = async () => {
      setLoading(true);
      setLoadError('');

      try {
        const blogRecord = await getBlogById(blogId);
        if (!ignore) {
          setBlog(blogRecord);
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
  }, [router.isReady, blogId, isPreviewMode]);

  const parseAttachments = (raw: string | undefined): ParsedAttachment[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === 'string') {
              return { name: fileNameFromUrl(item), url: item };
            }
            if (item && typeof item === 'object') {
              // Persisted backend shape: { name, url } (Cloudinary or disk upload)
              if (typeof item.name === 'string' && typeof item.url === 'string') {
                return { name: item.name, url: item.url };
              }
              // Preview-draft localStorage shape: { name, dataUrl }
              if (typeof item.name === 'string' && typeof item.dataUrl === 'string') {
                return { name: item.name, url: item.dataUrl };
              }
            }
            return null;
          })
          .filter(Boolean) as ParsedAttachment[];
      }
    } catch {}
    return raw ? [{ name: fileNameFromUrl(raw), url: raw }] : [];
  };

  // mediaUrl resolves server-relative /uploads paths and passes data: / https:
  // URLs through unchanged, so it is safe to apply in both preview modes.
  const attachmentUrls = parseAttachments(blog?.attachment).map((a) => ({
    ...a,
    url: mediaUrl(a.url),
  }));
  const contentHtml = sanitizeRichText(blog?.content);

  const openAttachment = (att: ParsedAttachment) => {
    // att.url is already resolved via mediaUrl() in attachmentUrls above, so
    // both HTTPS and data: URLs are ready to use.

    // PDF / Office documents open in their third-party viewer in a NEW tab.
    // Google Docs Viewer handles PDFs; Microsoft Office Viewer handles the
    // Office formats. A downloadable (non-viewer) URL falls back to the
    // existing download behavior below.
    const viewerUrl = buildDocumentViewerUrl(att.name, att.url);
    if (viewerUrl) {
      window.open(viewerUrl, '_blank');
      return;
    }

    // Unsupported formats (and data: URLs that viewers cannot reach) keep the
    // existing download behavior: data URLs fetched into a blob then opened,
    // everything else opened directly.
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
    <AdminLayout>
      <div style={{ padding: '32px', backgroundColor: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ width: '100%' }}>
        <div className="blog-content" style={{ maxWidth: '100%' }}>
          <PageHeader
            backHref={
              isPreviewMode
                ? blogId
                  ? `${ROUTE_PATHS.uploadBlog}?id=${blogId}`
                  : ROUTE_PATHS.uploadBlog
                : ROUTE_PATHS.adminDashboard
            }
            title="Blog preview"
            icon={<FileTextOutlined />}
            showBack={false}
          />

          <div className="blog-card bp-card">
            {loading ? (
              <div className="bp-loading">
                <Spin size="large" />
              </div>
            ) : loadError && !blog ? (
              <Text type="secondary" className="bp-empty-text">
                {loadError}
              </Text>
            ) : !blog ? (
              <Text type="secondary" className="bp-empty-text">
                No blog selected to preview.
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
                    <Divider className="blog-divider" />
                    <div
                      className="blog-rich-content bp-rich-content"
                      dangerouslySetInnerHTML={{ __html: contentHtml }}
                    />
                  </>
                )}

                {attachmentUrls.length > 0 && (
                  <>
                    <Divider className="blog-divider" />
                    <Title level={5} className="bp-attachment-title">
                      Attachment
                    </Title>
                    {attachmentUrls.map((att, idx) => (
                      <div
                        key={idx}
                        className={`bp-attachment-item${idx < attachmentUrls.length - 1 ? '' : ' bp-attachment-item-last'}`}
                      >
                        <PaperClipOutlined className="bp-attachment-icon" />
                        <span className={`bp-attachment-name${isPreviewMode ? ' bp-attachment-name-preview' : ''}`}>
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
      </div>
      </div>
    </AdminLayout>
  );
};

export default withAdminAuth(BlogPreview);
