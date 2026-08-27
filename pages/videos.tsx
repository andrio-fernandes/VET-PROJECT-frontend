import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Button, Col, Modal, Row, Select, Table, Typography } from 'antd';
import {
  PlayCircleOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '../src/components/layouts/admin-layout';
import { withAdminAuth } from '../src/components/auth/with-admin-auth';

const { Title, Text } = Typography;

interface Video {
  key: string;
  title: string;
  uploadDate: string;
  module: string;
  feature: string;
}

const MODULE_OPTIONS = [
  { label: 'All', value: 'All' },
  { label: 'Sales', value: 'Sales' },
];

const FEATURE_OPTIONS = [
  { label: 'All', value: 'All' },
  { label: 'Inquiry', value: 'Inquiry' },
  { label: 'Quotation', value: 'Quotation' },
  { label: 'Customer Order', value: 'Customer Order' },
];

const SAMPLE_VIDEOS: Video[] = [
  { key: '1', title: 'Quotation', uploadDate: '15 Aug 2026', module: 'Sales', feature: 'Quotation' },
  { key: '2', title: 'What is inquiry', uploadDate: '15 Aug 2026', module: 'Sales', feature: 'Inquiry' },
  { key: '3', title: 'What is customer order', uploadDate: '15 Aug 2026', module: 'Sales', feature: 'Customer Order' },
];

const Thumbnail = () => (
  <div className="video-thumb">
    <PlayCircleOutlined />
  </div>
);

const Videos = () => {
  const router = useRouter();
  const [module, setModule] = useState('All');
  const [feature, setFeature] = useState('All');
  const [preview, setPreview] = useState<Video | null>(null);

  const videos = useMemo(
    () =>
      SAMPLE_VIDEOS.filter(
        (v) =>
          (module === 'All' || v.module === module) &&
          (feature === 'All' || v.feature === feature)
      ),
    [module, feature]
  );

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => (
        <div className="video-title-cell">
          <Thumbnail />
          <Text strong className="video-title-text">
            {text}
          </Text>
        </div>
      ),
    },
    {
      title: 'Upload date',
      dataIndex: 'uploadDate',
      key: 'uploadDate',
      render: (text: string) => <Text className="video-date">{text}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: Video) => (
        <div className="video-actions">
          <Button
            className="video-action-btn"
            icon={<EyeOutlined />}
            onClick={() => setPreview(record)}
            aria-label="View"
          />
          <Button
            className="video-action-btn"
            icon={<EditOutlined />}
            onClick={() => {
              window.history.back();
            }}
            aria-label="Edit"
          />
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="videos-page">
        {/* Header */}
        <div className="videos-header">
          <div className="videos-header-icon">
            <PlayCircleOutlined />
          </div>
          <Title level={1} className="videos-heading">
            Videos
          </Title>
        </div>

        {/* Main card */}
        <div className="videos-card">
          <div className="videos-card-top">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="videos-create-btn"
              onClick={() => router.push('/upload-video')}
            >
              Create
            </Button>
          </div>

          {/* Filters */}
          <Row gutter={24} className="videos-filters">
            <Col xs={24} lg={12}>
              <div className="video-filter">
                <Text className="video-filter-label">Select module :</Text>
                <Select
                  value={module}
                  onChange={setModule}
                  options={MODULE_OPTIONS}
                  className="video-filter-select"
                  popupMatchSelectWidth={false}
                />
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <div className="video-filter">
                <Text className="video-filter-label">Select Feature :</Text>
                <Select
                  value={feature}
                  onChange={setFeature}
                  options={FEATURE_OPTIONS}
                  className="video-filter-select"
                  popupMatchSelectWidth={false}
                />
              </div>
            </Col>
          </Row>

          <div className="videos-divider" />

          {/* Table */}
          <Table
            columns={columns}
            dataSource={videos}
            pagination={false}
            rowKey="key"
            className="videos-table"
          />
        </div>
      </div>

      {/* Preview modal */}
      <Modal
        title="Video Preview"
        open={Boolean(preview)}
        onCancel={() => setPreview(null)}
        footer={null}
        width={520}
      >
        {preview && (
          <div className="video-preview">
            <div className="video-preview-thumb">
              <PlayCircleOutlined />
            </div>
            <div className="video-preview-meta">
              <Text strong className="video-preview-title">
                {preview.title}
              </Text>
              <Text className="video-preview-sub">
                {preview.module} • {preview.feature}
              </Text>
              <Text className="video-preview-sub">Uploaded: {preview.uploadDate}</Text>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
};

export default withAdminAuth(Videos);
