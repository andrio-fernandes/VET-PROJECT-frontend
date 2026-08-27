import React, { useState } from "react";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { withAdminAuth } from "@/components/auth/with-admin-auth";
import { API_ENDPOINTS, CONTENT_MODULES, CONTENT_CATEGORIES } from "@/utils/constant";
import { TOKEN_KEY } from "@/utils/constant";
import { Form, Input, Select, Upload, Button, App as AntApp } from "antd";
import {
  ArrowLeftOutlined,
  UploadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const MAX_SIZE = 64 * 1024 * 1024;

const countWords = (value = "") =>
  value.trim() ? value.trim().split(/\s+/).length : 0;

const UploadVideo = () => {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [titleWords, setTitleWords] = useState(0);
  const [descriptionWords, setDescriptionWords] = useState(0);

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

  const onFinish = async (values: any) => {
    if (!file) {
      message.error("Please upload a video.");
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
      form.resetFields();
      setFile(null);
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
    window.open(url, "_blank");
    URL.revokeObjectURL(url);
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <AdminLayout>
      <div className="video-page">

        {/* Header */}
        <div className="video-header">
          <ArrowLeftOutlined
            className="video-back"
            onClick={() => window.history.back()}
          />

          <div className="video-header-text">
            <h1>Create New Video</h1>
            <p>Add new video to your list</p>
          </div>
        </div>

        {/* Card */}
        <div className="video-card">

          <div className="video-card-title">
            Video Details
          </div>

          <Form form={form} layout="vertical" onFinish={onFinish}>

            {/* Title */}
            <Form.Item
              label={
                <span>
                  Title <span className="required-star">*</span>
                </span>
              }
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
                    if (words > 100)
                      return Promise.reject(
                        new Error("Title must not exceed 100 words.")
                      );
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder="Enter video title"
                onChange={(e) =>
                  setTitleWords(countWords(e.target.value))
                }
              />
            </Form.Item>

            <div className="word-counter">
              {titleWords}/100
            </div>

            {/* Description */}
            <Form.Item
              label={
                <span>
                  Description{" "}
                  <span className="required-star">*</span>
                </span>
              }
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
                    if (words > 200)
                      return Promise.reject(
                        new Error("Description must not exceed 200 words.")
                      );
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input.TextArea
                placeholder="Describe your video"
                rows={5}
                onChange={(e) =>
                  setDescriptionWords(
                    countWords(e.target.value)
                  )
                }
              />
            </Form.Item>

            <div className="word-counter">
              {descriptionWords}/200
            </div>

            {/* Category */}
            <div className="category-heading">
              <strong>
                Select the module and categories
                <span>*</span>
              </strong>

              <small>
                Select the module your video should be placed
              </small>
            </div>

            <div className="video-selects">

              <Form.Item
                name="module"
                rules={[
                  {
                    required: true,
                    message: "Please select module.",
                  },
                ]}
              >
                <Select
                  placeholder="Module"
                  options={CONTENT_MODULES.map((m) => ({
                    value: m,
                    label: m.charAt(0).toUpperCase() + m.slice(1),
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="category"
                rules={[
                  {
                    required: true,
                    message: "Please select category.",
                  },
                ]}
              >
                <Select
                  placeholder="Category"
                  options={CONTENT_CATEGORIES.map((c) => ({
                    value: c,
                    label: c
                      .split("-")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" "),
                  }))}
                />
              </Form.Item>

            </div>

            {/* Upload */}
            <div className="upload-section">

              <div className="upload-heading">
                <strong>Upload video</strong>
                <span />
              </div>

              <div className="upload-subtitle">
                Upload one video
              </div>

              <Upload.Dragger
                accept="video/mp4,video/*"
                beforeUpload={beforeUpload}
                showUploadList={false}
                multiple={false}
                className="video-upload"
              >
                {file ? (
                  <div className="selected-video">
                    <span>{file.name}</span>

                    <Button
                      type="link"
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
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
                    Upload
                  </Button>
                )}
              </Upload.Dragger>

              <div className="upload-info">
                Maximum file 64MB | Supported format: MP4
              </div>

            </div>

            {/* Footer */}
            <div className="video-footer">

              <Button
                className="preview-button"
                disabled={!file}
                onClick={preview}
              >
                Preview
              </Button>

              <div className="footer-actions">
                <Button
                  danger
                  onClick={removeFile}
                >
                  Cancel
                </Button>

                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                >
                  Create
                </Button>
              </div>

            </div>

          </Form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default withAdminAuth(UploadVideo);
