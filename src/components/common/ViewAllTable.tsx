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

import React, { useState } from 'react';
import { Button, Input, Modal, Select, Table, Typography } from 'antd';
import { FilterOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { useModuleCategories } from '@/hooks/useModuleCategories';
import type { ColumnsType } from 'antd/es/table';
import PageLoading from '@/components/common/PageLoading';

const { Title, Text } = Typography;

interface ViewAllTableProps<T> {
  ns: string;
  title: string;
  icon: React.ReactNode;
  createHref: string;
  createLabel?: string;
  hideCreateButton?: boolean;
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
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export function ViewAllTable<T>({
  ns,
  title,
  icon,
  createHref,
  createLabel = 'Create',
  hideCreateButton = false,
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
  searchQuery = '',
  onSearchChange,
}: ViewAllTableProps<T>) {
  const router = useRouter();
  const { modules, categories } = useModuleCategories();
  const [filterOpen, setFilterOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [tempModule, setTempModule] = useState(moduleFilter);
  const [tempCategory, setTempCategory] = useState(categoryFilter);

  const noun = countNoun ?? title.toLowerCase();

  const categoryOptions = tempModule === 'All'
    ? []
    : [
        { value: 'All', label: 'All' },
        ...(categories[tempModule] ?? []).map((category: string) => ({ value: category, label: category })),
      ];

  const handleSearch = () => {
    onSearchChange?.(localSearch.trim());
  };

  const handleFilterApply = () => {
    setLocalSearch('');
    onSearchChange?.('');
    onModuleChange(tempModule);
    onCategoryChange(tempCategory);
    setFilterOpen(false);
  };

  const handleFilterClear = () => {
    setTempModule('All');
    setTempCategory('All');
    onModuleChange('All');
    onCategoryChange('All');
    setFilterOpen(false);
  };

  return (
    <div className={pageClassName ?? `${ns}-page-pad`}>
      <div className={innerClassName ?? `${ns}-page-inner`}>
        <div className={`${ns}-header`}>
          <div className={`${ns}-header-title-wrap`}>
            <div className={`${ns}-header-icon`}>{icon}</div>
            <Title level={3} className={`${ns}-header-title`}>
              {title}
            </Title>
          </div>
        </div>

        <div className={`${ns}-filters-row`}>
          <div className={`${ns}-search-bar`}>
            <Input
              className={`${ns}-search-input`}
              placeholder="Search by title, category..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onPressEnter={handleSearch}
              maxLength={100}
              allowClear
              onClear={() => {
                setLocalSearch('');
                onSearchChange?.('');
              }}
            />
            <Button
              className={`${ns}-filter-btn`}
              icon={<FilterOutlined />}
              onClick={() => {
                setTempModule(moduleFilter);
                setTempCategory(categoryFilter);
                setFilterOpen(true);
              }}
            >
              Filter
            </Button>
          </div>

          <div className={`${ns}-create-wrap`}>
            {!hideCreateButton && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push(createHref)}
                className={`${ns}-create-btn`}
              >
                {createLabel}
              </Button>
            )}
          </div>
        </div>

        <div className={`${ns}-table-wrap`}>
          {loading && <PageLoading />}
          <Table<T>
            rowKey={rowKey}
            columns={columns}
            dataSource={dataSource}
            loading={false}
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

      {/* FILTER MODAL */}
      <Modal
        title="Filters"
        open={filterOpen}
        onCancel={() => setFilterOpen(false)}
        width={420}
        centered
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleFilterClear}>Cancel</Button>
            <Button
              type="primary"
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              onClick={handleFilterApply}
            >
              Filter
            </Button>
          </div>
        }
      >
        <div className={`${ns}-filter-form`}>
          <div className={`${ns}-filter-field`}>
            <label className={`${ns}-filter-label`}>Module</label>
            <Select
              className={`${ns}-filter-select`}
              value={tempModule}
              onChange={(val) => {
                setTempModule(val);
                setTempCategory('All');
              }}
              options={[{ value: 'All', label: 'All' }, ...modules.map((m) => ({ value: m, label: m }))]}
            />
          </div>
          <div className={`${ns}-filter-field`}>
            <label className={`${ns}-filter-label`}>Category</label>
            <Select
              className={`${ns}-filter-select`}
              value={tempCategory}
              onChange={setTempCategory}
              disabled={tempModule === 'All'}
              options={categoryOptions}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
