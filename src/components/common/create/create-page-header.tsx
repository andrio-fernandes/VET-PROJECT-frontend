// =============================================
// CREATE PAGE HEADER
//
// Shared header used by the Video / FAQ / Blog create (and edit) pages: an
// optional back button, then the title/subtitle with an optional icon. Each
// page passes its own wrapper classes so the rendered markup stays identical
// to what its stylesheet expects.
// =============================================

import React from 'react';
import { Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text } = Typography;

interface CreatePageHeaderProps {
  title: string;
  wrapperClassName?: string;
  bodyClassName?: string;
  titleClassName?: string;
  titleStyle?: React.CSSProperties;
  subtitle?: string;
  subtitleStyle?: React.CSSProperties;
  showBack?: boolean;
  backHref?: string;
  backOnClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  icon?: React.ReactNode;
  iconSize?: 'md' | 'lg';
  /** Wrap the title/subtitle in an extra inner div (Blog layout). Defaults to
   * true when a subtitle or icon is present, so Video/FAQ headers keep their
   * Title as a direct child of the body div. */
  innerWrap?: boolean;
}

export const CreatePageHeader: React.FC<CreatePageHeaderProps> = ({
  title,
  wrapperClassName,
  bodyClassName,
  titleClassName,
  titleStyle,
  subtitle,
  subtitleStyle,
  showBack = false,
  backHref,
  backOnClick,
  icon,
  iconSize = 'md',
  innerWrap,
}) => {
  const wrapTitle = innerWrap || Boolean(subtitle || icon);
  const titleNode = (
    <Title level={3} className={titleClassName} style={titleStyle}>
      {title}
    </Title>
  );

  return (
    <div className={wrapperClassName}>
      {showBack && (
        <Link href={backHref || '#'} onClick={backOnClick}>
          <Button
            style={{
              marginTop: 2,
              fontSize: 14,
              height: 34,
              padding: '0 16px',
              borderRadius: 8,
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Back
          </Button>
        </Link>
      )}
      <div className={bodyClassName}>
        {wrapTitle ? (
          <div>
            {titleNode}
            {subtitle && (
              <Text type="secondary" style={subtitleStyle}>
                {subtitle}
              </Text>
            )}
          </div>
        ) : (
          titleNode
        )}
        {icon && (
          <div className={`blog-page-header-icon${iconSize === 'lg' ? ' lg' : ''}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};