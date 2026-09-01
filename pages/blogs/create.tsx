import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { App as AntApp, Button, Divider, Modal, Spin, Typography } from 'antd';
import { useRouter } from 'next/router';

import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { AdminLayout } from '@/layouts/AdminLayout';
import { PageHeader } from '@/components/blog/PageHeader';
import { ThumbnailUpload } from '@/components/blog/ThumbnailUpload';
import { AttachmentUpload } from '@/components/blog/AttachmentUpload';
import { BlogDetailsFields } from '@/components/blog/BlogDetailsFields';
import { BlogCategoryFields } from '@/components/blog/BlogCategoryFields';
import { BlogContentField } from '@/components/blog/BlogContentField';
import { BlogFormActions } from '@/components/blog/BlogFormActions';

import { GREEN } from '@/constants/blog';
import { ROUTE_PATHS } from '@/constants';
import { createBlog, getBlogById, updateBlog } from '@/services/blogService';
import { fileNameFromUrl, mediaUrl, parseBlogAttachments } from '@/utils/media';
import {
  DEFAULT_FORM_VALUES,
  useBlogDraft,
  type BlogFormValues,
} from '@/hooks/useBlogDraft';

const { Title, Text } = Typography;

const UploadBlog = () => {
  const router = useRouter();
  const { message } = AntApp.useApp();

  const blogId =
    typeof router.query.id === 'string' && router.query.id ? router.query.id : '';
  const editMode = Boolean(blogId);

  const [initialData, setInitialData] = useState<{
    thumbnail: { name: string; url: string } | null;
    attachments: { name: string; url: string }[];
  }>({ thumbnail: null, attachments: [] });
  const [seeding, setSeeding] = useState(editMode);

  const { control, handleSubmit, getValues, reset, setValue } = useForm<BlogFormValues>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const draft = useBlogDraft({
    getValues,
    reset,
    router,
    message,
    editMode,
    initialData,
  });
  const {
    loading,
    setLoading,
    thumbnail,
    thumbnailError,
    setThumbnailError,
    handleThumbnailChange,
    handleThumbnailRemove,
    attachments,
    attachmentError,
    handleAttachmentChange,
    handleAttachmentRemove,
    existingThumbnail,
    existingAttachments,
    removeAttachmentUrls,
    handleExistingAttachmentRemove,
    resetEditState,
    scheduleDraftSave,
    resetBlogForm,
    performNavigation,
    handlePreview,
    requestNavigation,
    draftPromptVisible,
    handleSaveDraftNavigate,
    handleDiscardNavigate,
    handleStayOnPage,
  } = draft;

  // Load the blog when editing and seed the form + existing assets.
  useEffect(() => {
    if (!editMode || !router.isReady) return;
    let ignore = false;

    const loadBlog = async () => {
      setSeeding(true);
      try {
        const blog = await getBlogById(blogId);
        if (ignore || !blog) return;

        reset({
          title: blog.title ?? '',
          description: blog.description ?? '',
          module: blog.module ?? '',
          // Tolerate legacy docs stored under `feature` before the rename.
          category: (blog as any).category ?? (blog as any).feature ?? '',
          content: blog.content ?? '',
        });

        const next = {
          thumbnail: blog.thumbnail
            ? { name: fileNameFromUrl(blog.thumbnail), url: mediaUrl(blog.thumbnail) }
            : null,
          // Keep the raw stored URL so removals match the server's stored
          // attachment values exactly (Cloudinary HTTPS or /uploads path).
          attachments: parseBlogAttachments(blog.attachment),
        };
        setInitialData(next);
        resetEditState(next);
      } catch (error: any) {
        message.error(error.message || 'Failed to load the blog');
      } finally {
        if (!ignore) setSeeding(false);
      }
    };

    loadBlog();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, blogId, router.isReady]);

  // Track changes so the draft autosave debounce fires exactly like antd's
  // onValuesChange (only on user interaction, not on programmatic reset).
  const trackChange = (setter: (value: unknown) => void) => (value: unknown) => {
    setter(value);
    scheduleDraftSave();
  };

  const onFinish = async (values: BlogFormValues) => {
    // In edit mode the existing thumbnail is kept unless a new one is picked.
    if (!thumbnail && !existingThumbnail) {
      setThumbnailError('Please upload a thumbnail image');
      message.error('Please upload a thumbnail image');
      return;
    }

    setLoading(true);
    try {
      if (editMode) {
        await updateBlog(blogId, {
          title: values.title,
          description: values.description,
          module: values.module,
          category: values.category,
          content: values.content || '',
          thumbnail: thumbnail?.file ?? null,
          attachments: attachments.map((att) => att.file),
          removeAttachmentUrls,
        });
        message.success('Blog updated successfully!');
        performNavigation(ROUTE_PATHS.blogs);
      } else {
        if (!thumbnail) {
          setThumbnailError('Please upload a thumbnail image');
          message.error('Please upload a thumbnail image');
          return;
        }
        await createBlog({
          title: values.title,
          description: values.description,
          module: values.module,
          category: values.category,
          content: values.content || '',
          thumbnail: thumbnail.file,
          attachments: attachments.map((att) => att.file),
        });
        message.success('Blog created successfully!');
        resetBlogForm();
        performNavigation(ROUTE_PATHS.blogs);
      }
    } catch (error: any) {
      message.error(error.message || (editMode ? 'Failed to update blog' : 'Failed to create blog'));
      setLoading(false);
    }
  };

  const submit = handleSubmit(onFinish);

  return (
    <AdminLayout onNavigate={requestNavigation}>
      <div style={{ padding: '32px', backgroundColor: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ width: '100%' }}>
          <div className="blog-content" style={{ maxWidth: '100%' }}>
          <PageHeader
            backHref={ROUTE_PATHS.blogs}
            backOnClick={(event) => {
              event.preventDefault();
              requestNavigation(ROUTE_PATHS.blogs);
            }}
            title={editMode ? 'Edit Blog' : 'Create New Blog'}
            subtitle={editMode ? 'Update Your Blog' : 'Add New Blog To Your List'}
            showBack={false}
          />

          <div className="blog-card" style={{ padding: '32px', borderRadius: '12px' }}>
            {seeding ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                <Spin size="large" />
              </div>
            ) : (
              <form onSubmit={submit}>
                <BlogDetailsFields control={control} trackChange={trackChange} />

                <BlogCategoryFields control={control} trackChange={trackChange} setValue={setValue} />

                <Title level={5} className="blog-section-label" style={{ margin: '0 0 2px 0' }}>
                  Upload Thumbnail <span className="blog-required">*</span>
                </Title>
                <Text type="secondary" className="blog-section-hint">
                  Upload a thumbnail image for your blog.
                </Text>

                <ThumbnailUpload
                  thumbnail={thumbnail}
                  existingThumbnail={existingThumbnail}
                  error={thumbnailError}
                  onChange={handleThumbnailChange}
                  onRemove={handleThumbnailRemove}
                />

                <Divider className="blog-divider" />

                <BlogContentField control={control} trackChange={trackChange} />

                <Title level={5} className="blog-section-label" style={{ margin: '0 0 2px 0' }}>
                  Attachment
                </Title>
                <Text type="secondary" className="blog-section-hint">
                  Upload file required in this blog
                </Text>

                <AttachmentUpload
                  attachments={attachments}
                  existingAttachments={existingAttachments}
                  error={attachmentError}
                  onChange={handleAttachmentChange}
                  onRemove={handleAttachmentRemove}
                  onRemoveExisting={handleExistingAttachmentRemove}
                />

                <Divider className="blog-divider" />

                <BlogFormActions
                  handlePreview={handlePreview}
                  onCancel={() => requestNavigation(editMode ? ROUTE_PATHS.blogs : ROUTE_PATHS.adminDashboard)}
                  loading={loading}
                  submitLabel={editMode ? 'Save Changes' : 'Create Blog'}
                />
              </form>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* UNSAVED BLOG DRAFT CONFIRMATION */}
      <Modal
        open={draftPromptVisible}
        onCancel={handleStayOnPage}
        width={440}
        title={<span style={{ color: GREEN, fontWeight: 700 }}>Unsaved blog</span>}
        footer={[
          <Button key="cancel" onClick={handleStayOnPage}>
            Cancel
          </Button>,
          <Button key="discard" danger onClick={handleDiscardNavigate}>
            Discard
          </Button>,
          <Button
            key="save-draft"
            type="primary"
            style={{ backgroundColor: GREEN }}
            onClick={handleSaveDraftNavigate}
          >
            Save as Draft
          </Button>,
        ]}
      >
        <Text>Do you want to save this blog as a draft?</Text>
      </Modal>
    </AdminLayout>
  );
};

export default withAdminAuth(UploadBlog);
