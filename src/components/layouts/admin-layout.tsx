import React, { useSyncExternalStore } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  Layout,
  Menu,
  Button,
  Typography,
  Avatar,
  ConfigProvider,
} from "antd";
import {
  HomeOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import Cookies from "js-cookie";

import {
  AUTH_TOKEN_KEY,
  ROUTE_PATHS,
  REFRESH_TOKEN_KEY,
  TOKEN_KEY,
  USER_KEY,
} from "@/utils/constant";

const { Sider, Content } = Layout;
const { Text } = Typography;

interface AdminLayoutProps {
  children: React.ReactNode;
}

const emptySubscribe = () => () => {};

const readUserEmail = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw)?.email || "" : "";
  } catch {
    return "";
  }
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const router = useRouter();

  const userEmail = useSyncExternalStore(
    emptySubscribe,
    readUserEmail,
    () => ""
  );

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    Cookies.remove(AUTH_TOKEN_KEY);
    router.replace(ROUTE_PATHS.login);
  };

  const activeKey = router.pathname.includes("videos") ||
    router.pathname.includes("upload-video")
    ? "/videos"
    : router.pathname.includes("blog")
    ? "/upload-blog"
    : router.pathname.includes("faq")
    ? "/create-faq"
    : router.pathname;

  return (
    <Layout className="admin-layout">
      <Sider
        width={270}
        theme="light"
        className="admin-sidebar"
      >
        <div className="admin-sidebar-content">

          <div className="admin-logo">
            <Image
              src="/logo.jpg"
              alt="Sharp Minds Logo"
              width={150}
              height={80}
              priority
            />
          </div>

          <div className="admin-navigation">
            <Text className="menu-title">
              MAIN MENU
            </Text>

            <ConfigProvider
              theme={{
                components: {
                  Menu: {
                    itemSelectedBg: "#52c41a",
                    itemSelectedColor: "#fff",
                    itemColor: "#222",
                    itemHoverColor: "#52c41a",
                    itemHoverBg: "#f6ffed",
                    itemBorderRadius: 8,
                  },
                },
              }}
            >
              <Menu
                mode="inline"
                selectedKeys={[activeKey]}
                onClick={({ key }) => router.push(key)}
                items={[
                  {
                    key: ROUTE_PATHS.adminDashboard,
                    icon: <HomeOutlined />,
                    label: "Dashboard",
                  },
                  {
                    key: ROUTE_PATHS.videos,
                    icon: <PlayCircleOutlined />,
                    label: "Videos",
                  },
                  {
                    key: "/upload-blog",
                    icon: <FileTextOutlined />,
                    label: "Blogs",
                  },
                  {
                    key: "/create-faq",
                    icon: <QuestionCircleOutlined />,
                    label: "FAQs",
                  },
                ]}
              />
            </ConfigProvider>
          </div>

          <div className="admin-profile">
            <Avatar
              size={58}
              icon={<UserOutlined />}
            />

            <Text strong>Admin</Text>

            {userEmail && (
              <Text className="admin-email">
                {userEmail}
              </Text>
            )}

            <Button
              type="primary"
              onClick={logout}
              block
            >
              Log out
            </Button>
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