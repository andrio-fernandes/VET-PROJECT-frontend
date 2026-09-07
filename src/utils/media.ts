// =============================================
// MEDIA / URL HELPERS
// =============================================

import defaultThumbnail from '@/assets/default.jpg';

// Resolves a content record's thumbnail: the record's own image when present
// (uploaded media, passed through mediaUrl), otherwise the bundled
// default.jpg. Use this instead of manual `url ? mediaUrl(url) : default`
// ternaries.
export const contentThumbnail = (url?: string): string =>
  url ? mediaUrl(url) : defaultThumbnail.src;

// Uploaded binaries live on the API server (served from /uploads at the
// server root, NOT under /api), so strip any /api suffix before prefixing.
export const mediaUrl = (path?: string): string => {
  if (!path) return '';
  if (/^(https?:\/\/|data:)/i.test(path)) return path;
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
  return `${baseUrl}${path}`;
};

export const fileNameFromUrl = (url: string): string => {
  const lastSegment = url.split('/').pop() || url;
  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment;
  }
};

// Extensions that can be previewed via Google Docs Viewer / Microsoft Office
// Viewer in a new browser tab.
const PDF_EXTENSION = 'pdf';
const OFFICE_VIEWER_EXTENSIONS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

export const getAttachmentExtension = (fileName: string): string => {
  const clean = fileName.split('?')[0].split('#')[0];
  const idx = clean.lastIndexOf('.');
  return idx === -1 ? '' : clean.slice(idx + 1).toLowerCase();
};

// Builds the third-party viewer URL for a document attachment, following the
// senior's logic:
//   PDF            -> Google Docs Viewer
//   Office files   -> Microsoft Office Viewer
// Returns an empty string when the format is not viewer-supported.
export const buildDocumentViewerUrl = (fileName: string, actualUrl: string): string => {
  const ext = getAttachmentExtension(fileName);
  if (ext === PDF_EXTENSION) {
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
      actualUrl
    )}`;
  }
  if (OFFICE_VIEWER_EXTENSIONS.includes(ext)) {
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
      actualUrl
    )}`;
  }
  return '';
};

// True when the given file can be shown in a third-party document viewer.
export const isDocumentViewable = (fileName: string): boolean =>
  buildDocumentViewerUrl(fileName, '') !== '';

// Parses a BlogRecord.attachment JSON string into attachment references that
// carry a stable display name and a URL. Supports the persisted backend shape
// [{ name, url }] as well as legacy arrays of plain URL strings.
export const parseBlogAttachments = (
  raw: string | undefined
): { name: string; url: string }[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === 'string') {
            return { name: fileNameFromUrl(item), url: item };
          }
          if (item && typeof item === 'object' && typeof item.url === 'string') {
            return {
              name:
                typeof item.name === 'string' ? item.name : fileNameFromUrl(item.url),
              url: item.url,
            };
          }
          return null;
        })
        .filter(Boolean) as { name: string; url: string }[];
    }
  } catch {
    /* ignore */
  }
  return raw ? [{ name: fileNameFromUrl(raw), url: raw }] : [];
};


