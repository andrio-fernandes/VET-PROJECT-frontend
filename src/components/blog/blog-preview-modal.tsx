/* eslint-disable @next/next/no-img-element */
/* =============================================
   BLOG PREVIEW MODAL

   Preview dialog for the Create/Edit Blog form: renders the blog's title,
   description, module/category tags, thumbnail, rich content and attachments
   in an Ant Design Modal, matching the layout of the full-page blog preview.
   ============================================= */

import React from "react";
import { Button, Divider, Modal, Space, Tag, Typography } from "antd";
import { EyeOutlined, FileTextOutlined, PaperClipOutlined } from "@ant-design/icons";

import {
  buildDocumentViewerUrl,
  getAttachmentExtension,
  mediaUrl,
  parseBlogAttachments,
} from "@/utils/media";
import { hasVisibleText, sanitizeRichText } from "@/utils/rich-text";
import type { ParsedAttachment } from "@/types/blog";

const { Title, Text } = Typography;

export interface BlogPreviewData {
  title: string;
  description: string;
  module: string;
  category: string;
  content: string;
  thumbnail: string | null;
  attachments: string | { name: string; url: string }[];
}

interface BlogPreviewModalProps {
  open: boolean;
  data: BlogPreviewData | null;
  onClose: () => void;
}

const openAttachment = (att: ParsedAttachment) => {
  const ext = getAttachmentExtension(att.name);

  // PDFs: fetch into a blob so the browser's native PDF viewer handles it.
  if (ext === "pdf") {
    fetch(att.url)
      .then((res) => res.arrayBuffer())
      .then((buf) => {
        const blobUrl = URL.createObjectURL(
          new Blob([buf], { type: "application/pdf" })
        );
        window.open(blobUrl, "_blank");
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      })
      .catch(() => {
        window.open(att.url, "_blank");
      });
    return;
  }

  // Data URLs (draft preview): convert to blob URL so the browser can open
  // them without relying on external viewers.
  if (att.url.startsWith("data:")) {
    fetch(att.url)
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      })
      .catch(() => {
        window.open(att.url, "_blank");
      });
    return;
  }

  // Server-stored Office files: try the Microsoft Office Online Viewer first.
  // If the viewer cannot reach the URL (localhost, auth-required), the browser
  // will fall through to a download — fetch the file as a blob instead so it
  // opens directly.
  const viewerUrl = buildDocumentViewerUrl(att.name, att.url);
  if (viewerUrl) {
    fetch(att.url)
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.arrayBuffer();
      })
      .then((buf) => {
        const mimeMap: Record<string, string> = {
          doc: "application/msword",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          xls: "application/vnd.ms-excel",
          xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ppt: "application/vnd.ms-powerpoint",
          pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        };
        const mime = mimeMap[ext] || "application/octet-stream";
        const blobUrl = URL.createObjectURL(new Blob([buf], { type: mime }));
        window.open(blobUrl, "_blank");
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      })
      .catch(() => {
        // Fallback: let the browser handle the URL directly (may download).
        window.open(att.url, "_blank");
      });
    return;
  }

  // Everything else: open directly.
  window.open(att.url, "_blank");
};

export const BlogPreviewModal: React.FC<BlogPreviewModalProps> = ({
  open,
  data,
  onClose,
}) => {
  if (!data) return null;

  const attachmentUrls = (
    typeof data.attachments === "string"
      ? parseBlogAttachments(data.attachments)
      : (data.attachments ?? []).map((a) => ({ name: a.name, url: a.url }))
  ).map((a) => ({
    ...a,
    url: mediaUrl(a.url),
  }));
  const contentHtml = sanitizeRichText(data.content);

  return (
    <Modal
      open={open}
      title={
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileTextOutlined />
          Blog preview
        </span>
      }
      onCancel={onClose}
      centered
      width={860}
      footer={null}
      styles={{
        body: { maxHeight: "75vh", overflowY: "auto", padding: "24px 32px" },
        mask: {
          backdropFilter: "blur(6px)",
          backgroundColor: "rgba(0, 0, 0, 0.2)",
        },
      }}
    >
      <Title level={2} className="bp-title">
        {data.title || "Untitled"}
      </Title>

      <Text type="secondary" className="bp-description">
        {data.description || "No description provided."}
      </Text>

      {(data.module || data.category) && (
        <div className="bp-tags">
          <Space size="small" wrap>
            {data.module && <Tag color="green">{data.module}</Tag>}
            {data.category && <Tag color="green">{data.category}</Tag>}
          </Space>
        </div>
      )}

      {data.thumbnail && (
        <img
          src={mediaUrl(data.thumbnail)}
          alt={data.title || "Blog thumbnail"}
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
              className={`bp-attachment-item${
                idx < attachmentUrls.length - 1 ? "" : " bp-attachment-item-last"
              }`}
            >
              <PaperClipOutlined className="bp-attachment-icon" />
              <span className="bp-attachment-name">{att.name}</span>
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
    </Modal>
  );
};
