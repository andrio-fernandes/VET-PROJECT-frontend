// =============================================
// ATTACHMENT VIEWER  (opens in a new browser tab)
//
// Redirects the browser to the appropriate third-party document viewer for
// supported formats (Google Docs Viewer for PDFs, Microsoft Office Viewer for
// DOC/DOCX/XLS/XLSX/PPT/PPTX). Falls back to a direct download for
// unsupported formats.
//
// This page is opened from blogs/preview via window.open() in _blank.
// =============================================

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Alert, Button, Space, Typography } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';

import { buildDocumentViewerUrl } from '@/utils/media';
import PageLoading from '@/components/common/page-loading';

const { Text } = Typography;

const AttachmentPreviewPage = () => {
  const router = useRouter();

  const rawUrl = typeof router.query.url === 'string' ? router.query.url : '';
  const rawName = typeof router.query.name === 'string' ? router.query.name : '';
  let name = rawName;
  try {
    name = decodeURIComponent(rawName);
  } catch {
    /* keep raw */
  }

  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady || !rawUrl) return;

    const viewerUrl = buildDocumentViewerUrl(name || rawUrl, rawUrl);
    if (viewerUrl) {
      window.location.href = viewerUrl;
      return;
    }

    // Unsupported format: trigger a download instead.
    const download = async () => {
      try {
        const res = await fetch(rawUrl);
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? 'The file could not be found. It may have been deleted.'
              : `Failed to load the file (HTTP ${res.status}).`
          );
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = name || 'attachment';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        window.close();
      } catch (err: any) {
        setError(err?.message || 'The file could not be downloaded.');
        setStatus('error');
      }
    };

    download();
  }, [router.isReady, rawUrl, name]);

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      {status === 'loading' && <PageLoading />}

      {status === 'error' && (
        <Space direction="vertical" size="middle" style={{ marginTop: 80, maxWidth: 480, margin: '80px auto 0' }}>
          <Alert type="error" showIcon message={error} />
          <Space>
            {rawUrl && (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => window.open(rawUrl, '_self')}
              >
                Download file
              </Button>
            )}
            <Button icon={<ArrowLeftOutlined />} onClick={() => window.history.back()}>
              Go back
            </Button>
          </Space>
        </Space>
      )}
    </div>
  );
};

export default AttachmentPreviewPage;
