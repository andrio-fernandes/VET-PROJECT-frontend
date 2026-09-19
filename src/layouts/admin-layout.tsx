import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Badge, Layout, Menu, Typography, Avatar, ConfigProvider } from 'antd';
import {
  FileTextOutlined,
  HomeOutlined,
  LogoutOutlined,
  MessageOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';

import { clearSession, useCurrentUser } from '@/hooks/use-auth';
import { ROUTE_PATHS } from '@/constants';
import { getFeedbackCount } from '@/services/feedback-service';
import { clearBlogs } from '@/redux/blog/blog-slice';
import { clearDashboard } from '@/redux/dashboard/dashboard-slice';
import { useAppDispatch } from '@/redux/hooks';

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
  const dispatch = useAppDispatch();
  const userEmail = user?.email || '';
  const [feedbackCount, setFeedbackCount] = useState(0);

  // Unread feedback badge. Refreshed on mount, whenever the admin lands on
  // the feedback page (where they mark items read), and on any in-page status
  // update broadcast by the feedback page.
  useEffect(() => {
    const loadCount = () => {
      getFeedbackCount()
        .then((count) => setFeedbackCount(count))
        .catch(() => {
          // Badge is best-effort; a failed fetch just leaves the last value.
        });
    };
    loadCount();
    window.addEventListener('feedback:count-changed', loadCount);
    return () => {
      window.removeEventListener('feedback:count-changed', loadCount);
    };
  }, [router.pathname]);

  const handleLogout = () => {
    dispatch(clearBlogs());
    dispatch(clearDashboard());
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
              <Text strong style={{ fontSize: '14px', display: 'block' }}>{user?.fullName || user?.username || 'Admin'}</Text>
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
                className="lively-sidebar"
                mode="inline"
                selectedKeys={[activeKey]}
                onClick={(e) => (onNavigate ? onNavigate(e.key) : router.push(e.key))}
                items={[
                  { key: ROUTE_PATHS.adminDashboard, icon: <HomeOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 600 }}>Dashboard</span> },
                  { key: '/videos', icon: <VideoCameraOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 500 }}>Video</span> },
                  { key: '/blogs', icon: <FileTextOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 500 }}>Blog</span> },
                  { key: '/faqs', icon: <QuestionCircleOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 500 }}>FAQs</span> },
                  {
                    key: ROUTE_PATHS.feedback,
                    icon: <MessageOutlined style={{ fontSize: '18px' }} />,
                    label: (
                      <span style={{ fontSize: '15px', fontWeight: 500 }}>
                        Feedback
                        {feedbackCount > 0 && (
                          <Badge count={feedbackCount} size="small" style={{ marginInlineStart: 8 }} />
                        )}
                      </span>
                    ),
                  },
                ]}
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
        <Content className="admin-content">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};
