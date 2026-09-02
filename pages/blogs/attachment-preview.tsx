// =============================================
// ATTACHMENT VIEWER  (opens in a new browser tab)
//
// Renders a single blog attachment inline. The attachment is fetched from its
// (possibly Cloudinary-signed) URL in the browser, read as a Blob and passed
// directly to @shahajimbhosle/local-doc-viewer. Nothing is uploaded anywhere
// and the signed URL is never sent to a third-party viewer service.
//
// Supported inline formats: DOCX, XLSX, XLS. These are routed here by
// blogs/preview. PDFs and images are NOT: the browser displays them natively,
// so they open in a plain tab instead.
//
// Unsupported formats (e.g. legacy .doc) are not routed here; the caller
// (blogs/preview) keeps the existing download behavior for those.
//
// The viewer library is browser-only (it touches `document` at load time), so
// it is loaded with next/dynamic + ssr:false so the Next.js build never
// executes it on the server. Its stylesheet is scoped to the same client chunk.
// =============================================

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { Alert, Button, Space, Spin, Typography } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, PaperClipOutlined } from '@ant-design/icons';

// Stylesheet for the browser viewer (safe to import server-side; only the JS
// library touches `document` at load time and is loaded client-only).
import '@shahajimbhosle/local-doc-viewer/style.css';

import { GREEN } from '@/constants/blog';
import { mediaUrl } from '@/utils/media';

const { Text } = Typography;

type ViewerProps = { blob: Blob; name: string; onError: (e: Error) => void };

// Browser-only: the library reads `document` at load time, so keep it out of
// the server render. Suspense fallback doubles as the initial loader.
const DocumentViewer = dynamic(
  () =>
    import('@shahajimbhosle/local-doc-viewer').then((mod) => {
      const Cmp = mod.DocumentViewer;
      const LazyViewer = (props: ViewerProps) => (
        <Cmp
          source={{ blob: props.blob, fileName: props.name }}
          height="100%"
          onError={props.onError}
        />
      );
      return { default: LazyViewer };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="blog-attachment-state">
        <Spin size="large" />
        <Text type="secondary">Preparing preview…</Text>
      </div>
    ),
  }
);

const AttachmentViewerPage = () => {
  const router = useRouter();

  const query = router.query;
  const rawUrl = typeof query.url === 'string' ? query.url : '';
  const rawName = typeof query.name === 'string' ? query.name : '';
  let name = rawName;
  try {
    name = decodeURIComponent(rawName);
  } catch {
    /* keep raw */
  }

  const [blob, setBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady || !rawUrl) return;
    let cancelled = false;

    const load = async () => {
      setStatus('loading');
      setError('');
      try {
        const res = await fetch(mediaUrl(rawUrl));
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? 'The file could not be found. It may have expired or been deleted.'
              : `Failed to load the file (HTTP ${res.status}).`
          );
        }
        const blobData = await res.blob();
        if (cancelled) return;
        setBlob(blobData);
        setStatus('ready');
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'The file could not be loaded for preview.');
          setStatus('error');
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, rawUrl]);

  const downloadFallback = () => {
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = name || 'attachment';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      return;
    }
    if (rawUrl) {
      window.open(mediaUrl(rawUrl), '_self');
    }
  };

  return (
    <div className="blog-attachment-page">
      <div className="blog-attachment-topbar">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => window.history.back()}>
          Back
        </Button>
        <div className="blog-attachment-topbar-title">
          <PaperClipOutlined style={{ color: GREEN }} />
          <Text strong style={{ wordBreak: 'break-all' }}>
            {name || 'Attachment'}
          </Text>
        </div>
        <Button icon={<DownloadOutlined />} onClick={downloadFallback} disabled={!blob}>
          Download
        </Button>
      </div>

      <div className="blog-attachment-body">
        {status === 'loading' && (
          <div className="blog-attachment-state">
            <Spin size="large" />
            <Text type="secondary">Loading preview…</Text>
          </div>
        )}

        {status === 'error' && (
          <div className="blog-attachment-state">
            <Alert
              type="error"
              showIcon
              message={error}
              style={{ marginBottom: 16, width: '100%', maxWidth: 560 }}
            />
            <Space>
              {blob && (
                <Button type="primary" icon={<DownloadOutlined />} onClick={downloadFallback}>
                  Download file
                </Button>
              )}
              <Button onClick={() => window.history.back()}>Go back</Button>
            </Space>
          </div>
        )}

        {status === 'ready' && blob && (
          <DocumentViewer
            blob={blob}
            name={name}
            onError={(err) => {
              setError(err?.message || 'The file could not be rendered for preview.');
              setStatus('error');
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AttachmentViewerPage;
