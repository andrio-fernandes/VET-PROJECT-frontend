import React, { useEffect, useState } from 'react';
import { App as AntApp, Button, Divider, Space, Spin, Tag, Typography } from 'antd';
import { EyeOutlined, FileTextOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';

import { withAdminAuth } from '../../src/components/auth/with-admin-auth';
import { AdminLayout } from '../../src/components/layouts/admin-layout';
import { PageHeader } from '../../src/components/blog/PageHeader';

import { BLOG_PREVIEW_STORAGE_KEY, GREEN } from '../../src/constants/blog';
import { ROUTE_PATHS } from '../../src/utils/constant';
import { fileNameFromUrl, mediaUrl } from '../../src/utils/media';
import { hasVisibleText, sanitizeRichText } from '../../src/utils/richText';
import { getBlogById } from '../../src/services/blogService';
import type { BlogRecord, ParsedAttachment, PreviewDraft } from '../../src/types/blog';

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

  const attachmentUrls = isPreviewMode
    ? parseAttachments(blog?.attachment)
    : parseAttachments(blog?.attachment).map((a) => ({
        ...a,
        url: mediaUrl(a.url),
      }));
  const contentHtml = sanitizeRichText(blog?.content);

  const openAttachment = (att: ParsedAttachment) => {
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
      <div style={{ padding: '32px 40px 48px' }}>
        <div className="blog-content">
          <PageHeader
            backHref={isPreviewMode ? ROUTE_PATHS.uploadBlog : ROUTE_PATHS.adminDashboard}
            title="Blog preview"
            icon={<FileTextOutlined />}
          />

          <div className="blog-card" style={{ padding: '32px 36px', minHeight: 320 }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                <Spin size="large" />
              </div>
            ) : loadError && !blog ? (
              <Text type="secondary" style={{ fontSize: 15 }}>
                {loadError}
              </Text>
            ) : !blog ? (
              <Text type="secondary" style={{ fontSize: 15 }}>
                No blog selected to preview.
              </Text>
            ) : (
              <>
                <Title level={2} style={{ margin: '0 0 10px 0', fontWeight: 700, color: '#262626' }}>
                  {blog.title}
                </Title>

                <Text type="secondary" style={{ fontSize: 15, display: 'block', lineHeight: 1.6 }}>
                  {blog.description}
                </Text>

                {(blog.module || blog.category) && (
                  <div style={{ margin: '12px 0' }}>
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
                    style={{
                      width: '100%',
                      height: 320,
                      objectFit: 'cover',
                      borderRadius: 12,
                      border: '1px solid #f0f0f0',
                      margin: '20px 0 4px 0',
                      display: 'block',
                    }}
                  />
                )}

                {hasVisibleText(contentHtml) && (
                  <>
                    <Divider className="blog-divider" />
                    <div
                      className="blog-rich-content"
                      style={{ fontSize: 15, lineHeight: 1.7, color: '#333333' }}
                      dangerouslySetInnerHTML={{ __html: contentHtml }}
                    />
                  </>
                )}

                {attachmentUrls.length > 0 && (
                  <>
                    <Divider className="blog-divider" />
                    <Title level={5} style={{ margin: '0 0 12px 0', fontWeight: 700, color: '#262626' }}>
                      Attachment
                    </Title>
                    {attachmentUrls.map((att, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          border: '1px solid #d9d9d9',
                          borderRadius: 8,
                          padding: '12px 16px',
                          marginBottom: idx < attachmentUrls.length - 1 ? 8 : 0,
                        }}
                      >
                        <PaperClipOutlined style={{ fontSize: 20, color: GREEN }} />
                        <span style={{ flex: 1, fontSize: 14, color: isPreviewMode ? GREEN : '#333333', wordBreak: 'break-all' }}>
                          {att.name}
                        </span>
                        <Button
                          type="text"
                          icon={<EyeOutlined />}
                          onClick={() => openAttachment(att)}
                          style={{ color: GREEN }}
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
    </AdminLayout>
  );
};

export default withAdminAuth(BlogPreview);
