// =============================================
// RICH TEXT HELPERS
// =============================================

export const stripHtmlTags = (html: string | undefined): string =>
  (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const hasVisibleText = (html: string | undefined): boolean =>
  (html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim().length > 0;

// Rich text comes from our own editor; drop script blocks and inline event
// handlers before rendering it as formatted HTML.
export const sanitizeRichText = (html: string | undefined): string =>
  (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
