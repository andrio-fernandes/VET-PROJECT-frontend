import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Button, Empty, Spin, Typography } from 'antd';
import { PlayCircleOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { UserLayout } from '@/layouts/UserLayout';
import { PageHeader } from '@/components/blog/PageHeader';
import { withAuth } from '@/components/auth/with-auth';
import {
  getLibraryVideoById,
  getWatchProgress,
  saveWatchProgress,
} from '@/services/libraryService';
import { VIDEO_PREVIEW_STORAGE_KEY, ROUTE_PATHS } from '@/constants';
import { contentThumbnail } from '@/utils/media';
import type { VideoRecord } from '@/types/video';

const { Title, Paragraph, Text } = Typography;

interface PreviewSeed {
  id?: string;
  src?: string;
  title: string;
  description: string;
  thumbnail?: string;
}

const readSeed = (): PreviewSeed | null => {
  try {
    const raw = sessionStorage.getItem(VIDEO_PREVIEW_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PreviewSeed) : null;
  } catch {
    return null;
  }
};

// Seconds between debounced progress saves while playing.
const SAVE_DEBOUNCE_MS = 5000;

const UserVideoPreview = () => {
  const router = useRouter();
  const [seed] = useState<PreviewSeed | null>(() =>
    typeof window === 'undefined' ? null : readSeed()
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const resumeSeconds = useRef<number>(0);
  const lastSavedSecondsRef = useRef<number>(0);
  const saveTimer = useRef<number | null>(null);

  const [record, setRecord] = useState<VideoRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const id = seed?.id;
    if (!id) return;
    let ignore = false;

    const loadVideo = async () => {
      setLoading(true);
      setError('');
      try {
        const video = await getLibraryVideoById(id);
        if (ignore) return;
        if (!video) {
          setError('Video not found.');
          return;
        }
        if (video.processingStatus && video.processingStatus !== 'ready') {
          setError('This video is still processing and cannot be viewed yet.');
          return;
        }
        setRecord(video);

        // Fetch saved position for the resume seek (best-effort).
        try {
          const progress = await getWatchProgress(id);
          if (!ignore && progress && !progress.completed && progress.positionSeconds > 0) {
            resumeSeconds.current = progress.positionSeconds;
          }
        } catch {
          // No saved progress is fine — the video starts at 0.
        }
      } catch (e: any) {
        if (!ignore) setError(e.message || 'Failed to load the video.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadVideo();
    return () => {
      ignore = true;
    };
  }, [seed?.id]);

  // Save progress (upsert "viewed" record) with a small debounce.
  const persistProgress = (completed = false) => {
    const video = videoRef.current;
    if (!video || !seed?.id) return;
    const position = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    if (!completed && position <= 0) return;
    if (!Number.isFinite(video.duration)) return;

    const duration = video.duration;
    void saveWatchProgress(seed.id, {
      positionSeconds: completed ? duration : position,
      durationSeconds: duration,
      completed,
    }).catch(() => {
      // Best-effort; next debounce tick or pause will retry.
    });
    lastSavedSecondsRef.current = position;
  };

  const scheduleSave = () => {
    if (saveTimer.current !== null) return;
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      const video = videoRef.current;
      if (!video) return;
      if (Math.abs(video.currentTime - lastSavedSecondsRef.current) >= 1) {
        persistProgress(false);
      }
    }, SAVE_DEBOUNCE_MS);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video || resumeSeconds.current <= 0) return;
    try {
      video.currentTime = resumeSeconds.current;
    } catch {
      // Seeking before ready can throw; the browser keeps the current time.
    }
  };

  // Progress save on unload (pause before navigating away is common, but this
  // covers closing the tab too).
  useEffect(() => {
    const flush = () => persistProgress(false);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      // Flush the final position when the user navigates away in-app.
      persistProgress(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.id]);

  const title = record?.title || seed?.title || '';
  const description = record?.description || seed?.description || '';
  const src = record?.videoUrl || (record ? '' : seed?.src);
  const thumbnail = contentThumbnail(record?.thumbnailUrl || seed?.thumbnail);

  if (loading) {
    return (
      <UserLayout activeKey={ROUTE_PATHS.userVideos}>
        <div className="vp-page">
          <div className="vp-empty">
            <Spin size="large" />
          </div>
        </div>
      </UserLayout>
    );
  }

  if (!seed || !src || error) {
    return (
      <UserLayout activeKey={ROUTE_PATHS.userVideos}>
        <div className="vp-page">
          <div className="vp-empty">
            <Empty
              image={
                <PlayCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
              }
              description={
                <Text strong>{error || 'No video selected.'}</Text>
              }
            />
            <Button
              type="primary"
              onClick={() => router.push(ROUTE_PATHS.userVideos)}
              style={{ marginTop: 16 }}
            >
              Back to Videos
            </Button>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout activeKey={ROUTE_PATHS.userVideos}>
      <div className="vp-page">
        <PageHeader
          backHref={ROUTE_PATHS.userVideos}
          title="Video"
          icon={<VideoCameraOutlined />}
          showBack={false}
        />

        <div className="vp-card">
          <video
            className="vp-player"
            controls
            autoPlay
            ref={videoRef}
            src={src}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={scheduleSave}
            onPause={() => persistProgress(false)}
            onEnded={() => persistProgress(true)}
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
                  {description || 'No description provided.'}
                </Paragraph>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default withAuth(UserVideoPreview);