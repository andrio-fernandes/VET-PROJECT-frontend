/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useRouter } from "next/router";
import {
  AppstoreOutlined,
  BookOutlined,
  FileTextOutlined,
  HomeOutlined,
  LogoutOutlined,
  MoreOutlined,
  PlayCircleFilled,
  QuestionCircleOutlined,
  SearchOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { App as AntApp, Button, Card, Col, Divider, Flex, Input, Layout, Menu, Row, Typography } from "antd";

import videoThumbnail from "@/assets/default.jpg";
import { clearSession, useCurrentUser } from "@/hooks/useAuth";

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const sidebarMenuItems = [
  { key: "dashboard", icon: <HomeOutlined />, label: "Dashboard" },
  { key: "categories", icon: <AppstoreOutlined />, label: "Categories" },
  { key: "bookmarks", icon: <BookOutlined />, label: "Bookmarks" },
];

const quickActionLabels = ["Create Quotation", "Customer Management", "Enquiry Process", "Sales Order"];

const categoryItems = [
  { icon: <VideoCameraOutlined />, label: "Video" },
  { icon: <FileTextOutlined />, label: "Blog" },
  { icon: <QuestionCircleOutlined />, label: "FAQs" },
];

export default function UserDashboardPage() {
  const router = useRouter();
  const { message } = AntApp.useApp();
  const [selectedMenu, setSelectedMenu] = useState("dashboard");

  const user = useCurrentUser();

  const handleLogout = () => {
    clearSession();
    router.push("/auth/login");
  };

  const handleSendMessage = () => {
    message.success("Message sent successfully!");
  };

  return (
    <Layout className="dashboard-page">
      <Sider width={278} className="dashboard-sider">
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[selectedMenu]}
          items={sidebarMenuItems}
          onClick={({ key }) => setSelectedMenu(key)}
          className="dashboard-menu"
        />
      </Sider>

      <Layout className="dashboard-main-layout">
        <Header className="dashboard-header">
          <Text strong>Welcome, {user?.username || "User"}!</Text>
          <Flex align="center" gap={4}>
            <Button type="text" icon={<UserOutlined />} size="large" />
            <Button type="text" icon={<LogoutOutlined />} size="large" onClick={handleLogout} />
          </Flex>
        </Header>

        <Content className="dashboard-content">
          <Flex vertical align="center" style={{ textAlign: "center" }}>
            <Title level={2}>What would you like to learn?</Title>

            <Input
              className="dashboard-search"
              prefix={<SearchOutlined />}
              placeholder="search..."
              size="large"
            />

            <Flex justify="center" wrap gap={10} style={{ marginTop: 16 }}>
              {quickActionLabels.map((label) => (
                <Button
                  key={label}
                  type="primary"
                  style={{ borderRadius: 15, height: 28, fontSize: 11 }}
                >
                  {label}
                </Button>
              ))}
            </Flex>
          </Flex>

          <Card className="continue-card">
            <Flex align="center" gap={16}>
              <div className="continue-thumbnail">
                <img src={videoThumbnail.src} alt="Continue learning" />
                <span className="thumbnail-play">
                  <PlayCircleFilled />
                </span>
              </div>

              <Flex vertical className="continue-details">
                <Title level={5}>Continue learning</Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  Description: a clear breakdown of the item name, quantity, and unit price for goods or services.
                </Paragraph>
              </Flex>

              <Button type="primary" ghost icon={<PlayCircleFilled />} className="continue-button">
                Continue
              </Button>
            </Flex>
          </Card>

          <Row gutter={[30, 30]} className="category-section">
            {["Enquiry", "Customer Order", "Quotation"].map((title) => (
              <Col span={8} key={title}>
                <Card className="category-card">
                  <Title level={4} className="category-card-title">
                    {title}
                  </Title>
                  <Flex vertical gap={8} className="category-inner">
                    {categoryItems.map((item) => (
                      <Flex key={item.label} align="center" gap={9}>
                        {item.icon}
                        <Text>{item.label}</Text>
                      </Flex>
                    ))}
                  </Flex>
                </Card>
              </Col>
            ))}
          </Row>

          <Flex vertical className="bookmark-section">
            <Title level={4} className="bookmark-heading">
              Book mark
            </Title>

            <Card className="bookmark-wrapper">
              <Title level={5}>Video</Title>
              <Card className="bookmark-video-card">
                <div className="bookmark-thumbnail">
                  <img src={videoThumbnail.src} alt="Quotation" />
                  <span className="thumbnail-play">
                    <PlayCircleFilled />
                  </span>
                </div>
                <Flex vertical className="bookmark-video-content">
                  <Title level={5}>Quotation</Title>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Description: a clear breakdown of the item name, quantity, and unit price for goods or services.
                  </Paragraph>
                </Flex>
                <Button type="text" icon={<MoreOutlined />} />
              </Card>

              <Divider />

              <Title level={5}>Blog</Title>
              <Card className="bookmark-text-card">
                <Flex vertical flex="auto">
                  <Title level={5}>Quotation</Title>
                  <Paragraph>
                    Hey! Looking for top blogger quotes to inspire you as you work on your....
                  </Paragraph>
                </Flex>
                <Button type="text" icon={<MoreOutlined />} />
              </Card>

              <Divider />

              <Title level={5}>FAQs</Title>
              <Card className="bookmark-text-card">
                <Flex align="center" flex="auto">
                  <Text strong>How to quote a question example?</Text>
                </Flex>
                <Button type="text" icon={<MoreOutlined />} />
              </Card>
            </Card>
          </Flex>

          <Flex vertical gap={22} className="contact-section">
            <Flex vertical gap={8}>
              <Text strong>Username</Text>
              <Input placeholder="Username" size="large" defaultValue={user?.username || ""} />
            </Flex>

            <Flex vertical gap={8}>
              <Text strong>Email</Text>
              <Input placeholder="Email" size="large" defaultValue={user?.email || ""} />
            </Flex>

            <Flex vertical gap={8}>
              <Text strong>Message</Text>
              <Input.TextArea rows={4} placeholder="Message" />
            </Flex>

            <Button
              type="primary"
              block
              size="large"
              style={{ height: 42, borderRadius: 7 }}
              onClick={handleSendMessage}
            >
              Send Message
            </Button>
          </Flex>
        </Content>
      </Layout>
    </Layout>
  );
}