// =============================================
// MEDIA / URL HELPERS
// =============================================

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

// Extracts the lowercase file extension (without the leading dot) from a
// filename or URL, e.g. "report.docx" -> "docx", "reports/plan.XLS?x=1" -> "xls".
export const getAttachmentExtension = (url: string): string => {
  try {
    const clean = url.split('?')[0].split('#')[0];
    const ext = clean.match(/\.([a-zA-Z0-9]+)$/)?.[1];
    return ext ? ext.toLowerCase() : '';
  } catch {
    return '';
  }
};

// Attachments in these formats can be rendered inline in the blog preview
// (DOCX / XLSX / XLS). PDFs and images are natively shown by the browser, so
// they open in a plain tab instead of the inline viewer route.
export const isInlinePreviewable = (url: string): boolean =>
  ['docx', 'xlsx', 'xls'].includes(getAttachmentExtension(url));
