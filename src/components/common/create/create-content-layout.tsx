// =============================================
// CREATE CONTENT LAYOUT
//
// Shared page shell for the Video / FAQ / Blog create (and edit) pages. Owns
// the AdminLayout wrapper, the optional page/inner container divs, and the two
// shared dialogs (leave confirmation + restore draft). The page passes its own
// wrapper classes so the rendered markup keeps the existing styling, and
// renders everything else — the CreatePageHeader, its form card and any
// page-specific modals (preview, upload-in-progress) — as children.
// =============================================

import React from 'react';
import { AdminLayout } from '@/layouts/admin-layout';
import { LeaveConfirmModal } from './leave-confirm-modal';
import { RestoreDraftModal } from './restore-draft-modal';

interface LeaveConfirmSlot {
  open: boolean;
  onCancel: () => void;
  onSave: () => void;
  onDiscard: () => void;
}

interface RestoreDraftSlot {
  open: boolean;
  noun: string;
  onRestore: () => void;
  onDiscard: () => void;
}

interface CreateContentLayoutProps {
  /** Handed to AdminLayout (Blog uses it to intercept sidebar navigation). */
  onNavigate?: (path: string) => void;
  pageClassName?: string;
  pageStyle?: React.CSSProperties;
  innerClassName?: string;
  innerStyle?: React.CSSProperties;
  /** Everything rendered inside the page wrapper: the header + form content. */
  children: React.ReactNode;
  leaveConfirm?: LeaveConfirmSlot;
  restoreDraft?: RestoreDraftSlot;
}

export const CreateContentLayout: React.FC<CreateContentLayoutProps> = ({
  onNavigate,
  pageClassName,
  pageStyle,
  innerClassName,
  innerStyle,
  children,
  leaveConfirm,
  restoreDraft,
}) => (
  <AdminLayout onNavigate={onNavigate}>
    <div className={pageClassName} style={pageStyle}>
      {innerClassName || innerStyle ? (
        <div className={innerClassName} style={innerStyle}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>

    {leaveConfirm && (
      <LeaveConfirmModal
        open={leaveConfirm.open}
        onCancel={leaveConfirm.onCancel}
        onSave={leaveConfirm.onSave}
        onDiscard={leaveConfirm.onDiscard}
      />
    )}

    {restoreDraft && (
      <RestoreDraftModal
        open={restoreDraft.open}
        noun={restoreDraft.noun}
        onRestore={restoreDraft.onRestore}
        onDiscard={restoreDraft.onDiscard}
      />
    )}
  </AdminLayout>
);