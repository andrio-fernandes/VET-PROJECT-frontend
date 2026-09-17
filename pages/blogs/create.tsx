import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';
import { App as AntApp, Button, Divider, Modal, Typography } from 'antd';
import { useRouter } from 'next/router';

import { withAdminAuth } from '@/components/auth/with-admin-auth';
import PageLoading from '@/components/common/PageLoading';
import { CreateContentLayout } from '@/components/common/create/CreateContentLayout';
import { CreatePageHeader } from '@/components/common/create/CreatePageHeader';
import { CreateFormActions } from '@/components/common/create/CreateFormActions';
import { ThumbnailUpload } from '@/components/blog/ThumbnailUpload';
import { AttachmentUpload } from '@/components/blog/AttachmentUpload';
import { BlogDetailsFields } from '@/components/blog/BlogDetailsFields';
import { BlogCategoryFields } from '@/components/blog/BlogCategoryFields';
import { BlogContentField } from '@/components/blog/BlogContentField';
import { BlogPreviewModal, type BlogPreviewData } from '@/components/blog/BlogPreviewModal';

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
  // Original server text values (edit mode only) used as the baseline so the
  // unsaved-change check compares against what was actually loaded.
  const [baselineValues, setBaselineValues] = useState<BlogFormValues>(DEFAULT_FORM_VALUES);
  const [seeding, setSeeding] = useState((): boolean => {
    // Show the spinner until the route is resolved so the empty form (or a
    // stale draft) is never flashed before the real data is seeded.
    return editMode || !router.isReady;
  });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState<BlogPreviewData | null>(null);

  // Once the route is resolved and this is a fresh create (not an edit), hide
  // the spinner; the draft restore effect will populate the form if needed.
  useEffect(() => {
    if (router.isReady && !editMode) {
      // Defer so the setState is not called synchronously within the effect
      // body (avoids the React Compiler rule).
      queueMicrotask(() => setSeeding(false));
    }
  }, [router.isReady, editMode]);

  const { control, handleSubmit, getValues, reset, setValue, trigger, formState } = useForm<BlogFormValues>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const draft = useBlogDraft({
    getValues,
    reset,
    router,
    message,
    isReady: router.isReady,
    blogId,
    editMode,
    initialData,
    baseline: baselineValues,
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
    draftAvailable,
    confirmRestoreDraft,
    confirmDiscardDraft,
    performNavigation,
    preparePreviewData,
    handlePreview,
    requestNavigation,
    restoreEditRoundTrip,
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
        setBaselineValues({
          title: blog.title ?? '',
          description: blog.description ?? '',
          module: blog.module ?? '',
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
        await restoreEditRoundTrip(blogId);
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

  const handlePreviewModal = async () => {
    const valid = await trigger();
    if (!valid) {
      scrollToFirstInvalid();
      return;
    }
    const data = await preparePreviewData();
    if (data) {
      setPreviewData(data);
      setPreviewVisible(true);
    }
  };

  const onFinish = async (values: BlogFormValues) => {
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
        await createBlog({
          title: values.title,
          description: values.description,
          module: values.module,
          category: values.category,
          content: values.content || '',
          thumbnail: thumbnail?.file ?? null,
          attachments: attachments.map((att) => att.file),
        });
        message.success('Blog created successfully!');
        resetBlogForm();
        performNavigation(ROUTE_PATHS.adminDashboard);
      }
    } catch (error: any) {
      message.error(error.message || (editMode ? 'Failed to update blog' : 'Failed to create blog'));
      setLoading(false);
    }
  };

  // Scroll the page to a specific field so validation failures are visible.
  const scrollToField = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el as HTMLElement).focus?.();
    }
  };

  const BLOG_FIELD_ORDER: (keyof BlogFormValues)[] = [
    'title',
    'description',
    'module',
    'category',
    'content',
  ];

  // RHF passes the errors object when submit validation fails. Scroll to the
  // first invalid field, in document order.
  const onInvalid = (errors: FieldErrors<BlogFormValues>) => {
    const firstKey = BLOG_FIELD_ORDER.find((key) => errors[key]);
    if (firstKey) {
      scrollToField(`blog-${firstKey}`);
    }
  };

  const scrollToFirstInvalid = () => {
    const firstKey = BLOG_FIELD_ORDER.find((key) => formState.errors[key]);
    if (firstKey) {
      scrollToField(`blog-${firstKey}`);
    }
  };

  const submit = handleSubmit(onFinish, onInvalid);
  return (
    <CreateContentLayout
      onNavigate={requestNavigation}
      pageClassName="create-page"
      innerClassName="create-inner"
      restoreDraft={{
        open: draftAvailable,
        noun: 'blog draft',
        onRestore: confirmRestoreDraft,
        onDiscard: confirmDiscardDraft,
      }}
    >
          <CreatePageHeader
            wrapperClassName="create-header"
            bodyClassName="create-header-body"
            titleClassName="create-header-title"
            backHref={ROUTE_PATHS.blogs}
            backOnClick={(event) => {
              event.preventDefault();
              requestNavigation(ROUTE_PATHS.blogs);
            }}
            title={editMode ? 'Edit Blog' : 'Create New Blog'}
            showBack={false}
          />

          <div className="create-card">
            {seeding ? (
              <PageLoading />
            ) : (
              <form onSubmit={submit}>
                <BlogDetailsFields control={control} trackChange={trackChange} />

                <BlogCategoryFields control={control} trackChange={trackChange} setValue={setValue} />

                <div id="blog-thumbnail">
                  <Title level={5} className="create-section-label">
                    Upload Thumbnail
                  </Title>
                  <Text type="secondary" className="create-hint">
                    Upload a thumbnail image for your blog. A default image is
                    shown if you skip this.
                  </Text>

                  <ThumbnailUpload
                    thumbnail={thumbnail}
                    existingThumbnail={existingThumbnail}
                    error={thumbnailError}
                    onChange={handleThumbnailChange}
                    onRemove={handleThumbnailRemove}
                  />
                </div>

                <Divider className="create-divider" />

                <BlogContentField control={control} trackChange={trackChange} />

                <Title level={5} className="create-section-label">
                  Attachment
                </Title>
                <Text type="secondary" className="create-hint">
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

                <Divider className="create-divider" />

                <CreateFormActions
                  onPreview={handlePreviewModal}
                  onCancel={() => requestNavigation(editMode ? ROUTE_PATHS.blogs : ROUTE_PATHS.adminDashboard)}
                  loading={loading}
                  submitLabel={editMode ? 'Save Changes' : 'Create'}
                  previewButtonClassName="create-btn-preview"
                  cancelDanger
                  cancelButtonClassName="create-btn-cancel"
                  submitButtonClassName="create-btn-create"
                />
              </form>
            )}
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

      {/* BLOG PREVIEW MODAL */}
      <BlogPreviewModal
        open={previewVisible}
        data={previewData}
        onClose={() => {
          setPreviewVisible(false);
          setPreviewData(null);
        }}
      />
    </CreateContentLayout>
  );
};

export default withAdminAuth(UploadBlog);
