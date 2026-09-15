// =============================================
// SHARED FAQ TYPES
// Kept identical to the inline types in the FAQ
// pages - do not change shapes.
// =============================================

export interface FaqRecord {
  _id: string;
  question: string;
  answer: string;
  createdBy?: { fullName?: string; username?: string };
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  module?: string;
  category?: string;
  isNew?: boolean;
}

export interface CreateFaqPayload {
  module: string;
  category: string;
  question: string;
  answer: string;
}

export interface UpdateFaqPayload {
  module?: string;
  category?: string;
  question: string;
  answer: string;
}
