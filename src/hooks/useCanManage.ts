import { useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useAuth';

// Ownership check shared by the content list pages. Mirrors the server rule
// enabled by the createdById field on each row: only the creator or a super
// admin can edit/delete.
export const useCanManage = <T extends { createdById?: string | null }>() => {
  const currentUser = useCurrentUser();
  const currentUserId = currentUser?._id ? String(currentUser._id) : '';
  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin);

  const canManage = useCallback(
    (record: T): boolean =>
      isSuperAdmin ||
      (Boolean(record.createdById) && record.createdById === currentUserId),
    [isSuperAdmin, currentUserId]
  );

  return { canManage, currentUserId, isSuperAdmin };
};