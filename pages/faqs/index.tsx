import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Space, Button, App as AntApp, Typography } from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { AdminLayout } from '@/layouts/AdminLayout';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { PAGE_SIZE } from '@/constants';
import { useCanManage } from '@/hooks/useCanManage';
import { useContentFilters } from '@/hooks/useContentFilters';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { useClampedRows } from '@/hooks/useClampedRows';
import { deleteFaq, getMyFaqs } from '@/services/faqService';
import type { FaqRecord } from '@/types/faq';
import { ViewAllTable } from '@/components/common/ViewAllTable';
import { ViewFAQModal } from '@/components/common/ViewFAQModal';
import { buildContentColumns } from '@/components/common/contentColumns';
import ClampedCellText from '@/components/common/ClampedCellText';

const { Text } = Typography;

const ViewFaqs = () => {
  const router = useRouter();
  const { message, modal } = AntApp.useApp();
  const { canManage } = useCanManage<FaqRecord>();
  const faqClamp = useClampedRows();

  const [faqs, setFaqs] = useState<FaqRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const [viewingFaq, setViewingFaq] = useState<FaqRecord | null>(null);

  const {
    page,
    setPage,
    moduleFilter,
    categoryFilter,
    onModuleChange,
    onCategoryChange,
  } = useContentFilters(() => setLoading(true));

  useEffect(() => {
    let ignore = false;

    const fetchFaqs = async () => {
      try {
        const data = await getMyFaqs({
          page,
          limit: PAGE_SIZE,
          module: moduleFilter,
          category: categoryFilter,
          q: searchQuery || undefined,
        });
        if (!ignore) {
          setFaqs(data?.faqs ?? []);
          setPage(data?.page ?? page);
          setTotal(data?.totalFaqs ?? 0);
        }
      } catch (error: any) {
        if (!ignore) message.error(error.message || 'Failed to load FAQs.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchFaqs();

    return () => {
      ignore = true;
    };
  }, [page, moduleFilter, categoryFilter, searchQuery, message, reloadKey, setPage]);

  const { confirmDelete } = useDeleteConfirm<FaqRecord>({
    modal,
    message,
    confirmTitle: 'Delete this FAQ?',
    confirmContent: 'Are you sure you want to delete this FAQ?',
    okText: 'Yes',
    cancelText: 'No',
    centered: true,
    getRecordId: (record) => record._id,
    deleteFn: deleteFaq,
    successMessage: 'FAQ deleted successfully!',
    errorMessage: 'Failed to delete FAQ.',
    isLastItemOnPage: () => faqs.length === 1 && page > 1,
    onPageBack: () => setPage(page - 1),
    onReload: () => {
      setLoading(true);
      setReloadKey((key) => key + 1);
    },
  });

  const columns = buildContentColumns<FaqRecord>({
    ns: 'faqs',
    titleKey: 'question',
    renderTitle: (text, record) => (
      <ClampedCellText
        text={text}
        expanded={faqClamp.isExpanded(String(record._id))}
        onToggle={() => faqClamp.toggle(String(record._id))}
      />
    ),
    categoryEllipsis: true,
    createdByEllipsis: true,
    renderCreatedBy: (record) => (
      <Text className="faqs-cell-text">{record.createdBy?.fullName || record.createdBy?.username || 'Admin'}</Text>
    ),
    renderActions: (record) => (
      <Space size={8} className="faqs-action-col">
        <Button
          type="text"
          title="View"
          icon={<EyeOutlined className="faqs-action-icon" />}
          onClick={() => setViewingFaq(record)}
        />
        {canManage(record) && (
          <Button
            type="text"
            title="Edit"
            icon={<EditOutlined className="faqs-action-icon" />}
            onClick={() => router.push(`/faqs/edit?id=${record._id}`)}
          />
        )}
        {canManage(record) && (
          <Button
            type="text"
            title="Delete"
            icon={<DeleteOutlined className="faqs-action-delete" />}
            onClick={() => confirmDelete(record)}
          />
        )}
      </Space>
    ),
  });

  return (
    <AdminLayout>
      <ViewAllTable<FaqRecord>
        ns="faqs"
        title="FAQs"
        icon={<QuestionCircleOutlined />}
        createHref="/faqs/create"
        columns={columns}
        dataSource={faqs}
        rowKey="_id"
        loading={loading}
        total={total}
        page={page}
        onPageChange={(nextPage) => {
          setLoading(true);
          setPage(nextPage);
        }}
        pageSize={PAGE_SIZE}
        emptyText="No FAQs uploaded yet."
        countNoun="FAQs"
        moduleFilter={moduleFilter}
        categoryFilter={categoryFilter}
        onModuleChange={onModuleChange}
        onCategoryChange={onCategoryChange}
        tableLayout="fixed"
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setLoading(true);
        }}
        extra={
          <ViewFAQModal
            open={Boolean(viewingFaq)}
            question={viewingFaq?.question}
            answer={viewingFaq?.answer}
            onClose={() => setViewingFaq(null)}
          />
        }
      />
    </AdminLayout>
  );
};

export default withAdminAuth(ViewFaqs);