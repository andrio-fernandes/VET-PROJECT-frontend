// Rich text helpers.

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

// Strip script blocks and inline event handlers before rendering.
export const sanitizeRichText = (html: string | undefined): string =>
  (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
