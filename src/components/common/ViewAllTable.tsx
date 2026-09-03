// =============================================
// REUSABLE "VIEW-ALL" TABLE PAGE SHELL
//
// Encapsulates the shared header / create-button / filter / table / count
// skeleton used by the FAQ, Video and Blog view-all pages. Business logic
// (data fetching, delete/confirm, view/edit modals) stays in the calling
// page; this component only renders the layout shell.
//
// CSS comes from the shared _view-all.scss mixin (@include view-all($ns)).
// =============================================

import React from 'react';
import { Button, Col, Row, Select, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { CONTENT_MODULES, MODULE_CATEGORIES, type ContentCategory, type ContentModule } from '@/constants';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface ViewAllTableProps<T> {
  ns: string;
  title: string;
  icon: React.ReactNode;
  createHref: string;
  createLabel?: string;
  columns: ColumnsType<T>;
  dataSource: T[];
  rowKey: string | ((record: T) => string);
  loading: boolean;
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  emptyText?: string;
  countNoun?: string;
  moduleFilter: string;
  categoryFilter: string;
  onModuleChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  tableLayout?: 'auto' | 'fixed';
  pageClassName?: string;
  innerClassName?: string;
  showCount?: boolean;
  extra?: React.ReactNode;
}

export function ViewAllTable<T>({
  ns,
  title,
  icon,
  createHref,
  createLabel = 'Create',
  columns,
  dataSource,
  rowKey,
  loading,
  total,
  page,
  onPageChange,
  pageSize = 10,
  emptyText,
  countNoun,
  moduleFilter,
  categoryFilter,
  onModuleChange,
  onCategoryChange,
  tableLayout = 'auto',
  pageClassName,
  innerClassName,
  showCount = true,
  extra,
}: ViewAllTableProps<T>) {
  const router = useRouter();

  const noun = countNoun ?? title.toLowerCase();

  const categoryOptions = moduleFilter === 'All'
    ? []
    : [
        { value: 'All', label: 'All' },
        ...(MODULE_CATEGORIES[moduleFilter as ContentModule] ?? []).map((category: ContentCategory) => ({ value: category, label: category })),
      ];

  return (
    <div className={pageClassName ?? `${ns}-page-pad`}>
      <div className={innerClassName ?? `${ns}-page-inner`}>
        <div className={`${ns}-header`}>
          <div className={`${ns}-header-icon`}>{icon}</div>
          <Title level={3} className={`${ns}-header-title`}>
            {title}
          </Title>
        </div>

        <div className={`${ns}-create-wrap`}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push(createHref)}
            className={`${ns}-create-btn`}
          >
            {createLabel}
          </Button>
        </div>

        <Row gutter={24} className={`${ns}-filters`}>
          <Col span={12}>
            <div className={`${ns}-filter-group`}>
              <Text strong className={`${ns}-filter-label`}>
                Select module:
              </Text>
              <Select
                value={moduleFilter}
                onChange={onModuleChange}
                className={`${ns}-select-module`}
                options={[{ value: 'All', label: 'All' }, ...CONTENT_MODULES.map((module) => ({ value: module, label: module }))]}
              />
            </div>
          </Col>
          <Col span={12}>
            <div className={`${ns}-filter-group`}>
              <Text strong className={`${ns}-filter-label`}>
                Select Category:
              </Text>
              <Select
                value={categoryFilter}
                onChange={onCategoryChange}
                disabled={moduleFilter === 'All'}
                options={categoryOptions}
                className={`${ns}-select-category`}
              />
            </div>
          </Col>
        </Row>

        <div className={`${ns}-table-wrap`}>
          <Table<T>
            rowKey={rowKey}
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            tableLayout={tableLayout}
            locale={{ emptyText: emptyText ?? 'No records uploaded yet.' }}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: onPageChange,
              showSizeChanger: false,
            }}
          />
          {showCount && !loading && total > 0 && (
            <Text type="secondary" className={`${ns}-count-text`}>
              Showing {dataSource.length} of {total} {noun}
            </Text>
          )}
        </div>

        {extra}
      </div>
    </div>
  );
}
