import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Layout, Menu, Button, Typography, Avatar, ConfigProvider } from 'antd';
import {
  FileTextOutlined,
  HomeOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';

import { clearSession, useCurrentUser } from '@/hooks/useAuth';
import { ROUTE_PATHS } from '@/constants';

const { Sider, Content } = Layout;
const { Text } = Typography;

interface AdminLayoutProps {
  children: React.ReactNode;
  /** When provided, sidebar menu clicks route through this callback instead of router.push. */
  onNavigate?: (path: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, onNavigate }) => {
  const router = useRouter();
  const user = useCurrentUser();
  const userEmail = user?.email || '';

  const handleLogout = () => {
    clearSession();
    router.replace(ROUTE_PATHS.login);
  };

  const activeKey = router.pathname.startsWith('/blog')
    ? '/blogs'
    : router.pathname.includes('/faq')
      ? '/faqs'
      : router.pathname.startsWith('/videos')
        ? '/videos'
        : router.pathname;

  return (
    <Layout className="admin-shell">
      <Sider width={250} className="admin-sider">
        <div className="admin-sider-column">

          <div className="admin-logo-block">
            <Image
              src="/logo.jpg"
              alt="Sharp Minds Logo"
              width={160}
              height={80}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>

          <div className="admin-nav">
            <ConfigProvider
              theme={{
                components: {
                  Menu: {
                    itemSelectedBg: 'rgba(255, 255, 255, 0.25)',
                    itemSelectedColor: '#fff',
                    itemColor: '#fff',
                    itemHoverColor: '#fff',
                    itemHoverBg: 'transparent',
                  },
                },
              }}
            >
              <Menu
                className="lively-sidebar"
                mode="inline"
                selectedKeys={[activeKey]}
                onClick={(e) => (onNavigate ? onNavigate(e.key) : router.push(e.key))}
                items={[
                  { key: ROUTE_PATHS.adminDashboard, icon: <HomeOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 600 }}>Dashboard</span> },
                  { key: '/videos', icon: <VideoCameraOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 500 }}>Video</span> },
                  { key: '/blogs', icon: <FileTextOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 500 }}>Blog</span> },
                  { key: '/faqs', icon: <QuestionCircleOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 500 }}>FAQs</span> },
                ]}
              />
            </ConfigProvider>
          </div>

          <div className="admin-profile-card">
            <div className="admin-profile-inner">
              <Avatar size={64} icon={<UserOutlined style={{ color: '#000' }} />} style={{ backgroundColor: 'transparent', border: '2px solid #000', marginBottom: '8px' }} />
              <div style={{ lineHeight: '1.2' }}>
                <Text strong style={{ color: '#fff', fontSize: '16px', display: 'block' }}>Admin</Text>
                <Text style={{ color: '#fff', fontSize: '12px' }}>{userEmail}</Text>
              </div>
            </div>
            <Button type="primary" onClick={handleLogout} style={{ width: '100%', backgroundColor: '#2e7d32', borderColor: '#2e7d32', borderRadius: '6px' }}>Log out</Button>
          </div>

        </div>
      </Sider>

      <Layout>
        <Content className="admin-content">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};
