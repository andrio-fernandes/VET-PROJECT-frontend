import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { withAdminAuth } from "@/components/auth/with-admin-auth";
import { createVideo, getVideoById, updateVideo } from "@/services/videoService";
import { ROUTE_PATHS, RETAINED_VIDEO_STORAGE_KEY } from "@/constants";
import { Form, Typography, App as AntApp } from "antd";
import { CreateContentLayout } from "@/components/common/create/CreateContentLayout";
import { CreatePageHeader } from "@/components/common/create/CreatePageHeader";
import { CreateFormActions } from "@/components/common/create/CreateFormActions";
import PageLoading from "@/components/common/PageLoading";
import { useUnsavedNavigation } from "@/hooks/useUnsavedNavigation";
import { useDraftRestore } from "@/hooks/useDraftRestore";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import {
  resetCategoryOnModuleChange,
  scrollToFirstError,
} from "@/utils/formValidation";
import { VideoDetailsFields } from "@/components/video/video-details-fields";
import { VideoModuleCategoryField } from "@/components/video/video-module-category-field";
import { VideoThumbnailUpload } from "@/components/video/video-thumbnail-upload";
import { VideoFileUpload } from "@/components/video/video-file-upload";
import { VideoUploadStatusPanel } from "@/components/video/video-upload-status-panel";
import { UploadInProgressModal } from "@/components/video/upload-in-progress-modal";
import { VideoPreviewModal } from "@/components/video/video-preview-modal";

const { Title } = Typography;

