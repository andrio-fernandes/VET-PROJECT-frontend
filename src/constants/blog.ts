// =============================================
// SHARED BLOG CONSTANTS
// =============================================

export const GREEN = '#52c41a';

export const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const EDITOR_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export const THUMBNAIL_EXTENSIONS = ['.png', '.jpg', '.jpeg'];
export const ATTACHMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.png'];

export const THUMBNAIL_ACCEPT = '.png,.jpg,.jpeg,image/png,image/jpeg';
export const ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png';

export const BLOG_DRAFT_STORAGE_KEY = 'create-blog-draft-v1';
export const BLOG_PREVIEW_STORAGE_KEY = 'create-blog-preview-draft-v1';
export const BLOG_EDIT_PREVIEW_STORAGE_KEY = 'edit-blog-preview-roundtrip-v1';
export const DRAFT_AUTOSAVE_DEBOUNCE_MS = 800;
