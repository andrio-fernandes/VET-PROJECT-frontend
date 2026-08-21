import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Layout, Menu, Button, Typography, Avatar, ConfigProvider } from 'antd';
import { 
  HomeOutlined, 
  PlayCircleOutlined, 
  FormOutlined, 
  QuestionCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../redux/slices/auth-slice';
import { RootState } from '../../redux/store';

const { Sider, Content } = Layout;
const { Text } = Typography;

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const router = useRouter(); 
  const dispatch = useDispatch();
  const userEmail = useSelector((state: RootState) => state.auth.userEmail);

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  const activeKey = router.pathname.includes('/faq') ? '/upload-faq' : router.pathname;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <style>{`
        .lively-sidebar .ant-menu-item {
          transition: all 0.3s ease;
          border-radius: 8px;
          margin-bottom: 4px;
        }
        .lively-sidebar .ant-menu-item:hover {
          transform: translateX(6px);
          background-color: rgba(255, 255, 255, 0.15) !important;
        }
      `}</style>

      <Sider width={250} style={{ backgroundColor: '#52c41a' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#fff', 
            margin: '15px', 
            borderRadius: '4px', 
            border: '1px solid #e8e8e8', 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center' 
          }}>
            <Image 
              src="/logo.jpg" 
              alt="Sharp Minds Logo" 
              width={160} 
              height={80} 
              style={{ objectFit: 'contain' }}
              priority 
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', marginTop: '10px', padding: '0 10px' }}>
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
                onClick={(e) => router.push(e.key)} 
                style={{ backgroundColor: 'transparent', borderRight: 'none' }}
                items={[
                  { key: '/dashboard', icon: <HomeOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 600 }}>Dashboard</span> },
                  { key: '/videos', icon: <PlayCircleOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 500 }}>Videos</span> },
                  { key: '/blog', icon: <FormOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 500 }}>Blog</span> },
                  { key: '/upload-faq', icon: <QuestionCircleOutlined style={{ fontSize: '18px' }} />, label: <span style={{ fontSize: '15px', fontWeight: 500 }}>FAQs</span> },
                ]}
              />
            </ConfigProvider>
          </div>

          <div style={{ margin: '15px', padding: '20px', textAlign: 'center', border: '1px solid #388e3c', borderRadius: '12px', backgroundColor: '#4caf50' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: '15px' }}>
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
        <Content style={{ padding: '24px', backgroundColor: '#fff' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};