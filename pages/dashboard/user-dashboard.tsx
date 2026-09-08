/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import {
  PlayCircleFilled,
  SearchOutlined,
} from "@ant-design/icons";
import {
  App as AntApp,
  Button,
  Card,
  Flex,
  Input,
  Typography,
} from "antd";

import videoThumbnail from "@/assets/default.jpg";
import { UserLayout } from "@/layouts/UserLayout";
import { ROUTE_PATHS } from "@/constants";

const { Title, Text, Paragraph } = Typography;

export default function UserDashboardPage() {
  const { message } = AntApp.useApp();

  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackEmailTouched, setFeedbackEmailTouched] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isEmailValid = isValidEmail(feedbackEmail);
  const showEmailError = feedbackEmailTouched && !isEmailValid && feedbackEmail.length > 0;

  const handleSendMessage = () => {
    message.success("Message sent successfully!");
  };

  return (
    <UserLayout activeKey={ROUTE_PATHS.userDashboard}>
      <div className="user-dashboard-page">
        <div className="user-dashboard-header">
          <Text strong style={{ fontSize: "18px" }}>Welcome, User!</Text>
        </div>

        <div style={{ padding: "24px 32px" }}>
          <div style={{ background: "#fff", borderRadius: 8, padding: 24 }}>
            {/* Search and Quick Actions */}
            <Flex vertical align="center" style={{ textAlign: "center", marginBottom: 24 }}>
              <Title level={2}>What would you like to learn?</Title>
              <Input className="user-dashboard-search" prefix={<SearchOutlined />} placeholder="search..." size="large" />
            </Flex>

            {/* Continue Learning Card */}
            <Card className="user-continue-card">
              <Flex align="center" gap={16}>
                <div className="user-continue-thumbnail">
                  <img src={videoThumbnail.src} alt="Continue learning" />
                  <span className="user-thumbnail-play"><PlayCircleFilled /></span>
                </div>
                <Flex vertical style={{ flex: 1 }}>
                  <Title level={4} style={{ fontWeight: 700, marginBottom: 4 }}>Continue learning</Title>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Description: a clear breakdown of the item name, quantity, and unit price for goods or services.
                  </Paragraph>
                </Flex>
                <Button type="primary" ghost icon={<PlayCircleFilled />} style={{ borderRadius: 6 }}>Continue</Button>
              </Flex>
            </Card>

            {/* Feedback Form */}
            <Flex id="feedback" vertical align="center" gap={16} style={{ marginTop: 48, marginBottom: 40 }}>
              <Title level={2} style={{ color: "#52c41a", marginBottom: 0, fontWeight: 700 }}>Have a Question or Feedback?</Title>
              <Paragraph style={{ textAlign: "center", marginBottom: 24, color: "#000", fontSize: "18px", fontWeight: 600, maxWidth: 600 }}>
                Have a doubt, suggestion, or feedback? Share it with us. Your input helps us improve your learning experience.
              </Paragraph>
              <Flex vertical gap={24} style={{ width: "100%", maxWidth: 600 }}>
                <Flex vertical gap={8}>
                  <Text strong style={{ fontSize: "16px" }}>Email</Text>
                  <Input size="large" value={feedbackEmail} onChange={(e) => setFeedbackEmail(e.target.value)} onBlur={() => setFeedbackEmailTouched(true)} status={showEmailError ? "error" : undefined} />
                  {showEmailError && <Text type="danger" style={{ fontSize: 13 }}>Please enter a valid email address</Text>}
                </Flex>
                <Flex vertical gap={8}>
                  <Text strong style={{ fontSize: "16px" }}>Message</Text>
                  <Input.TextArea rows={5} value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)} />
                </Flex>
                <Button type="primary" disabled={!isEmailValid || !feedbackMessage.trim()} style={{ width: 160, height: 42, borderRadius: 8, backgroundColor: "#52c41a", borderColor: "#52c41a", fontWeight: 600, fontSize: "15px" }} onClick={handleSendMessage}>
                  Send
                </Button>
              </Flex>
            </Flex>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}