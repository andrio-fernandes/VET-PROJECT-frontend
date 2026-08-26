import React, { useState } from "react";
import { AdminLayout } from "@/components/layouts/admin-layout";
import {
  Form,
  Input,
  Select,
  Upload,
  Button,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  UploadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

const MAX_SIZE = 64 * 1024 * 1024;

const countWords = (value = "") =>
  value.trim() ? value.trim().split(/\s+/).length : 0;

export default function UploadVideo() {
  const [file, setFile] = useState<File | null>(null);
  const [titleWords, setTitleWords] = useState(0);
  const [descriptionWords, setDescriptionWords] = useState(0);

  const beforeUpload = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("video/")) {
      message.error("Please select a video file.");
      return Upload.LIST_IGNORE;
    }

    if (selectedFile.size > MAX_SIZE) {
      message.error("Video size must not exceed 64 MB.");
      return Upload.LIST_IGNORE;
    }

    setFile(selectedFile);
    return false;
  };

  const submit = () => {
    if (!file) {
      message.error("Please upload a video.");
      return;
    }

    message.success("Video is ready to upload.");
  };

  const preview = () => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
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

          <div className="video-header-icon">
            <PlayCircleOutlined />
          </div>
        </div>

        {/* Video Details */}
        <div className="video-card">

          <div className="video-card-title">
            Video Details
          </div>

          <Form layout="vertical" onFinish={submit}>

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
                  validator: (_, value) =>
                    countWords(value) <= 100
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error(
                            "Title must not exceed 100 words."
                          )
                        ),
                },
              ]}
            >
              <Input
                placeholder="Enter video title"
                onChange={(e) =>
                  setTitleWords(countWords(e.target.value))
                }
              />

              <div className="word-counter">
                {titleWords}/100
              </div>
            </Form.Item>

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
                  validator: (_, value) =>
                    countWords(value) <= 200
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error(
                            "Description must not exceed 200 words."
                          )
                        ),
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

              <div className="word-counter">
                {descriptionWords}/200
              </div>
            </Form.Item>

            {/* Module / Feature */}
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
                  size="large"
                  placeholder="Module"
                  options={[
                    {
                      label: "Sales",
                      value: "Sales",
                    },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="feature"
                rules={[
                  {
                    required: true,
                    message: "Please select feature.",
                  },
                ]}
              >
                <Select
                  size="large"
                  placeholder="Feature"
                  options={[
                    {
                      label: "Inquiry",
                      value: "Inquiry",
                    },
                    {
                      label: "Quotation",
                      value: "Quotation",
                    },
                    {
                      label: "Customer Order",
                      value: "Customer Order",
                    },
                  ]}
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

                    <span className="selected-video-name">
                      {file.name}
                    </span>

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
                >
                  Upload
                </Button>

              </div>

            </div>

          </Form>
        </div>
      </div>
    </AdminLayout>
  );
}