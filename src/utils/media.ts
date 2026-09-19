// Media and URL helper functions.

import defaultThumbnail from '@/assets/default.svg';
import { getFileExtension } from '@/utils/file';

// Resolve thumbnail: use record's image if present, else default.
export const contentThumbnail = (url?: string): string =>
  url ? mediaUrl(url) : defaultThumbnail.src;

// Build media URL, stripping /api suffix since uploads are served from root.
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

// Extensions viewable via Google/Microsoft Office viewers.
const PDF_EXTENSION = 'pdf';
const OFFICE_VIEWER_EXTENSIONS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

// Get file extension without dot, stripping query/hash suffix.
export const getAttachmentExtension = (fileName: string): string =>
  getFileExtension(fileName.split('?')[0].split('#')[0]).replace(/^\./, '');

// Build third-party viewer URL (PDF -> Google, Office -> Microsoft).
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

// Parse blog attachments JSON (supports {name,url}, {name,dataUrl}, and string arrays).
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
          if (item && typeof item === 'object') {
            if (typeof item.url === 'string') {
              return {
                name:
                  typeof item.name === 'string' ? item.name : fileNameFromUrl(item.url),
                url: item.url,
              };
            }
            // Preview draft shape.
            if (typeof item.dataUrl === 'string') {
              return {
                name:
                  typeof item.name === 'string' ? item.name : fileNameFromUrl(item.dataUrl),
                url: item.dataUrl,
              };
            }
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


