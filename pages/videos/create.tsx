/* eslint-disable @next/next/no-img-element */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { AdminLayout } from "@/layouts/AdminLayout";
import { withAdminAuth } from "@/components/auth/with-admin-auth";
import { createVideo, getVideoById, updateVideo, signVideoUpload, uploadFileToCloudinary, type UploadAbortHandle } from "@/services/videoService";
import { ROUTE_PATHS, MAX_VIDEO_SIZE, MAX_THUMBNAIL_SIZE, RETAINED_VIDEO_STORAGE_KEY, countWords } from "@/constants";
import { Form, Input, Upload, Button, Modal, Space, Spin, Progress, App as AntApp, Typography } from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import WordCount from "@/components/WordCount";
import ModuleCategorySelects from "@/components/ModuleCategorySelects";
import { mediaUrl, contentThumbnail } from "@/utils/media";

const { Title, Text, Paragraph } = Typography;

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
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [existingVideoUrl, setExistingVideoUrl] = useState<string>("");
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string>("");
  const [seeding, setSeeding] = useState(editMode);
  const [loading, setLoading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    src: string;
    title: string;
    description: string;
    thumbnail?: string;
  } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const cancelLeaveRef = useRef<(() => void) | null>(null);
  const pendingNavRef = useRef<string | null>(null);
  const skipNavConfirmRef = useRef(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const retainedDataRef = useRef<string | null>(null);
  // Progress reported by the direct-to-Cloudinary transfer (browser -> CDN).
  const [uploadProgress, setUploadProgress] = useState<{
    phase: "video" | "thumbnail";
    percent: number;
  } | null>(null);
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
  const abortRef = useRef<UploadAbortHandle | null>(null);
  const abortingRef = useRef(false);
  const [uploadLeaveOpen, setUploadLeaveOpen] = useState(false);

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

        if (video.videoUrl) {
          setExistingVideoUrl(mediaUrl(video.videoUrl));
        }
        if (video.thumbnailUrl) {
          setExistingThumbnailUrl(mediaUrl(video.thumbnailUrl));
        }
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

  const titleValue = Form.useWatch('title', form);
  const descriptionValue = Form.useWatch('description', form);

  const beforeUpload = (file: File) => {
    if (!file.type.startsWith("video/")) {
      message.error("Please select a video file.");
      return Upload.LIST_IGNORE;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      message.error("Video size must not exceed 64 MB.");
      return Upload.LIST_IGNORE;
    }

    setFile(file);
    setExistingVideoUrl("");
    setIsDirty(true);
    return false;
  };

  const beforeThumbnailUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      message.error("Please select an image file for the thumbnail.");
      return Upload.LIST_IGNORE;
    }

    if (file.size > MAX_THUMBNAIL_SIZE) {
      message.error("Thumbnail size must not exceed 5 MB.");
      return Upload.LIST_IGNORE;
    }

    setThumbnail(file);
    setExistingThumbnailUrl("");
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview(URL.createObjectURL(file));
    setIsDirty(true);
    return false;
  };

  // Uploads the selected file(s) directly to Cloudinary under a server-issued
  // signature, then returns the new public ids. A missing file is skipped, so
  // edit submissions can keep their existing media.
  const uploadSelectedMedia = async (): Promise<{
    publicId: string | undefined;
    thumbnailPublicId: string | undefined;
  }> => {
    abortRef.current = null;
    abortingRef.current = false;
    let publicId: string | undefined;
    if (file) {
      setUploadProgress({ phase: "video", percent: 0 });
      const signature = await signVideoUpload("video");
      const result = await uploadFileToCloudinary(
        file,
        signature,
        (percent) => setUploadProgress({ phase: "video", percent }),
        abortRef
      );
      publicId = result?.public_id as string | undefined;
      if (!publicId) throw new Error("Video upload did not return a public id.");
    }

    let thumbnailPublicId: string | undefined;
    if (thumbnail) {
      setUploadProgress({ phase: "thumbnail", percent: 0 });
      const signature = await signVideoUpload("thumbnail");
      const result = await uploadFileToCloudinary(
        thumbnail,
        signature,
        (percent) => setUploadProgress({ phase: "thumbnail", percent }),
        abortRef
      );
      thumbnailPublicId = result?.public_id as string | undefined;
      if (!thumbnailPublicId)
        throw new Error("Thumbnail upload did not return a public id.");
    }

    setUploadProgress(null);
    return { publicId, thumbnailPublicId };
  };

  const onFinish = async (values: any) => {
    if (editMode) {
      setLoading(true);
      setUploadFailed(null);
      try {
        // Upload replacement media (if any) directly to Cloudinary.
        const media = await uploadSelectedMedia();
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

    if (!file) {
      message.error("Please upload a video.");
      return;
    }

    setLoading(true);
    setUploadFailed(null);

    try {
      // 1) Push the bytes to Cloudinary from the browser (server never buffers
      //    the video), then 2) persist metadata + the resulting ids. No
      //    background step: the record is created "ready" once this returns.
      const media = await uploadSelectedMedia();
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
      setFile(null);
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
      setThumbnail(null);
      setThumbnailPreview("");
      // Navigate only after the loading flag clears so the route guard does
      // not treat the finished upload as "in progress".
      setLoading(false);
      skipNavConfirmRef.current = true;
      router.push(ROUTE_PATHS.adminDashboard);
    } catch (error: any) {
      if (mountedRef.current && !abortingRef.current) {
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

  const preview = () => {
    const src = file ? URL.createObjectURL(file) : existingVideoUrl;
    if (!src) {
      message.warning("Please select a video to preview.");
      return;
    }

    const values = form.getFieldsValue();
    setPreviewData({
      src,
      title: values.title || "",
      description: values.description || "",
      thumbnail: file ? thumbnailPreview : existingThumbnailUrl,
    });
    setPreviewOpen(true);
  };

  const closePreview = () => {
    if (file && previewData?.src) {
      URL.revokeObjectURL(previewData.src);
    }
    setPreviewOpen(false);
    setPreviewData(null);
  };

  const removeFile = () => {
    setFile(null);
    setIsDirty(true);
  };

  const removeThumbnail = () => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnail(null);
    setThumbnailPreview("");
    setIsDirty(true);
  };

  const openCancelConfirm = useCallback((onLeave: () => void) => {
    cancelLeaveRef.current = onLeave;
    setCancelOpen(true);
  }, []);

  const closeCancelConfirm = () => {
    cancelLeaveRef.current = null;
    setCancelOpen(false);
  };

  const handleCancel = () => {
    if (loading) {
      setUploadLeaveOpen(true);
      return;
    }
    if (editMode) {
      skipNavConfirmRef.current = true;
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
        Boolean(file) ||
        Boolean(thumbnail);

      if (!hasChanges) {
        router.push(ROUTE_PATHS.videos);
        return;
      }
      openCancelConfirm(() => {
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
      Boolean(file) ||
      Boolean(thumbnail) ||
      Boolean(editMode && existingVideoUrl) ||
      Boolean(editMode && existingThumbnailUrl);

    if (!hasContent) {
      router.push(editMode ? ROUTE_PATHS.videos : ROUTE_PATHS.adminDashboard);
      return;
    }
    openCancelConfirm(() => {
      router.push(editMode ? ROUTE_PATHS.videos : ROUTE_PATHS.adminDashboard);
    });
  };

  const confirmLeave = () => {
    const onLeave = cancelLeaveRef.current;
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
    setCancelOpen(false);
    cancelLeaveRef.current = null;
    pendingNavRef.current = null;
    setIsDirty(false);
    if (onLeave) onLeave();
  };

  const confirmDiscard = () => {
    setCancelOpen(false);
    cancelLeaveRef.current = null;
    pendingNavRef.current = null;
    setIsDirty(false);
    router.push(editMode ? ROUTE_PATHS.videos : ROUTE_PATHS.adminDashboard);
  };

  const confirmUploadLeave = () => {
    const url =
      pendingNavRef.current ||
      (editMode ? ROUTE_PATHS.videos : ROUTE_PATHS.adminDashboard);
    abortingRef.current = true;
    abortRef.current?.abort();
    skipNavConfirmRef.current = true;
    setIsDirty(false);
    setUploadLeaveOpen(false);
    pendingNavRef.current = null;
    router.push(url);
  };

  const confirmStayUploading = () => {
    pendingNavRef.current = null;
    setUploadLeaveOpen(false);
  };

  const confirmRestoreDraft = () => {
    if (retainedDataRef.current) {
      const parsed = JSON.parse(retainedDataRef.current);
      form.setFieldsValue({
        title: parsed.title,
        description: parsed.description,
        module: parsed.module,
        category: parsed.category,
      });
      retainedDataRef.current = null;
      setIsDirty(true);
      message.info("Restored your previous unsaved progress.");
    }
    setRestoreOpen(false);
  };

  const confirmDiscardDraft = () => {
    localStorage.removeItem(RETAINED_VIDEO_STORAGE_KEY);
    retainedDataRef.current = null;
    setIsDirty(false);
    setRestoreOpen(false);
  };

  useEffect(() => {
    if (editMode) return;
    const retainedData = localStorage.getItem(RETAINED_VIDEO_STORAGE_KEY);
    if (!retainedData) return;
    // Defer into a microtask so the setState is not called synchronously
    // within the effect body (avoids the React Compiler rule).
    queueMicrotask(() => {
      retainedDataRef.current = retainedData;
      setRestoreOpen(true);
    });
  }, [form, message, editMode]);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (editMode) return;
      if (skipNavConfirmRef.current) return;
      if (loading) {
        pendingNavRef.current = url;
        setUploadLeaveOpen(true);
        router.events.emit('routeChangeError');
        throw 'Navigation cancelled';
      }
      if (!isDirty) return;
      pendingNavRef.current = url;
      openCancelConfirm(() => {
        pendingNavRef.current = null;
        router.push(url);
      });
      router.events.emit('routeChangeError');
      throw 'Navigation cancelled';
    };
    const handleRouteChangeError = (err: any) => {
      if (err !== 'Navigation cancelled') throw err;
    };
    const handleRouteChangeComplete = () => {
      skipNavConfirmRef.current = false;
    };
    router.events.on('routeChangeStart', handleRouteChange);
    router.events.on('routeChangeError', handleRouteChangeError);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      router.events.off('routeChangeError', handleRouteChangeError);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [isDirty, router, openCancelConfirm, editMode, loading]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (editMode) return;
      if (loading) {
        e.preventDefault();
        e.returnValue = '';
        return;
      }
      if (!isDirty) return;
      // Flush the current values so a refresh / tab close preserves the draft
      // exactly like the save-on-leave flow (confirmLeave).
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
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, editMode, form, loading]);

  return (
    <AdminLayout>
      <div className="vc-page">
        <div className="vc-inner">

          {/* Header Section */}
          <div className="vc-header">
            <div className="vc-header-body">
              <Title level={3} className="vc-header-title">
                {editMode ? "Edit Video" : "Create New Video"}
              </Title>
            </div>
          </div>

          {/* Main Form Card */}
          <div className="vc-card">
            <Title level={5} className="vc-card-title">Video Details</Title>

            {seeding ? (
              <div className="vc-loading">
                <Spin size="large" />
              </div>
            ) : (
            <Form
              form={form}
              layout="vertical"
              validateTrigger={submitted ? 'onChange' : 'onSubmit'}
              onFinish={onFinish}
              onValuesChange={(changedValues: any) => {
                setIsDirty(true);
                if ('module' in changedValues) {
                  form.setFieldsValue({ category: undefined });
                }
              }}
              onFinishFailed={({ errorFields }) => {
                setSubmitted(true);
                if (errorFields && errorFields.length) {
                  form.scrollToField(errorFields[0].name, { behavior: 'smooth', block: 'center' });
                }
              }}
            >

            {/* Title */}
            <Form.Item
              label={<span className="vc-label">Title</span>}
              name="title"
              required
              rules={[
                {
                  required: true,
                  message: "Please enter video title.",
                },
                {
                  validator: (_, value) => {
                    const words = countWords(value);
                    if (words < 5)
                      return Promise.reject(
                        new Error("Title must contain at least 5 words.")
                      );
                    if (words > 30)
                      return Promise.reject(
                        new Error("Title must not exceed 30 words.")
                      );
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder="Enter video title"
                size="large"
                className="vc-input"
              />
            </Form.Item>

            <WordCount value={titleValue} max={30} />

            {/* Description */}
            <Form.Item
              label={<span className="vc-label">Description</span>}
              name="description"
              required
              rules={[
                {
                  required: true,
                  message: "Please enter video description.",
                },
                {
                  validator: (_, value) => {
                    const words = countWords(value);
                    if (words < 10)
                      return Promise.reject(
                        new Error("Description must contain at least 10 words.")
                      );
                    if (words > 60)
                      return Promise.reject(
                        new Error("Description must not exceed 60 words.")
                      );
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input.TextArea
                placeholder="Describe your video"
                rows={4}
                size="large"
                className="vc-textarea"
              />
            </Form.Item>

            <WordCount value={descriptionValue} max={60} />

            {/* Module & Category */}
              <div className="vc-select-block">
                <div className="vc-section-label">
                  Select the module and categories
                  <span className="vc-required">*</span>
                </div>
                <div className="vc-hint">
                  Select the module and category where your video should be placed
                </div>
                <ModuleCategorySelects
                  showFieldLabels
                  moduleItemClassName="vc-select-item"
                  moduleSelectClassName="vc-select"
                  categoryItemClassName="vc-select-item"
                  categorySelectClassName="vc-select"
                  moduleRequiredMessage="Please select module."
                  categoryRequiredMessage="Please select category."
                />
              </div>

            {/* Thumbnail Upload */}
            <Form.Item
              label={<span className="vc-label">Upload Thumbnail</span>}
              className="vc-thumb-block"
            >
              <div className="vc-hint">
                Choose a visual cover for your video (16:9). Optional — a default
                thumbnail is used if you skip this.
              </div>

              <Upload.Dragger
                accept="image/*"
                beforeUpload={beforeThumbnailUpload}
                showUploadList={false}
                multiple={false}
                className="thumbnail-upload"
              >
                {thumbnail ? (
                  <div className="selected-thumbnail">
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="thumbnail-preview"
                    />
                    <span className="thumbnail-name">{thumbnail.name}</span>

                    <Button
                      danger
                      type="link"
                      icon={<DeleteOutlined />}
                      className="thumbnail-remove-btn remove-file-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeThumbnail();
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : editMode && existingThumbnailUrl ? (
                  <div className="selected-thumbnail">
                    <img
                      src={contentThumbnail(existingThumbnailUrl)}
                      alt="Current thumbnail"
                      className="thumbnail-preview"
                    />
                    <span className="thumbnail-name">Current thumbnail</span>
                    <span className="thumbnail-replace-hint">Click to replace</span>
                  </div>
                ) : editMode ? (
                  <div className="selected-thumbnail">
                    <img
                      src={contentThumbnail()}
                      alt="Default thumbnail"
                      className="thumbnail-preview"
                    />
                    <span className="thumbnail-name">Default thumbnail</span>
                    <span className="thumbnail-replace-hint">Click to replace</span>
                  </div>
                ) : (
                  <Button
                    icon={<UploadOutlined />}
                    className="upload-button"
                  >
                    Upload Thumbnail
                  </Button>
                )}
              </Upload.Dragger>

              <div className="upload-info">
                Maximum file 5MB | Supported format: JPG, PNG
              </div>
            </Form.Item>

            <div className="vc-divider" />

            {/* Upload Video */}
            <Form.Item
              label={<span className="vc-label">Upload Video</span>}
              required
              className="upload-section"
            >
              <div className="vc-hint">
                Upload one video
              </div>

              <Upload.Dragger
                accept="video/mp4,video/*"
                beforeUpload={beforeUpload}
                showUploadList={false}
                multiple={false}
                className="video-upload"
              >
                <div className="vc-drop-inner">
                  {file ? (
                    <>
                      <span className="vc-file-name">{file.name}</span>
                      <Button
                        danger
                        type="link"
                        icon={<DeleteOutlined />}
                        className="remove-file-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                      >
                        Remove
                      </Button>
                    </>
                  ) : editMode && existingVideoUrl ? (
                    <>
                      <span className="vc-file-name">Current video</span>
                      <Button
                        type="link"
                        className="vc-file-preview-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(existingVideoUrl, "_blank");
                        }}
                      >
                        Preview
                      </Button>
                      <span className="vc-file-replace-hint">Click to replace</span>
                    </>
                  ) : (
                    <Button
                      icon={<UploadOutlined />}
                      className="upload-button"
                    >
                      Upload Video
                    </Button>
                  )}
                </div>
              </Upload.Dragger>

              <div className="upload-info">
                Maximum file 64MB | Supported format: MP4
              </div>
            </Form.Item>

            <div className="vc-divider-wide" />

            {uploadFailed && (
              <div className="vc-upload-failed">
                <Text type="danger">Upload failed: {uploadFailed}</Text>
                <Button
                  danger
                  size="small"
                  className="vc-retry-btn"
                  onClick={handleRetry}
                >
                  Retry
                </Button>
              </div>
            )}

            {uploadProgress && !uploadFailed && (
              <div className="vc-upload-status">
                <Progress
                  percent={uploadProgress.percent}
                  size="small"
                  status="active"
                  style={{ width: 240 }}
                />
                <Text className="vc-upload-label">
                  {uploadProgress.phase === "thumbnail"
                    ? "Uploading thumbnail..."
                    : "Uploading video..."}
                </Text>
              </div>
            )}

            {/* Footer */}
            <div className="vc-footer">

              <Button
                size="large"
                htmlType="button"
                onClick={preview}
                className="vc-btn-preview"
              >
                Preview
              </Button>

              <Space size="middle">
                <Button size="large" onClick={handleCancel} className="vc-btn-cancel">
                  Cancel
                </Button>

                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  disabled={loading}
                  loading={loading}
                  className="vc-btn-create"
                >
                  {editMode ? "Save Changes" : "Create"}
                </Button>
              </Space>

            </div>

          </Form>
        )}
        </div>

        </div>
      </div>

      <Modal
        open={cancelOpen}
        title="You have unsaved changes"
        onCancel={closeCancelConfirm}
        closable
        maskClosable
        footer={
          <Space>
            <Button onClick={confirmDiscard}>No, Don&apos;t Save</Button>
            <Button type="primary" onClick={confirmLeave}>
              Yes, Save
            </Button>
          </Space>
        }
      >
        <p>Do you want to save your changes before leaving?</p>
      </Modal>

      {/* RESTORE PREVIOUS DRAFT MODAL */}
      <Modal
        open={restoreOpen}
        title="Restore previous draft?"
        onCancel={confirmDiscardDraft}
        closable
        maskClosable
        footer={
          <Space>
            <Button onClick={confirmDiscardDraft}>No, Start Fresh</Button>
            <Button type="primary" onClick={confirmRestoreDraft}>
              Yes, Restore
            </Button>
          </Space>
        }
      > 
        <p>You have a previously unsaved video draft. Would you like to restore it?</p>
      </Modal>

      {/* UPLOAD IN PROGRESS MODAL */}
      <Modal
        open={uploadLeaveOpen}
        title="Upload in progress"
        onCancel={confirmStayUploading}
        closable
        maskClosable={false}
        footer={
          <Space>
            <Button type="primary" onClick={confirmStayUploading}>
              Keep Uploading
            </Button>
            <Button danger onClick={confirmUploadLeave}>
              Leave Anyway
            </Button>
          </Space>
        }
      >
        <p>
          Your video is still uploading. If you leave now, the video will not
          be created. Do you want to keep uploading?
        </p>
      </Modal>

      {/* VIDEO PREVIEW MODAL */}
      <Modal
        open={previewOpen}
        title="Video preview"
        onCancel={closePreview}
        centered
        width={860}
        footer={null}
        maskStyle={{
          backdropFilter: 'blur(6px)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        {previewOpen && previewData && previewData.src && (
          <div className="vc-preview-modal">
            <video
              className="vc-preview-video"
              controls
              autoPlay
              src={previewData.src}
            />
            {(previewData.title || previewData.description || previewData.thumbnail) && (
              <div className="vc-preview-info">
                <div className="vc-preview-info-head">
                  {previewData.thumbnail && (
                    <img
                      src={previewData.thumbnail}
                      alt={previewData.title}
                      className="vc-preview-thumb"
                    />
                  )}
                  <div className="vc-preview-info-text">
                    {previewData.title && (
                      <Title level={4} className="vc-preview-name">
                        {previewData.title}
                      </Title>
                    )}
                    <Paragraph className="vc-preview-desc">
                      {previewData.description || "No description provided."}
                    </Paragraph>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
};

export default withAdminAuth(UploadVideo);
