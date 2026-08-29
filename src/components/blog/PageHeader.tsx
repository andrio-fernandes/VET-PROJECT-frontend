// =============================================
// BLOG PAGE HEADER
//
// Shared back-button + icon + title/subtitle header used at the top of every
// Blog page (Create / Preview / List).
// =============================================

import React from 'react';
import { Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text } = Typography;

interface PageHeaderProps {
  backHref: string;
  backOnClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconSize?: 'md' | 'lg';
  showBack?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  backHref,
  backOnClick,
  title,
  subtitle,
  icon,
  iconSize = 'md',
  showBack = true,
}) => {
  return (
    <div className="blog-page-header">
      {showBack && (
        <Link href={backHref} onClick={backOnClick}>
          <Button type="text" icon={<ArrowLeftOutlined />} style={{ marginTop: 6, fontSize: 18 }} />
        </Link>
      )}
        <div className="blog-page-header-body">
          <div style={{ flex: 1 }}>
            <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#262626' }}>
              {title}
            </Title>
            {subtitle && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                {subtitle}
              </Text>
            )}
          </div>
          {icon && (
            <div className={`blog-page-header-icon${iconSize === 'lg' ? ' lg' : ''}`}>{icon}</div>
          )}
        </div>
    </div>
  );
};
