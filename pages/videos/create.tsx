/* eslint-disable @next/next/no-img-element */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { withAdminAuth } from "@/components/auth/with-admin-auth";
import { API_ENDPOINTS, CONTENT_MODULES, MODULE_CATEGORIES, ROUTE_PATHS, type ContentModule, type ContentCategory } from "@/utils/constant";
import { TOKEN_KEY } from "@/utils/constant";
import { Form, Input, Select, Upload, Button, Modal, Space, App as AntApp, Typography, Row, Col } from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const MAX_SIZE = 64 * 1024 * 1024;
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024;

const countWords = (value = "") =>
  value.trim() ? value.trim().split(/\s+/).length : 0;

const UploadVideo = () => {
  const { message } = AntApp.useApp();
  const router = useRouter();
  const [form] = Form.useForm();
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [titleWords, setTitleWords] = useState(0);
  const [descriptionWords, setDescriptionWords] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const cancelLeaveRef = useRef<(() => void) | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const retainedDataRef = useRef<string | null>(null);

  const selectedModule = Form.useWatch('module', form);

  const beforeUpload = (file: File) => {
    if (!file.type.startsWith("video/")) {
      message.error("Please select a video file.");
      return Upload.LIST_IGNORE;
    }

    if (file.size > MAX_SIZE) {
      message.error("Video size must not exceed 64 MB.");
      return Upload.LIST_IGNORE;
    }

    setFile(file);
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
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview(URL.createObjectURL(file));
    return false;
  };

  const onFinish = async (values: any) => {
    if (!file) {
      message.error("Please upload a video.");
      return;
    }

    if (!thumbnail) {
      message.error("Please upload a thumbnail image.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("description", values.description);
      formData.append("module", values.module);
      formData.append("category", values.category);
      formData.append("video", file);
      formData.append("thumbnail", thumbnail);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(TOKEN_KEY)
          : null;

      const response = await fetch(`${API_URL}${API_ENDPOINTS.createVideo}`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to upload video");
      }

      message.success("Video uploaded successfully!");
      localStorage.removeItem("retained_video_progress");
      form.resetFields();
      setFile(null);
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
      setThumbnail(null);
      setThumbnailPreview("");
      setTitleWords(0);
      setDescriptionWords(0);
    } catch (error: any) {
      message.error(error.message || "Failed to upload video");
    } finally {
      setLoading(false);
    }
  };

  const preview = () => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    const win = window.open(url, "_blank");
    if (win) {
      win.onload = () => {
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      };
    } else {
      URL.revokeObjectURL(url);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  const removeThumbnail = () => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnail(null);
    setThumbnailPreview("");
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
    const values = form.getFieldsValue();
    const hasContent =
      Boolean(values.title?.trim()) ||
      Boolean(values.description?.trim()) ||
      Boolean(values.module) ||
      Boolean(values.category) ||
      Boolean(file) ||
      Boolean(thumbnail);

    if (!hasContent) {
      router.push(ROUTE_PATHS.adminDashboard);
      return;
    }
    openCancelConfirm(() => {
      router.back();
    });
  };

  const confirmLeave = () => {
    const onLeave = cancelLeaveRef.current;
    const values = form.getFieldsValue();
    localStorage.setItem(
      "retained_video_progress",
      JSON.stringify({
        title: values.title,
        description: values.description,
        module: values.module,
        category: values.category,
      })
    );
    message.info("Progress saved.");
    setCancelOpen(false);
    cancelLeaveRef.current = null;
    if (onLeave) onLeave();
  };

  const confirmDiscard = () => {
    setCancelOpen(false);
    cancelLeaveRef.current = null;
    router.push(ROUTE_PATHS.adminDashboard);
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
      setTitleWords(countWords(parsed.title || ""));
      setDescriptionWords(countWords(parsed.description || ""));
      retainedDataRef.current = null;
      message.info("Restored your previous unsaved progress.");
    }
    setRestoreOpen(false);
  };

  const confirmDiscardDraft = () => {
    localStorage.removeItem("retained_video_progress");
    retainedDataRef.current = null;
    setRestoreOpen(false);
  };

  useEffect(() => {
    const retainedData = localStorage.getItem("retained_video_progress");
    if (retainedData) {
      retainedDataRef.current = retainedData;
      setRestoreOpen(true);
    }
  }, [form, message]);

  return (
    <AdminLayout>
      <div style={{ padding: '32px', backgroundColor: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ width: '100%' }}>

          {/* Header Section */}
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Title level={3} style={{ margin: 0, fontWeight: 600, color: '#262626' }}>
                Create New Video
              </Title>
            </div>
          </div>

          {/* Main Form Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px', border: '1px solid #e8e8e8' }}>
            <Title level={5} style={{ margin: '0 0 24px 0' }}>Video Details</Title>

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              onValuesChange={(changedValues: any) => {
                if ('module' in changedValues) {
                  form.setFieldsValue({ category: undefined });
                }
              }}
              onFinishFailed={({ errorFields }) => {
                if (errorFields && errorFields.length) {
                  form.scrollToField(errorFields[0].name, { behavior: 'smooth', block: 'center' });
                }
              }}
              requiredMark={(label, { required }) =>
                required ? (
                  <span>
                    {label}
                    <span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span>
                  </span>
                ) : (
                  label
                )
              }
            >

            {/* Title */}
            <Form.Item
              label={<span style={{ fontWeight: 600 }}>Title</span>}
              name="title"
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
                style={{ borderRadius: '6px' }}
                onChange={(e) =>
                  setTitleWords(countWords(e.target.value))
                }
              />
            </Form.Item>

            <div className="word-counter">
              {titleWords}/30
            </div>

            {/* Description */}
            <Form.Item
              label={<span style={{ fontWeight: 600 }}>Description</span>}
              name="description"
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
                rows={5}
                size="large"
                style={{ borderRadius: '6px', resize: 'none' }}
                onChange={(e) =>
                  setDescriptionWords(
                    countWords(e.target.value)
                  )
                }
              />
            </Form.Item>

            <div className="word-counter">
              {descriptionWords}/60
            </div>

            {/* Category */}
              <Form.Item
                label={<span style={{ fontWeight: 600 }}>Select the module and categories</span>}
                required
                style={{ marginBottom: '24px' }}
              >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="module"
                    rules={[
                      {
                        required: true,
                        message: "Please select module.",
                      },
                    ]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      placeholder="Select Module"
                      size="large"
                      allowClear
                      style={{ borderRadius: '6px' }}
                      options={CONTENT_MODULES.map((m) => ({
                        value: m,
                        label: m,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="category"
                    rules={[
                      {
                        required: true,
                        message: "Please select category.",
                      },
                    ]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      placeholder={selectedModule ? 'Select Category' : 'Select a module first'}
                      size="large"
                      disabled={!selectedModule}
                      style={{ borderRadius: '6px' }}
                      options={(selectedModule ? (MODULE_CATEGORIES[selectedModule as ContentModule] ?? []) : []).map((c: ContentCategory) => ({
                        value: c,
                        label: c,
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form.Item>

            {/* Thumbnail Upload */}
            <Form.Item
              label={<span style={{ fontWeight: 600 }}>Upload Thumbnail</span>}
              required
              style={{ marginBottom: '8px' }}
            >
              <div style={{ display: 'block', margin: '4px 0 10px', color: '#8c8c8c', fontSize: '13px' }}>
                Choose a visual cover for your video (16:9)
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

            <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '24px 0' }} />

            {/* Upload Video */}
            <Form.Item
              label={<span style={{ fontWeight: 600 }}>Upload Video</span>}
              required
              className="upload-section"
            >
              <div style={{ display: 'block', margin: '4px 0 10px', color: '#8c8c8c', fontSize: '13px' }}>
                Upload one video
              </div>

              <Upload.Dragger
                accept="video/mp4,video/*"
                beforeUpload={beforeUpload}
                showUploadList={false}
                multiple={false}
                className="video-upload"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '100%', minHeight: '121px' }}>
                  {file ? (
                    <>
                      <span style={{ maxWidth: 430, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>{file.name}</span>
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

            <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '32px 0 24px 0' }} />

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

              <Button
                size="large"
                disabled={!file}
                onClick={preview}
                style={{ borderColor: '#52c41a', color: '#52c41a', borderRadius: '6px', padding: '0 32px' }}
              >
                Preview
              </Button>

              <Space size="middle">
                <Button size="large" onClick={handleCancel} style={{ borderColor: '#ff4d4f', color: '#ff4d4f', borderRadius: '6px', padding: '0 24px' }}>
                  Cancel
                </Button>

                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={loading}
                  style={{ backgroundColor: '#52c41a', borderRadius: '6px', padding: '0 32px' }}
                >
                  Create
                </Button>
              </Space>

            </div>

          </Form>
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
    </AdminLayout>
  );
};

export default withAdminAuth(UploadVideo);
