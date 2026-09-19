import React from 'react';
import dayjs from 'dayjs';
import { Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

const contentColumnWidths = {
  title: '38%',
  category: '15%',
  createdAt: '18%',
  createdBy: '17%',
  actions: '12%',
} as const;

const formatContentCreatedAt = (raw?: string): string =>
  dayjs(raw).format('DD/MM/YY');

type ContentListNamespace = 'videos' | 'blogs' | 'faqs';

const MUTED_CLASS: Record<ContentListNamespace, string> = {
  videos: 'videos-cell-muted',
  blogs: 'blogs-cell-muted',
  faqs: 'faqs-cell-text',
};

interface BuildContentColumnsOptions<T> {
  ns: ContentListNamespace;
  titleKey?: string;
  renderTitle: (text: string, record: T) => React.ReactNode;
  renderActions: (record: T) => React.ReactNode;
  renderCategory?: (text: string) => React.ReactNode;
  categoryEllipsis?: boolean;
  renderCreatedBy?: (record: T) => React.ReactNode;
  createdByEllipsis?: boolean;
}

// Shared column layout for the Video/Blog/FAQ list pages: same labels, keys
// and widths; only the per-module cell markup, CSS classes and ellipsis
// behaviour are customised.
export const buildContentColumns = <T,>(
  options: BuildContentColumnsOptions<T>
): ColumnsType<T> => {
  const {
    ns,
    titleKey = 'title',
    renderTitle,
    renderActions,
    renderCategory,
    categoryEllipsis = false,
    renderCreatedBy,
    createdByEllipsis = false,
  } = options;

  const mutedClass = MUTED_CLASS[ns];

  return [
    {
      title: 'Title',
      dataIndex: titleKey,
      key: titleKey,
      width: contentColumnWidths.title,
      render: (text: string, record: T) => renderTitle(text, record),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: contentColumnWidths.category,
      ellipsis: categoryEllipsis,
      render: (text: string) =>
        renderCategory ? (
          renderCategory(text)
        ) : (
          <Text className={mutedClass}>{text}</Text>
        ),
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: contentColumnWidths.createdAt,
      render: (text: string) => (
        <Text className={mutedClass}>{formatContentCreatedAt(text)}</Text>
      ),
    },
    renderCreatedBy
      ? {
          title: 'Created By',
          key: 'createdBy',
          width: contentColumnWidths.createdBy,
          ellipsis: createdByEllipsis,
          render: (_: unknown, record: T) => renderCreatedBy(record),
        }
      : {
          title: 'Created By',
          dataIndex: 'createdBy',
          key: 'createdBy',
          width: contentColumnWidths.createdBy,
          ellipsis: createdByEllipsis,
          render: (text: string) => <Text className={mutedClass}>{text}</Text>,
        },
    {
      title: 'Actions',
      key: 'actions',
      width: contentColumnWidths.actions,
      render: (_: unknown, record: T) => renderActions(record),
    },
  ] as ColumnsType<T>;
};