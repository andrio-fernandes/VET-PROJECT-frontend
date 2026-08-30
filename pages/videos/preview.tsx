import React, { useState } from "react";
import { useRouter } from "next/router";
import { Button, Empty, Typography } from "antd";
import { ArrowLeftOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { VIDEO_PREVIEW_STORAGE_KEY } from "@/constants";

const { Title, Paragraph, Text } = Typography;

interface PreviewData {
  src: string;
  title: string;
  description: string;
}

const readPreview = (): PreviewData | null => {
  try {
    const raw = sessionStorage.getItem(VIDEO_PREVIEW_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PreviewData) : null;
  } catch {
    return null;
  }
};

export default function VideoPreview() {
  const router = useRouter();
  const [data] = useState<PreviewData | null>(() =>
    typeof window === "undefined" ? null : readPreview()
  );

  if (!data || !data.src) {
    return (
      <div className="video-preview-page">
        <div className="video-preview-empty">
          <Empty
            image={<PlayCircleOutlined style={{ fontSize: 64, color: "#52c41a" }} />}
            description={<Text strong>No video selected.</Text>}
          />
          <Button
            type="primary"
            onClick={() => router.push("/videos/create")}
            style={{ marginTop: 16 }}
          >
            Back to Create Video
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-preview-page">
      <div className="video-preview-header">
        <ArrowLeftOutlined
          className="video-preview-back"
          onClick={() => router.push("/videos/create")}
        />
        <Title level={3} className="video-preview-title">
          Video Preview
        </Title>
      </div>

      <div className="video-preview-card">
        <video
          className="video-preview-player"
          controls
          autoPlay
          src={data.src}
        />

        {data.title && (
          <div className="video-preview-info">
            <Title level={4} className="video-preview-name">
              {data.title}
            </Title>
            <Paragraph className="video-preview-desc">
              {data.description || "No description provided."}
            </Paragraph>
          </div>
        )}
      </div>
    </div>
  );
}
