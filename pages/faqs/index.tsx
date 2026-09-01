import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Typography, Space, Table, Button, App as AntApp, Modal, Select, Form, Input, Row, Col } from 'antd';
import dayjs from 'dayjs';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { AdminLayout } from '@/layouts/AdminLayout';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { CONTENT_MODULES, MODULE_CATEGORIES, PAGE_SIZE, countWords, type ContentModule, type ContentCategory } from '@/constants';
import { deleteFaq, getMyFaqs, updateFaq } from '@/services/faqService';
import type { FaqRecord } from '@/types/faq';
import WordCount from '@/components/WordCount';

const { Title, Text } = Typography;

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
  const [editingFaq, setEditingFaq] = useState<FaqRecord | null>(null);
  const [savingFaq, setSavingFaq] = useState(false);
  const [editForm] = Form.useForm<{ question: string; answer: string }>();
  const editQuestionValue = Form.useWatch('question', editForm);
  const editAnswerValue = Form.useWatch('answer', editForm);

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

  const openEditFaq = (faq: FaqRecord) => {
    setEditingFaq(faq);
    editForm.resetFields();
    editForm.setFieldsValue({ question: faq.question, answer: faq.answer });
  };

  const handleEditFaqSave = async () => {
    if (!editingFaq) return;

    let values: { question: string; answer: string };
    try {
      values = await editForm.validateFields();
    } catch {
      return;
    }

    setSavingFaq(true);
    try {
      await updateFaq(editingFaq._id, values);

      message.success('FAQ updated successfully!');
      setEditingFaq(null);
      setLoading(true);
      setReloadKey((key) => key + 1);
    } catch (error: any) {
      message.error(error.message || 'Failed to update FAQ.');
    } finally {
      setSavingFaq(false);
    }
  };

  const categoryOptions = moduleFilter === 'All'
    ? []
    : [
        { value: 'All', label: 'All' },
        ...(MODULE_CATEGORIES[moduleFilter as ContentModule] ?? []).map((category: ContentCategory) => ({ value: category, label: category })),
      ];

  const columns = [
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
            onClick={() => openEditFaq(record)}
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
      <div className="faqs-page-pad">
        <div className="faqs-page-inner">
          {/* Header */}
          <div className="faqs-header">
            <div className="faqs-header-icon">
              <QuestionCircleOutlined />
            </div>
            <Title level={3} className="faqs-header-title">
              FAQs
            </Title>
          </div>

          {/* Create button */}
          <div className="faqs-create-wrap">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push('/faqs/create')}
              className="faqs-create-btn"
            >
              Create
            </Button>
          </div>

          {/* Filters */}
          <Row gutter={24} className="faqs-filters">
            <Col span={12}>
              <div className="faqs-filter-group">
                <Text strong className="faqs-filter-label">
                  Select module:
                </Text>
                <Select
                  value={moduleFilter}
                  onChange={(value) => {
                    setModuleFilter(value);
                    setCategoryFilter('All');
                    setPage(1);
                    setLoading(true);
                  }}
                  className="faqs-select-module"
                  options={[{ value: 'All', label: 'All' }, ...CONTENT_MODULES.map((module) => ({ value: module, label: module }))]}
                />
              </div>
            </Col>
            <Col span={12}>
              <div className="faqs-filter-group">
                <Text strong className="faqs-filter-label">
                  Select Category:
                </Text>
                <Select
                  value={categoryFilter}
                  onChange={(value) => {
                    setCategoryFilter(value);
                    setPage(1);
                    setLoading(true);
                  }}
                  className="faqs-select-category"
                  disabled={moduleFilter === 'All'}
                  options={categoryOptions}
                />
              </div>
            </Col>
          </Row>

          {/* Table */}
          <div className="faqs-table-wrap">
            <Table
              columns={columns}
              dataSource={faqs}
              rowKey="_id"
              tableLayout="fixed"
              loading={loading}
              locale={{ emptyText: 'No FAQs uploaded yet.' }}
              pagination={{
                current: page,
                pageSize: PAGE_SIZE,
                total,
                showSizeChanger: false,
                onChange: (nextPage) => {
                  setLoading(true);
                  setPage(nextPage);
                },
              }}
            />
          </div>

          {!loading && total > 0 && (
            <Text type="secondary" className="faqs-count-text">
              Showing {faqs.length} of {total} FAQs
            </Text>
          )}
        </div>
      </div>

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

      {/* EDIT FAQ MODAL */}
      <Modal
        title="Edit FAQ"
        open={Boolean(editingFaq)}
        onCancel={() => setEditingFaq(null)}
        onOk={handleEditFaqSave}
        confirmLoading={savingFaq}
        okText="Save"
      >
        <Form form={editForm} layout="vertical" requiredMark={false}>
          <Form.Item
            label={<Text strong>Question</Text>}
            name="question"
            rules={[
              { required: true, message: 'Please Enter The Question' },
              {
                validator: (_rule, value) => {
                  if (!value) return Promise.resolve();
                  const wordCount = countWords(value);
                  if (wordCount < 5) return Promise.reject('Question must contain at least 5 words.');
                  if (wordCount > 30) return Promise.reject('Question must not exceed 30 words.');
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input placeholder="Enter Question" maxLength={200} size="large" className="faqs-modal-input" />
          </Form.Item>

          <WordCount value={editQuestionValue} max={30} />

          <Form.Item
            label={<Text strong>Answer</Text>}
            name="answer"
            rules={[
              { required: true, message: 'Please provide an answer' },
              {
                validator: (_rule, value) => {
                  if (!value) return Promise.resolve();
                  const wordCount = countWords(value);
                  if (wordCount < 10) return Promise.reject('Answer must contain at least 10 words.');
                  if (wordCount > 60) return Promise.reject('Answer must not exceed 60 words.');
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input.TextArea
              placeholder="Describe your Answer"
              maxLength={2000}
              rows={4}
              className="faqs-modal-textarea"
            />
          </Form.Item>

          <WordCount value={editAnswerValue} max={60} />
        </Form>
      </Modal>
    </AdminLayout>
  );
};

export default withAdminAuth(ViewFaqs);