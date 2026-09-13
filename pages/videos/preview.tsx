import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button, Empty, Typography } from "antd";
import { PlayCircleOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/blog/PageHeader";
import { withAdminAuth } from "@/components/auth/with-admin-auth";
import PageLoading from "@/components/common/PageLoading";
import { getVideoById } from "@/services/videoService";
import { VIDEO_PREVIEW_STORAGE_KEY, ROUTE_PATHS } from "@/constants";
import { contentThumbnail } from "@/utils/media";
import type { VideoRecord } from "@/types/video";

const { Title, Paragraph, Text } = Typography;

interface PreviewSeed {
  id?: string;
  src?: string;
  title: string;
  description: string;
  thumbnail?: string;
}

// The preview page receives only a seed (id + display text) via session
// storage. The actual video URL is re-fetched from the backend so:
//  - only videos that are "ready" become playable (never a stale/failed URL),
//  - the source of truth for the URL stays the server, not session state.
const readSeed = (): PreviewSeed | null => {
  try {
    const raw = sessionStorage.getItem(VIDEO_PREVIEW_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PreviewSeed) : null;
  } catch {
    return null;
  }
};

const VideoPreview = () => {
  const router = useRouter();
  const [seed] = useState<PreviewSeed | null>(() =>
    typeof window === "undefined" ? null : readSeed()
  );

  const [record, setRecord] = useState<VideoRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const id = seed?.id;
    if (!id) return;
    let ignore = false;

    const loadVideo = async () => {
      setLoading(true);
      setError("");
      try {
        const video = await getVideoById(id);
        if (ignore) return;
        if (!video) {
          setError("Video not found.");
          return;
        }
        if (video.processingStatus && video.processingStatus !== "ready") {
          setError("This video is still processing and cannot be previewed yet.");
          return;
        }
        setRecord(video);
      } catch (e: any) {
        if (!ignore) setError(e.message || "Failed to load the video.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadVideo();
    return () => {
      ignore = true;
    };
  }, [seed?.id]);

  const title = record?.title || seed?.title || "";
  const description = record?.description || seed?.description || "";
  const src = record?.videoUrl || (record ? "" : seed?.src);
  const thumbnail = contentThumbnail(record?.thumbnailUrl || seed?.thumbnail);

  if (loading) {
    return <PageLoading />;
  }

  if (!seed || !src || error) {
    return (
      <AdminLayout>
        <div className="vp-page">
          <div className="vp-empty">
            <Empty
              image={
                <PlayCircleOutlined style={{ fontSize: 64, color: "#52c41a" }} />
              }
              description={
                <Text strong>{error || "No video selected."}</Text>
              }
            />
            <Button
              type="primary"
              onClick={() => router.push(ROUTE_PATHS.videos)}
              style={{ marginTop: 16 }}
            >
              Back to Videos
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
          backHref={ROUTE_PATHS.videos}
          title="Video preview"
          icon={<VideoCameraOutlined />}
          showBack={false}
        />

        <div className="vp-card">
          <video
            className="vp-player"
            controls
            autoPlay
            src={src}
            disablePictureInPicture
            controlsList="nodownload"
          />

          <div className="vp-info">
            <div className="vp-info-head">
              {thumbnail && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={thumbnail} alt={title} className="vp-thumb" />
              )}
              <div className="vp-info-text">
                {title && (
                  <Title level={4} className="vp-name">
                    {title}
                  </Title>
                )}
                <Paragraph className="vp-desc">
                  {description || "No description provided."}
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