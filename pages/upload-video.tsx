import React, { useState } from "react";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Form, Input, Select, Upload, Button, message } from "antd";
import { ArrowLeftOutlined, PlayCircleOutlined } from "@ant-design/icons";

const MAX_SIZE = 64 * 1024 * 1024;

export default function UploadVideo() {
  const [file, setFile] = useState<File | null>(null);

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

  const submit = () => {
    if (!file) {
      message.error("Please upload a video.");
      return;
    }

    message.success("Video is ready to upload.");
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

          <div>
            <h1>Create New Video</h1>
            <p>Add new video to your list</p>
          </div>

          <PlayCircleOutlined className="video-icon" />
        </div>

        {/* Card */}
        <div className="video-card">

          <div className="video-card-title">
            Video Details
          </div>

          <Form layout="vertical" onFinish={submit}>

            {/* Title */}
            <Form.Item
              label="Title"
              name="title"
              rules={[
                {
                  required: true,
                  message: "Please enter video title.",
                },
              ]}
            >
              <Input
                placeholder="Enter video title"
                maxLength={100}
                showCount
              />
            </Form.Item>

            {/* Description */}
            <Form.Item
              label="Description"
              name="description"
              rules={[
                {
                  required: true,
                  message: "Please enter video description.",
                },
              ]}
            >
              <Input.TextArea
                placeholder="Describe your video"
                maxLength={200}
                showCount
                rows={5}
              />
            </Form.Item>

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
            <div className="upload-heading">
              <strong>Upload video</strong>
              <span />
            </div>

            <small className="upload-subtitle">
              Upload one video
            </small>

            <Upload.Dragger
              accept="video/*"
              beforeUpload={beforeUpload}
              showUploadList={false}
              className="video-upload"
            >
              {file ? (
                <div className="selected-video">
                  <span>{file.name}</span>

                  <Button
                    type="link"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Button>Upload</Button>
              )}
            </Upload.Dragger>

            <div className="upload-info">
              Maximum file 64MB | Supported format: MP4
            </div>

            {/* Footer */}
            <div className="video-footer">

              <Button
                disabled={!file}
                onClick={() => {
                  if (file) {
                    window.open(
                      URL.createObjectURL(file),
                      "_blank"
                    );
                  }
                }}
              >
                Preview
              </Button>

              <div className="footer-actions">
                <Button
                  danger
                  onClick={() => setFile(null)}
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