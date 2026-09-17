import React, { useEffect, useState } from 'react';
import { App as AntApp, Button, Divider, Space, Tag, Typography } from 'antd';
import { EyeOutlined, FileTextOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';

import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { AdminLayout } from '@/layouts/AdminLayout';
import { PageHeader } from '@/components/blog/PageHeader';
import PageLoading from '@/components/common/PageLoading';

import { BLOG_PREVIEW_STORAGE_KEY } from '@/constants/blog';
import { ROUTE_PATHS } from '@/constants';
import {
  buildDocumentViewerUrl,
  getAttachmentExtension,
  mediaUrl,
  parseBlogAttachments,
} from '@/utils/media';
import { hasVisibleText, sanitizeRichText } from '@/utils/richText';
import { readPreviewValue, removePreviewValue } from '@/utils/blogPreviewStorage';
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

    // Preview mode: load from storage instead of API
    if (isPreviewMode) {
      (async () => {
        let draft: PreviewDraft | null = null;
        try {
          draft = await readPreviewValue<PreviewDraft>(BLOG_PREVIEW_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        // Only clean up the preview draft once it has been read (or confirmed
        // absent), so it is never removed before the read above completes.
        if (draft) {
          // Tolerate drafts saved before the rename of `feature` -> `category`.
          const category =
            (draft as any).category ?? (draft as any).feature;
          // Draft restore intentionally seeds state from storage on mount.
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
        try {
          await removePreviewValue(BLOG_PREVIEW_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      })();
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

  // mediaUrl resolves server-relative /uploads paths and passes data: / https:
  // URLs through unchanged, so it is safe to apply in both preview modes.
  const attachmentUrls = parseBlogAttachments(blog?.attachment).map((a) => ({
    ...a,
    url: mediaUrl(a.url),
  }));
  const contentHtml = sanitizeRichText(blog?.content);

  const openAttachment = (att: ParsedAttachment) => {
    // att.url is already resolved via mediaUrl() in attachmentUrls above, so
    // any relative /uploads path, Cloudinary HTTPS URL and data: URL are ready.
    const ext = getAttachmentExtension(att.name);

    // PDFs: fetch into a blob so the browser's native PDF viewer handles it.
    if (ext === 'pdf') {
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

    // Data URLs (draft preview): convert to blob URL so the browser can open
    // them without relying on external viewers.
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
      return;
    }

    // Server-stored Office files: try the Microsoft Office Online Viewer first.
    // If the viewer cannot reach the URL (localhost, auth-required), fetch the
    // file as a blob instead so it opens directly in the browser.
    const viewerUrl = buildDocumentViewerUrl(att.name, att.url);
    if (viewerUrl) {
      fetch(att.url)
        .then((res) => {
          if (!res.ok) throw new Error('fetch failed');
          return res.arrayBuffer();
        })
        .then((buf) => {
          const mimeMap: Record<string, string> = {
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xls: 'application/vnd.ms-excel',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ppt: 'application/vnd.ms-powerpoint',
            pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          };
          const mime = mimeMap[ext] || 'application/octet-stream';
          const blobUrl = URL.createObjectURL(new Blob([buf], { type: mime }));
          window.open(blobUrl, '_blank');
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        })
        .catch(() => {
          // Fallback: let the browser handle the URL directly (may download).
          window.open(att.url, '_blank');
        });
      return;
    }

    // Everything else: open directly.
    window.open(att.url, '_blank');
  };

  return (
    <AdminLayout>
      <div className="bp-page">
      <PageHeader
        backHref={ROUTE_PATHS.blogs}
        title="Blog preview"
        icon={<FileTextOutlined />}
        showBack={false}
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
    </AdminLayout>
  );
};

export default withAdminAuth(BlogPreview);
