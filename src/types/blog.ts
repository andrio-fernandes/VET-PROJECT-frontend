// =============================================
// SHARED BLOG TYPES USED ACROSS BLOG / DASHBOARD / PREVIEW
// =============================================

export interface BlogRecord {
  _id?: string;
  title?: string;
  description?: string;
  module?: string;
  category?: string;
  content?: string;
  thumbnail?: string;
  attachment?: string;
  createdAt?: string;
}

// A single attachment parsed from BlogRecord.attachment. Existing (server-side)
// attachments carry a URL + original name; newly picked ones are local Files.
export interface BlogAttachmentRef {
  name: string;
  url: string;
  /** True when this attachment already exists on the server (has a URL). */
  existing?: boolean;
}

export interface BlogListItem {
  _id: string;
  title: string;
  description: string;
  module?: string;
  category?: string;
  thumbnail?: string;
  createdAt: string;
  createdBy?: { fullName?: string; username?: string };
  createdById?: string | null;
}

// Local draft persistence for the Create New Blog form. Files are never
// uploaded just to save a draft; only the small thumbnail image is embedded
// as a data URL so it can be restored safely. Attachments are too large and
// are always reset when a draft is restored.
export interface BlogDraftValues {
  title?: string;
  description?: string;
  module?: string;
  category?: string;
  content?: string;
}

export interface BlogDraft {
  version: number;
  savedAt: string;
  values: BlogDraftValues;
  thumbnail: { name: string; dataUrl: string } | null;
  attachments: { name: string; dataUrl: string }[];
}

export interface PreviewDraft {
  title: string;
  description: string;
  module: string;
  category: string;
  content: string;
  thumbnail: string | null;
  attachments: (string | { name: string; dataUrl: string })[];
}

export interface PickedImage {
  file: File;
  url: string;
  name: string;
}

export interface PickedAttachment {
  file: File;
  name: string;
}

export interface ParsedAttachment {
  name: string;
  url: string;
}
