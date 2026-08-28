// =============================================
// BLOG SIDEBAR
//
// Shared vertical sidebar for the Blog feature (Create / Preview / List).
// - Active nav highlighting per page.
// - When `onNavigate` is provided, nav clicks are intercepted and forwarded
//   (used by the Create page to run its unsaved-draft guard).
// - Optional admin profile card with logout (used by Preview / List).
// =============================================

import React from 'react';
import { Avatar, Button, Divider, Typography } from 'antd';
import {
  FileTextOutlined,
  HomeOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import Image from 'next/image';
import Link from 'next/link';

import { ROUTE_PATHS } from '@/utils/constant';
import { useAdminProfile } from '@/hooks/useAdminProfile';

const { Text } = Typography;

const NAV_ITEMS = [
  { key: 'dashboard', icon: <HomeOutlined />, label: 'Dashboard', path: ROUTE_PATHS.adminDashboard },
  { key: 'videos', icon: <PlayCircleOutlined />, label: 'Videos', path: ROUTE_PATHS.videos },
  { key: 'blog', icon: <FileTextOutlined />, label: 'Blog', path: ROUTE_PATHS.blogs },
  { key: 'faqs', icon: <QuestionCircleOutlined />, label: 'FAQs', path: '/faqs/create' },
];

interface BlogSidebarProps {
  activeKey?: string;
  /** When provided, nav clicks are intercepted and forwarded to this callback. */
  onNavigate?: (path: string) => void;
  /** Show the admin profile card + logout button at the bottom. */
  showProfile?: boolean;
}

export const BlogSidebar: React.FC<BlogSidebarProps> = ({
  activeKey = 'blog',
  onNavigate,
  showProfile = false,
}) => {
  const { email, logout } = useAdminProfile();

  return (
    <aside className="blog-sidebar">
      <div className="blog-sidebar-logo">
        <Image
          src="/logo.jpg"
          alt="Sharp Minds Cloud Tech Pvt Ltd"
          width={210}
          height={64}
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>

      <Divider className="blog-sidebar-divider" />

      <nav className="blog-sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const active = item.key === activeKey;
          const linkProps = onNavigate
            ? {
                onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
                  event.preventDefault();
                  if (!active) onNavigate(item.path);
                },
              }
            : {};
          return (
            <Link
              key={item.key}
              href={item.path}
              className={`blog-sidebar-nav-item${active ? ' active' : ''}`}
              {...linkProps}
            >
              <span className="blog-sidebar-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {showProfile && (
        <div className="blog-sidebar-profile">
          <div className="blog-sidebar-profile-inner">
            <Avatar
              size={64}
              icon={<UserOutlined style={{ color: '#000' }} />}
              className="blog-sidebar-profile-avatar"
            />
            <div style={{ lineHeight: 1.2 }}>
              <Text strong style={{ color: '#ffffff', fontSize: 16, display: 'block' }}>
                Admin
              </Text>
              <Text style={{ color: '#ffffff', fontSize: 12 }}>{email}</Text>
            </div>
          </div>
          <Button type="primary" className="blog-sidebar-logout" onClick={logout}>
            Log out
          </Button>
        </div>
      )}
    </aside>
  );
};