const UploadVideo = () => {
  const { message } = AntApp.useApp();
  const router = useRouter();

  const videoId =
    typeof router.query.id === "string" &&
    router.query.id &&
    router.query.id !== "undefined"
      ? router.query.id
      : "";
  const editMode = Boolean(videoId);

  const [form] = Form.useForm();
  const [seeding, setSeeding] = useState(editMode);
  const [loading, setLoading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [uploadLeaveOpen, setUploadLeaveOpen] = useState(false);
  // Original server values (edit mode only) used as the baseline so Cancel only
  // prompts when the user actually changed something.
  const [baseline, setBaseline] = useState<{
    title: string;
    description: string;
    module?: string;
    category?: string;
    hasVideo: boolean;
    hasThumbnail: boolean;
  }>({ title: '', description: '', hasVideo: false, hasThumbnail: false });
  const mountedRef = useRef(true);

  const upload = useVideoUpload({ message, setIsDirty });

  const nav = useUnsavedNavigation({
    router,
    isDirty,
    loading,
    skipGuard: editMode,
    onBlockedDuringUpload: () => setUploadLeaveOpen(true),
    beforeUnloadFlush: () => {
      const values = form.getFieldsValue();
      localStorage.setItem(
        RETAINED_VIDEO_STORAGE_KEY,
        JSON.stringify({
          title: values.title,
          description: values.description,
          module: values.module,
          category: values.category,
        })
      );
    },
  });

  const { restoreOpen, confirmRestoreDraft, confirmDiscardDraft } = useDraftRestore({
    storageKey: RETAINED_VIDEO_STORAGE_KEY,
    form,
    message,
    enabled: !editMode,
    applyValues: (values) =>
      form.setFieldsValue({
        title: values.title,
        description: values.description,
        module: values.module,
        category: values.category,
      }),
    onRestored: () => setIsDirty(true),
    onDiscarded: () => setIsDirty(false),
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // The background upload must NOT be cancelled here — the manager owns
      // the job module-level and continues independently of this component.
    };
  }, []);

  // Load the existing video when editing and seed the form + current assets.
  useEffect(() => {
    if (!editMode || !router.isReady) return;
    let ignore = false;

    const loadVideo = async () => {
      setSeeding(true);
      try {
        const video = await getVideoById(videoId);
        if (ignore || !video) return;

        form.setFieldsValue({
          title: video.title ?? "",
          description: video.description ?? "",
          module: video.module ?? "",
          category: video.category ?? "",
        });

        setBaseline({
          title: video.title ?? "",
          description: video.description ?? "",
          module: video.module ?? "",
          category: video.category ?? "",
          hasVideo: Boolean(video.videoUrl),
          hasThumbnail: Boolean(video.thumbnailUrl),
        });

        upload.seedMedia({
          videoUrl: video.videoUrl ?? undefined,
          thumbnailUrl: video.thumbnailUrl ?? undefined,
        });
      } catch (error: any) {
        if (!ignore) {
          message.error(error.message || "Failed to load the video");
        }
      } finally {
        if (!ignore) setSeeding(false);
      }
    };

    loadVideo();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, videoId, router.isReady]);

  const onFinish = async (values: any) => {
    if (editMode) {
      setLoading(true);
      setUploadFailed(null);
      try {
        // Upload replacement media (if any) directly to Cloudinary.
        const media = await upload.uploadMedia();
        await updateVideo(videoId, {
          title: values.title,
          description: values.description,
          module: values.module,
          category: values.category,
          publicId: media.publicId ?? null,
          thumbnailPublicId: media.thumbnailPublicId ?? null,
        });
        message.success("Video updated successfully");
        localStorage.removeItem(RETAINED_VIDEO_STORAGE_KEY);
        setIsDirty(false);
        router.push(ROUTE_PATHS.videos);
      } catch (error: any) {
        message.error(error.message || "Failed to update video");
        setLoading(false);
      }
      return;
    }

    if (!upload.file) {
      message.error("Please upload a video.");
      return;
    }

    setLoading(true);
    setUploadFailed(null);

    try {
      // 1) Push the bytes to Cloudinary from the browser (server never buffers
      //    the video), then 2) persist metadata + the resulting ids. No
      //    background step: the record is created "ready" once this returns.
      const media = await upload.uploadMedia();
      const created = await createVideo({
        title: values.title,
        description: values.description,
        module: values.module,
        category: values.category,
        publicId: media.publicId as string,
        thumbnailPublicId: media.thumbnailPublicId,
      });

      if (!created) throw new Error("Failed to create the video record.");

      if (!mountedRef.current) return;

      setIsDirty(false);
      message.open({
        content: "Video created successfully",
        type: "success",
        duration: 4,
        className: "vc-center-message-open",
        style: { fontSize: 16 },
      });
      localStorage.removeItem(RETAINED_VIDEO_STORAGE_KEY);
      form.resetFields();
      upload.resetMedia();
      // Navigate only after the loading flag clears so the route guard does
      // not treat the finished upload as "in progress".
      setLoading(false);
      nav.skipNextNavigation();
      router.push(ROUTE_PATHS.adminDashboard);
    } catch (error: any) {
      if (mountedRef.current && !upload.abortedRef.current) {
        setUploadFailed(error.message || "Failed to upload video");
        message.error(error.message || "Failed to upload video");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleRetry = () => {
    setUploadFailed(null);
    form.submit();
  };

  const handleCancel = () => {
    if (loading) {
      setUploadLeaveOpen(true);
      return;
    }
    if (editMode) {
      nav.skipNextNavigation();
      setIsDirty(false);

      const values = form.getFieldsValue();
      const hasChanges =
        (values.title ?? "") !== baseline.title ||
        (values.description ?? "") !== baseline.description ||
        (values.module ?? "") !== baseline.module ||
        (values.category ?? "") !== baseline.category ||
        // In edit mode the existing video/thumbnail can only be REPLACED (never
        // removed), so a newly picked file is exactly a media change. "Boolean(file)
        // !== baseline.hasVideo" would miss a replacement (true !== true).
        Boolean(upload.file) ||
        Boolean(upload.thumbnail);

      if (!hasChanges) {
        router.push(ROUTE_PATHS.videos);
        return;
      }
      nav.openLeaveConfirm(() => {
        router.push(ROUTE_PATHS.videos);
      });
      return;
    }

    const values = form.getFieldsValue();
    const hasContent =
      Boolean(values.title?.trim()) ||
      Boolean(values.description?.trim()) ||
      Boolean(values.module) ||
      Boolean(values.category) ||
      Boolean(upload.file) ||
      Boolean(upload.thumbnail) ||
      Boolean(editMode && upload.existingVideoUrl) ||
      Boolean(editMode && upload.existingThumbnailUrl);

    if (!hasContent) {
      router.push(editMode ? ROUTE_PATHS.videos : ROUTE_PATHS.adminDashboard);
      return;
    }
    nav.openLeaveConfirm(() => {
      router.push(editMode ? ROUTE_PATHS.videos : ROUTE_PATHS.adminDashboard);
    });
  };

  const confirmLeave = () => {
    const onLeave = nav.confirmLeaveRef.current;
    const values = form.getFieldsValue();
    if (!editMode) {
      localStorage.setItem(
        RETAINED_VIDEO_STORAGE_KEY,
        JSON.stringify({
          title: values.title,
          description: values.description,
          module: values.module,
          category: values.category,
        })
      );
      message.info("Progress saved.");
    }
    nav.dismissLeaveConfirm();
    setIsDirty(false);
    if (onLeave) onLeave();
  };

  const confirmDiscard = () => {
    nav.dismissLeaveConfirm();
    nav.clearPendingNavigation();
    setIsDirty(false);
    router.push(editMode ? ROUTE_PATHS.videos : ROUTE_PATHS.adminDashboard);
  };

  const confirmUploadLeave = () => {
    const url =
      nav.pendingNavRef.current ||
      (editMode ? ROUTE_PATHS.videos : ROUTE_PATHS.adminDashboard);
    upload.abortUpload();
    nav.skipNextNavigation();
    setIsDirty(false);
    setUploadLeaveOpen(false);
    nav.clearPendingNavigation();
    router.push(url);
  };

  const confirmStayUploading = () => {
    nav.clearPendingNavigation();
    setUploadLeaveOpen(false);
  };

  return (
    <CreateContentLayout
      pageClassName="create-page"
      innerClassName="create-inner"
      leaveConfirm={{
        open: nav.leaveConfirmOpen,
        onCancel: nav.dismissLeaveConfirm,
        onSave: confirmLeave,
        onDiscard: confirmDiscard,
      }}
      restoreDraft={{
        open: restoreOpen,
        noun: "video draft",
        onRestore: confirmRestoreDraft,
        onDiscard: confirmDiscardDraft,
      }}
    >
          {/* Header Section */}
          <CreatePageHeader
            wrapperClassName="create-header"
            bodyClassName="create-header-body"
            titleClassName="create-header-title"
            title={editMode ? "Edit Video" : "Create New Video"}
          />

          {/* Main Form Card */}
          <div className="create-card">
            <Title level={5} className="create-card-title">Video Details</Title>

            {seeding ? (
              <PageLoading />
            ) : (
            <Form
              form={form}
              layout="vertical"
              validateTrigger={submitted ? 'onChange' : 'onSubmit'}
              onFinish={onFinish}
              onValuesChange={(changedValues: any) => {
                setIsDirty(true);
                resetCategoryOnModuleChange(form)(changedValues);
              }}
              onFinishFailed={({ errorFields }) => {
                setSubmitted(true);
                scrollToFirstError(form, errorFields);
              }}
            >
              <VideoDetailsFields />

              {/* Module & Category */}
              <VideoModuleCategoryField />

              {/* Thumbnail Upload */}
              <VideoThumbnailUpload
                thumbnail={upload.thumbnail}
                thumbnailPreview={upload.thumbnailPreview}
                existingThumbnailUrl={upload.existingThumbnailUrl}
                editMode={editMode}
                onFileChange={upload.handleThumbnailChange}
                onRemove={upload.removeThumbnail}
              />

              <div className="vc-divider" />

              {/* Upload Video */}
              <VideoFileUpload
                file={upload.file}
                existingVideoUrl={upload.existingVideoUrl}
                editMode={editMode}
                onFileChange={upload.handleFileChange}
                onRemove={upload.removeFile}
              />

              <div className="create-divider" />

              <VideoUploadStatusPanel
                uploadFailed={uploadFailed}
                uploadProgress={upload.uploadProgress}
                onRetry={handleRetry}
              />

              {/* Footer */}
              <CreateFormActions
                onPreview={() =>
                  upload.openPreview(
                    form.getFieldValue("title") || "",
                    form.getFieldValue("description") || ""
                  )
                }
                onCancel={handleCancel}
                loading={loading}
                submitLabel={editMode ? "Save Changes" : "Create"}
                wrapperClassName="create-footer"
                previewButtonClassName="create-btn-preview"
                cancelButtonClassName="create-btn-cancel"
                submitButtonClassName="create-btn-create"
              />

          </Form>
        )}
        </div>

        {/* UPLOAD IN PROGRESS MODAL */}
        <UploadInProgressModal
          open={uploadLeaveOpen}
          onStay={confirmStayUploading}
          onLeave={confirmUploadLeave}
        />

        {/* VIDEO PREVIEW MODAL */}
        <VideoPreviewModal
          open={upload.previewOpen}
          data={upload.previewData}
          onClose={upload.closePreview}
        />
    </CreateContentLayout>
  );
};

export default withAdminAuth(UploadVideo);