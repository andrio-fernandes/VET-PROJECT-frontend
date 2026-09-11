import React, { useCallback, useEffect, useState } from 'react';
import { Button, Space, App as AntApp, Typography } from 'antd';
import {
  EyeOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { UserLayout } from '@/layouts/UserLayout';
import { withAuth } from '@/components/auth/with-auth';
import { PAGE_SIZE, ROUTE_PATHS } from '@/constants';
import { useContentFilters } from '@/hooks/useContentFilters';
import { getLibraryFaqs, getViewedIds, markViewed } from '@/services/libraryService';
import type { FaqRecord } from '@/types/faq';
import { ViewAllTable } from '@/components/common/ViewAllTable';
import { ViewFAQModal } from '@/components/common/ViewFAQModal';
import { buildContentColumns } from '@/components/common/contentColumns';
import ViewedBadge from '@/components/common/ViewedBadge';

const { Text } = Typography;

const UserFaqs = () => {
  const { message } = AntApp.useApp();

  const [faqs, setFaqs] = useState<FaqRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  const [viewingFaq, setViewingFaq] = useState<FaqRecord | null>(null);

  useEffect(() => {
    let ignore = false;
    getViewedIds()
      .then((data) => {
        if (!ignore) setViewedIds(new Set(data.faq));
      })
      .catch(() => {
        // Badge is best-effort; ignoring failures keeps the page usable.
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleOpenFaq = (record: FaqRecord) => {
    setViewingFaq(record);
    if (!viewedIds.has(String(record._id))) {
      setViewedIds((prev) => {
        const next = new Set(prev);
        next.add(String(record._id));
        return next;
      });
      markViewed('faq', String(record._id)).catch(() => {
        // Best-effort: a failed mark just keeps the badge in place locally.
      });
    }
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
  }, [page, moduleFilter, categoryFilter, message, applyFaqsFromData]);

  const columns = buildContentColumns<FaqRecord>({
    ns: 'faqs',
    titleKey: 'question',
    renderTitle: (text, record) => (
      <span className="faqs-cell-question-wrap">
        <Text className="faqs-cell-text faqs-cell-question">{text}</Text>
        {viewedIds.has(String(record._id)) && <ViewedBadge />}
      </span>
    ),
    categoryEllipsis: true,
    createdByEllipsis: true,
    renderCreatedBy: (record) => (
      <Text className="faqs-cell-text">
        {record.createdBy?.fullName || record.createdBy?.username || 'Admin'}
      </Text>
    ),
    renderActions: (record) => (
      <Space size={4} className="faqs-action-col">
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