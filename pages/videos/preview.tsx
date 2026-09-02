import React, { useState } from "react";
import { useRouter } from "next/router";
import { Button, Empty, Typography } from "antd";
import { PlayCircleOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/blog/PageHeader";
import { withAdminAuth } from "@/components/auth/with-admin-auth";
import { VIDEO_PREVIEW_STORAGE_KEY, ROUTE_PATHS } from "@/constants";

const { Title, Paragraph, Text } = Typography;

interface PreviewData {
  src: string;
  title: string;
  description: string;
  thumbnail?: string;
}

const readPreview = (): PreviewData | null => {
  try {
    const raw = sessionStorage.getItem(VIDEO_PREVIEW_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PreviewData) : null;
  } catch {
    return null;
  }
};

const VideoPreview = () => {
  const router = useRouter();
  const [data] = useState<PreviewData | null>(() =>
    typeof window === "undefined" ? null : readPreview()
  );

  if (!data || !data.src) {
    return (
      <AdminLayout>
        <div className="vp-page">
          <div className="vp-empty">
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
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="vp-page">
        <PageHeader
          backHref={ROUTE_PATHS.createVideo}
          title="Video preview"
          icon={<VideoCameraOutlined />}
          showBack={false}
        />

        <div className="vp-card">
          <video
            className="vp-player"
            controls
            autoPlay
            src={data.src}
          />

          <div className="vp-info">
            <div className="vp-info-head">
              {data.thumbnail && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={data.thumbnail} alt={data.title} className="vp-thumb" />
              )}
              <div className="vp-info-text">
                {data.title && (
                  <Title level={4} className="vp-name">
                    {data.title}
                  </Title>
                )}
                <Paragraph className="vp-desc">
                  {data.description || "No description provided."}
                </Paragraph>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default withAdminAuth(VideoPreview);
