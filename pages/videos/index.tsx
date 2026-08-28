import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Button, Col, Row, Select, Table, Typography } from 'antd';
import {
  PlayCircleOutlined,
  PlusOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { withAdminAuth } from '@/components/auth/with-admin-auth';

const { Title, Text } = Typography;

interface Video {
  key: string;
  title: string;
  createdDate: string;
  createdBy: string;
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
  { key: '1', title: 'Quotation', createdDate: '15 Aug 2026', createdBy: 'Admin', module: 'Sales', feature: 'Quotation' },
  { key: '2', title: 'What is inquiry', createdDate: '15 Aug 2026', createdBy: 'Admin', module: 'Sales', feature: 'Inquiry' },
  { key: '3', title: 'What is customer order', createdDate: '15 Aug 2026', createdBy: 'Admin', module: 'Sales', feature: 'Customer Order' },
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
      title: 'Created date',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (text: string) => <Text className="video-date">{text}</Text>,
    },
    {
      title: 'Created by',
      dataIndex: 'createdBy',
      key: 'createdBy',
      render: (text: string) => <Text className="video-date">{text}</Text>,
    },
    {
      title: 'Edit',
      key: 'edit',
      width: 140,
      render: () => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => {
            window.history.back();
          }}
        >
          Edit
        </Button>
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
              onClick={() => router.push('/videos/create')}
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
    </AdminLayout>
  );
};

export default withAdminAuth(Videos);
