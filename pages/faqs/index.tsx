import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Space, Button, App as AntApp, Modal, Typography } from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { AdminLayout } from '@/layouts/AdminLayout';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { PAGE_SIZE } from '@/constants';
import { deleteFaq, getMyFaqs } from '@/services/faqService';
import type { FaqRecord } from '@/types/faq';
import { ViewAllTable } from '@/components/common/ViewAllTable';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

const ViewFaqs = () => {
  const router = useRouter();
  const { message, modal } = AntApp.useApp();

  const [faqs, setFaqs] = useState<FaqRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [moduleFilter, setModuleFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [viewingFaq, setViewingFaq] = useState<FaqRecord | null>(null);

  useEffect(() => {
    let ignore = false;

    const fetchFaqs = async () => {
      try {
        const data = await getMyFaqs({
          page,
          limit: PAGE_SIZE,
          module: moduleFilter,
          category: categoryFilter,
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
  }, [page, moduleFilter, categoryFilter, message, reloadKey]);

  const handleDelete = async (id: string) => {
    try {
      await deleteFaq(id);
      message.success('FAQ deleted successfully!');
      if (faqs.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        setLoading(true);
        setReloadKey((key) => key + 1);
      }
    } catch (error: any) {
      message.error(error.message || 'Failed to delete FAQ.');
    }
  };

  const showDeleteConfirm = (id: string) => {
    modal.confirm({
      title: 'Delete this FAQ?',
      content: 'Are you sure you want to delete this FAQ?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      centered: true,
      onOk() {
        return handleDelete(id);
      },
    });
  };

  const columns: ColumnsType<FaqRecord> = [
    {
      title: 'Title',
      dataIndex: 'question',
      key: 'question',
      width: '38%',
      render: (text: string) => <Text className="faqs-cell-text faqs-cell-question">{text}</Text>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: '15%',
      ellipsis: true,
      render: (text: string) => <Text className="faqs-cell-text">{text}</Text>,
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '18%',
      render: (text: string) => <Text className="faqs-cell-text">{dayjs(text).format('DD MMM YYYY')}</Text>,
    },
    {
      title: 'Created By',
      key: 'createdBy',
      width: '17%',
      ellipsis: true,
      render: (_: unknown, record: FaqRecord) => (
        <Text className="faqs-cell-text">{record.createdBy?.fullName || record.createdBy?.username || 'Admin'}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '12%',
      render: (_: unknown, record: FaqRecord) => (
        <Space size={4} className="faqs-action-col">
          <Button
            type="text"
            title="View"
            icon={<EyeOutlined className="faqs-action-icon" />}
            onClick={() => setViewingFaq(record)}
          />
          <Button
            type="text"
            title="Edit"
            icon={<EditOutlined className="faqs-action-icon" />}
            onClick={() => router.push(`/faqs/edit?id=${record._id}`)}
          />
          <Button
            type="text"
            title="Delete"
            icon={<DeleteOutlined className="faqs-action-delete" />}
            onClick={() => showDeleteConfirm(record._id)}
          />
        </Space>
      ),
    },
  ];

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
        onModuleChange={(value) => {
          setModuleFilter(value);
          setCategoryFilter('All');
          setPage(1);
          setLoading(true);
        }}
        onCategoryChange={(value) => {
          setCategoryFilter(value);
          setPage(1);
          setLoading(true);
        }}
        tableLayout="fixed"
        extra={
          <>
            {/* VIEW FAQ MODAL */}
            <Modal
              title="View FAQ"
              open={Boolean(viewingFaq)}
              onCancel={() => setViewingFaq(null)}
              footer={null}
              width={736}
              centered
              maskStyle={{
                backdropFilter: 'blur(6px)',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
              }}
              styles={{ body: { borderRadius: '12px', padding: '24px' } }}
            >
              {viewingFaq && (
                <div>
                  <div className="faqs-create-block">
                    <Text className="faqs-create-preview-label faqs-create-preview-label-q">
                      Question
                    </Text>
                    <Text strong className="faqs-create-preview-question">
                      {viewingFaq.question}
                    </Text>
                  </div>

                  <div className="faqs-create-preview-answer-block">
                    <Text className="faqs-create-preview-label">
                      Answer
                    </Text>
                  </div>
                  <div className="faqs-create-preview-answer-box">
                    <Text className="faqs-create-preview-answer">
                      {viewingFaq.answer}
                    </Text>
                  </div>
                </div>
              )}
            </Modal>
          </>
        }
      />
    </AdminLayout>
  );
};

export default withAdminAuth(ViewFaqs);