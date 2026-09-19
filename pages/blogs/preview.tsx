import React, { useEffect, useState } from 'react';
import { App as AntApp, Button, Divider, Space, Tag, Typography } from 'antd';
import { EyeOutlined, FileTextOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';

import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { AdminLayout } from '@/layouts/admin-layout';
import { PageHeader } from '@/components/blog/page-header';
import PageLoading from '@/components/common/page-loading';

import { BLOG_PREVIEW_STORAGE_KEY } from '@/constants/blog';
import { ROUTE_PATHS } from '@/constants';
import {
  buildDocumentViewerUrl,
  getAttachmentExtension,
  mediaUrl,
  parseBlogAttachments,
} from '@/utils/media';
import { hasVisibleText, sanitizeRichText } from '@/utils/rich-text';
import { readPreviewValue, removePreviewValue } from '@/utils/blog-preview-storage';
import { getBlogById } from '@/services/blog-service';
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
        // Only clean up after reading to avoid removing before read completes.
        if (draft) {
          // Handle drafts saved before feature->category rename.
          const category =
            (draft as any).category ?? (draft as any).feature;
          // Intentionally seed state from storage on mount.
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

  // mediaUrl resolves /uploads paths and passes data:/https URLs through.
  const attachmentUrls = parseBlogAttachments(blog?.attachment).map((a) => ({
    ...a,
    url: mediaUrl(a.url),
  }));
  const contentHtml = sanitizeRichText(blog?.content);

  const openAttachment = (att: ParsedAttachment) => {
    // att.url already resolved via mediaUrl() - ready to use.
    const ext = getAttachmentExtension(att.name);

    // PDFs: fetch as blob for native viewer.
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

    // Data URLs: convert to blob for browser opening.
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

    // Office files: try Microsoft viewer, fallback to blob fetch.
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
          // Fallback: let browser handle URL directly.
          window.open(att.url, '_blank');
        });
      return;
    }

    // Everything else: open directly.
    window.open(att.url, '_blank');
  };

  const from = router.query.from as string | undefined;
  const section = router.query.section as string | undefined;
  const tab = router.query.tab as string | undefined;
  const backHref = from === 'dashboard'
    ? `${ROUTE_PATHS.adminDashboard}?section=${section || 'recently-uploaded'}${tab ? `&tab=${tab}` : ''}`
    : ROUTE_PATHS.blogs;

  return (
    <AdminLayout>
      <div className="bp-page">
      <PageHeader
        backHref={backHref}
        title="Blog preview"
        icon={<FileTextOutlined />}
        showBack={true}
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
