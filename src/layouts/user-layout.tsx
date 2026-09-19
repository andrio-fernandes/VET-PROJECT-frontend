import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Layout, Menu, Typography, Avatar, ConfigProvider } from 'antd';
import {
  FileTextOutlined,
  HomeOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';

import { clearSession, useCurrentUser } from '@/hooks/use-auth';
import { ROUTE_PATHS } from '@/constants';
import { clearBlogs } from '@/redux/blog/blog-slice';
import { clearDashboard } from '@/redux/dashboard/dashboard-slice';
import { useAppDispatch } from '@/redux/hooks';

const { Sider, Content } = Layout;
const { Text } = Typography;

interface UserLayoutProps {
  children: React.ReactNode;
  activeKey?: string;
}

export const UserLayout: React.FC<UserLayoutProps> = ({ children, activeKey = 'dashboard' }) => {
  const router = useRouter();
  const user = useCurrentUser();
  const dispatch = useAppDispatch();
  const userEmail = user?.email || '';

  const handleLogout = () => {
    dispatch(clearBlogs());
    dispatch(clearDashboard());
    clearSession();
    router.replace(ROUTE_PATHS.login);
  };

  const onNavigate = (key: string) => {
    router.push(key);
  };

  const sidebarMenuItems = [
    { key: ROUTE_PATHS.userDashboard, icon: <HomeOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 600 }}>Dashboard</span> },
    { key: ROUTE_PATHS.userVideos, icon: <VideoCameraOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 500 }}>Video</span> },
    { key: ROUTE_PATHS.userBlogs, icon: <FileTextOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 500 }}>Blog</span> },
    { key: ROUTE_PATHS.userFaqs, icon: <QuestionCircleOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 500 }}>FAQs</span> },
  ];

  return (
    <Layout className="user-shell">
      <Sider width={278} className="user-sider">
        <div className="admin-sider-column">
          <div
            className="admin-profile-header"
            style={{ cursor: 'pointer' }}
            onClick={() => router.push(ROUTE_PATHS.profile)}
          >
            <Avatar
              size={64}
              src={user?.avatar || undefined}
              icon={<UserOutlined style={{ color: '#000' }} />}
              style={{ backgroundColor: 'transparent', border: '2px solid #000', marginBottom: '8px' }}
            />
            <div>
              <Text strong style={{ fontSize: '14px', display: 'block' }}>{user?.fullName || user?.username || 'User'}</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>{userEmail}</Text>
            </div>
          </div>

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
                    itemSelectedBg: '#54b325',
                    itemSelectedColor: '#fff',
                    itemColor: '#333',
                    itemHoverColor: '#333',
                    itemHoverBg: '#54b325',
                  },
                },
              }}
            >
              <Menu
                className="user-lively-sidebar"
                mode="inline"
                selectedKeys={[activeKey]}
                items={sidebarMenuItems}
                onClick={({ key }) => onNavigate(key)}
              />
            </ConfigProvider>
          </div>

          <div className="admin-logout">
            <ConfigProvider
              theme={{
                components: {
                  Menu: {
                    itemSelectedBg: '#54b325',
                    itemSelectedColor: '#fff',
                    itemColor: '#333',
                    itemHoverColor: '#333',
                    itemHoverBg: '#54b325',
                  },
                },
              }}
            >
              <Menu
                mode="inline"
                style={{ backgroundColor: 'transparent', borderRight: 'none' }}
                onClick={handleLogout}
                items={[
                  {
                    key: 'logout',
                    icon: <span style={{ fontSize: '18px' }}><LogoutOutlined /></span>,
                    label: <span style={{ fontSize: '15px', fontWeight: 500 }}>Logout</span>,
                  },
                ]}
              />
            </ConfigProvider>
          </div>
        </div>
      </Sider>

      <Layout>
        <Content className="user-content-layout">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};