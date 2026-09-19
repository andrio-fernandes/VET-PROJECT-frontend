import { useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import type { HookAPI } from 'antd/es/modal/useModal';

interface UseDeleteConfirmOptions<T> {
  modal: HookAPI;
  message: MessageInstance;
  confirmTitle: string;
  confirmContent: string;
  okText?: string;
  cancelText?: string;
  centered?: boolean;
  getRecordId: (record: T) => string;
  deleteFn: (id: string) => Promise<void>;
  successMessage: string;
  errorMessage: string;
  /** True when deleting the sole row of a page beyond the first. */
  isLastItemOnPage: () => boolean;
  onPageBack: () => void;
  onReload: () => void | Promise<void>;
}

// Shared delete flow used by the Video/Blog/FAQ list pages: confirmation
// modal, success/error toasts, page-back when the last row of a later page
// is removed, and a reload of the current page otherwise.
export const useDeleteConfirm = <T,>(options: UseDeleteConfirmOptions<T>) => {
  const {
    modal,
    message,
    getRecordId,
    deleteFn,
    confirmTitle,
    confirmContent,
    okText,
    cancelText,
    centered,
    successMessage,
    errorMessage,
    isLastItemOnPage,
    onPageBack,
    onReload,
  } = options;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const confirmDelete = (record: T) => {
    const id = getRecordId(record);
    modal.confirm({
      title: confirmTitle,
      content: confirmContent,
      okText,
      okType: 'danger',
      cancelText,
      centered,
      onOk: async () => {
        setDeletingId(id);
        try {
          await deleteFn(id);
          message.success(successMessage);
          if (isLastItemOnPage()) {
            onPageBack();
          } else {
            await onReload();
          }
        } catch (error: any) {
          message.error(error.message || errorMessage);
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  return { confirmDelete, deletingId };
};