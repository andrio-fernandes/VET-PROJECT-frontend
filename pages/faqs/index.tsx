import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Typography, Space, Table, Button, App as AntApp, Modal, Select, Form, Input } from 'antd';
import dayjs from 'dayjs';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { api } from '@/services/api';
import { API_ENDPOINTS, CONTENT_MODULES, MODULE_CATEGORIES, type ContentModule, type ContentCategory } from '@/utils/constant';

const { Title, Text } = Typography;

const countWords = (text: string | undefined = ''): number =>
  text.trim() ? text.trim().split(/\s+/).length : 0;

const PAGE_SIZE = 10;

interface FaqRecord {
  _id: string;
  question: string;
  answer: string;
  createdBy?: { fullName?: string; username?: string };
  createdAt: string;
  updatedAt: string;
  module?: string;
  category?: string;
}

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
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (moduleFilter && moduleFilter !== 'All') params.set('module', moduleFilter);
      if (categoryFilter && categoryFilter !== 'All') params.set('category', categoryFilter);

      try {
        const data = await api(`${API_ENDPOINTS.getMyFaqs}?${params.toString()}`);
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
      await api(API_ENDPOINTS.deleteFaq(id), { method: 'DELETE' });
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
      await api(`${API_ENDPOINTS.createFaq}/${editingFaq._id}`, {
        method: 'PUT',
        body: JSON.stringify(values),
      });

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
      render: (text: string) => <Text style={{ color: '#000' }}>{text}</Text>,
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => <Text style={{ color: '#000' }}>{dayjs(text).format('DD MMM YYYY')}</Text>,
    },
    {
      title: 'Created By',
      key: 'createdBy',
      render: (_: unknown, record: FaqRecord) => (
        <Text style={{ color: '#000' }}>{record.createdBy?.fullName || record.createdBy?.username || 'Admin'}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: FaqRecord) => (
        <Space size="middle">
          <Button
            type="text"
            title="View"
            icon={<EyeOutlined style={{ color: '#000', fontSize: '16px' }} />}
            onClick={() => setViewingFaq(record)}
          />
          <Button
            type="text"
            title="Edit"
            icon={<EditOutlined style={{ color: '#000', fontSize: '16px' }} />}
            onClick={() => openEditFaq(record)}
          />
          <Button
            type="text"
            title="Delete"
            icon={<DeleteOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} />}
            onClick={() => showDeleteConfirm(record._id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: '32px 40px 48px' }}>
        <div style={{ maxWidth: 1080 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', backgroundColor: '#52c41a', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24, flexShrink: 0 }}>
              <QuestionCircleOutlined />
            </div>
            <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#262626' }}>
              FAQs
            </Title>
          </div>

          {/* Filters + Create */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <Space size="large" wrap>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong style={{ color: '#262626', fontSize: 14, whiteSpace: 'nowrap' }}>
                  Select Module :
                </Text>
                <Select
                  value={moduleFilter}
                  onChange={(value) => {
                    setModuleFilter(value);
                    setCategoryFilter('All');
                    setPage(1);
                    setLoading(true);
                  }}
                  style={{ width: 180 }}
                  options={[{ value: 'All', label: 'All' }, ...CONTENT_MODULES.map((module) => ({ value: module, label: module }))]}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong style={{ color: '#262626', fontSize: 14, whiteSpace: 'nowrap' }}>
                  Select Categories :
                </Text>
                <Select
                  value={categoryFilter}
                  onChange={(value) => {
                    setCategoryFilter(value);
                    setPage(1);
                    setLoading(true);
                  }}
                  style={{ width: 210 }}
                  disabled={moduleFilter === 'All'}
                  options={categoryOptions}
                />
              </div>
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push('/faqs/create')}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', borderRadius: 6, padding: '0 24px', height: 38, fontWeight: 500 }}
            >
              Create
            </Button>
          </div>

          {/* Table */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8', borderRadius: 16, overflow: 'hidden' }}>
            <Table
              columns={columns}
              dataSource={faqs}
              rowKey="_id"
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
            <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'right', marginTop: 12 }}>
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
        width={680}
      >
        {viewingFaq && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ color: '#52c41a', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Question
              </Text>
              <Text style={{ fontSize: '16px', color: '#262626' }}>{viewingFaq.question}</Text>
            </div>
            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ color: '#52c41a', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Answer
              </Text>
              <Text style={{ fontSize: '15px', color: '#595959', display: 'block', whiteSpace: 'pre-wrap' }}>{viewingFaq.answer}</Text>
            </div>
            <Space size="large" wrap>
              {viewingFaq.module && <Text type="secondary">Module: {viewingFaq.module}</Text>}
              {viewingFaq.category && <Text type="secondary">Category: {viewingFaq.category}</Text>}
              <Text type="secondary">Created: {dayjs(viewingFaq.createdAt).format('DD MMM YYYY')}</Text>
            </Space>
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
            <Input placeholder="Enter Question" maxLength={200} size="large" style={{ borderRadius: '6px' }} />
          </Form.Item>

          <div className="word-counter">
            {countWords(editQuestionValue)}/30
          </div>

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
              style={{ borderRadius: '6px', resize: 'none' }}
            />
          </Form.Item>

          <div className="word-counter">
            {countWords(editAnswerValue)}/60
          </div>
        </Form>
      </Modal>
    </AdminLayout>
  );
};

export default withAdminAuth(ViewFaqs);