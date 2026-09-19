import React, { useCallback, useEffect, useState } from 'react';
import { Button, Space, App as AntApp, Typography } from 'antd';
import {
  EyeOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { UserLayout } from '@/layouts/user-layout';
import { withAuth } from '@/components/auth/with-auth';
import { PAGE_SIZE, ROUTE_PATHS } from '@/constants';
import { useContentFilters } from '@/hooks/use-content-filters';
import { useClampedRows } from '@/hooks/use-clamped-rows';
import { getLibraryFaqs, markViewed } from '@/services/library-service';
import type { FaqRecord } from '@/types/faq';
import { ViewAllTable } from '@/components/common/view-all-table';
import { ViewFAQModal } from '@/components/common/view-faq-modal';
import { buildContentColumns } from '@/components/common/content-columns';
import ViewedBadge from '@/components/common/viewed-badge';
import NewBadge from '@/components/common/new-badge';
import useViewedFlash from '@/hooks/use-viewed-flash';
import useNewBadge from '@/hooks/use-new-badge';
import ClampedCellText from '@/components/common/clamped-cell-text';

const { Text } = Typography;

const UserFaqs = () => {
  const { message } = AntApp.useApp();

  const [faqs, setFaqs] = useState<FaqRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const { flashIds, flashView } = useViewedFlash();
  const faqClamp = useClampedRows();
  const { isNew, isFading } = useNewBadge('faq', faqs);

  const [viewingFaq, setViewingFaq] = useState<FaqRecord | null>(null);

  const handleOpenFaq = (record: FaqRecord) => {
    setViewingFaq(record);
    flashView(String(record._id));
    markViewed('faq', String(record._id)).catch(() => {
      // Best-effort: a failed mark just keeps the badge in place locally.
    });
  };

  const {
    page,
    setPage,
    moduleFilter,
    categoryFilter,
    onModuleChange,
    onCategoryChange,
  } = useContentFilters(() => setLoading(true));

  const applyFaqsFromData = useCallback(
    (data: any) => {
      setFaqs(data?.faqs ?? []);
      setPage(data?.page ?? page);
      setTotal(data?.totalFaqs ?? 0);
    },
    [page, setPage]
  );

  useEffect(() => {
    let ignore = false;

    const fetchFaqs = async () => {
      try {
        const data = await getLibraryFaqs({
          page,
          limit: PAGE_SIZE,
          module: moduleFilter === 'All' ? undefined : moduleFilter,
          category: categoryFilter === 'All' ? undefined : categoryFilter,
          q: searchQuery || undefined,
        });
        if (!ignore) applyFaqsFromData(data);
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
  }, [page, moduleFilter, categoryFilter, searchQuery, message, applyFaqsFromData]);

  const columns = buildContentColumns<FaqRecord>({
    ns: 'faqs',
    titleKey: 'question',
    renderTitle: (text, record) => (
      <div>
        <span className="faqs-cell-question-wrap">
          <ClampedCellText
            text={text}
            expanded={faqClamp.isExpanded(String(record._id))}
            onToggle={() => faqClamp.toggle(String(record._id))}
          />
          {flashIds.has(String(record._id)) && <ViewedBadge />}
        </span>
        {isNew(String(record._id)) && <NewBadge fading={isFading} />}
      </div>
    ),
    categoryEllipsis: true,
    createdByEllipsis: true,
    renderCreatedBy: (record) => (
      <Text className="faqs-cell-text">
        {record.createdBy?.fullName || record.createdBy?.username || 'Admin'}
      </Text>
    ),
    renderActions: (record) => (
      <Space size={8} className="faqs-action-col">
        <Button
          type="text"
          title="View"
          icon={<EyeOutlined className="faqs-action-icon" />}
          onClick={() => handleOpenFaq(record)}
        />
      </Space>
    ),
  });

  return (
    <UserLayout activeKey={ROUTE_PATHS.userFaqs}>
      <ViewAllTable<FaqRecord>
        ns="faqs"
        title="FAQs"
        icon={<QuestionCircleOutlined />}
        createHref="/faqs"
        hideCreateButton
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
        emptyText="No FAQs available yet."
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
    </UserLayout>
  );
};

export default withAuth(UserFaqs);