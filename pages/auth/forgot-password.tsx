import { useState } from "react";
import { Button, Card, Flex, Form, Input, Typography, App as AntApp } from "antd";
import { useRouter } from "next/router";

import { api } from "@/services/api";
import { emailRules } from "@/utils/validation";
import { API_ENDPOINTS, ROUTE_PATHS, STORAGE_KEYS } from "@/utils/constant";

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string }) => {
    setLoading(true);
    try {
      const email = values.email.toLowerCase().trim();

      await api(API_ENDPOINTS.forgotPassword, {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      sessionStorage.setItem(STORAGE_KEYS.resetEmail, email);
      message.success("OTP sent to your email address.");
      setTimeout(() => router.push(ROUTE_PATHS.otp), 600);
    } catch (error: any) {
      message.error(error.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex justify="center" align="center" className="auth-page">
      <Card className="auth-card">
        <Title level={2} className="auth-card-title">
          Forgot Your Password?
        </Title>

        <Text type="secondary" className="auth-card-description">
          Enter your registered email address, and we&apos;ll send you an OTP to reset your password.
        </Text>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Email" name="email" rules={emailRules}>
            <Input placeholder="Enter your email" allowClear size="large" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={loading} disabled={loading}>
            SEND OTP
          </Button>
        </Form>
      </Card>
    </Flex>
  );
}
