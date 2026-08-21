import { useEffect, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Button, Card, Flex, Form, Input, Typography, App as AntApp } from "antd";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

import { api } from "@/services/api";
import { passwordRules } from "@/utils/validation";
import { API_ENDPOINTS, AUTH_TOKEN_KEY, ROUTE_PATHS, STORAGE_KEYS, TOKEN_KEY, USER_KEY } from "@/utils/constant";
import PasswordStrength from "@/components/password-strength";

const { Title, Text } = Typography;

const emptySubscribe = () => () => {};

interface ResetPasswordFormValues {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [form] = Form.useForm<ResetPasswordFormValues>();
  const password = Form.useWatch("password", form);
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);

  const canAccess = useSyncExternalStore(
    emptySubscribe,
    () =>
      Boolean(sessionStorage.getItem(STORAGE_KEYS.resetEmail)) &&
      Boolean(sessionStorage.getItem(STORAGE_KEYS.resetOtp)),
    () => false,
  );

  const preventSpaces = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " ") e.preventDefault();
  };

  useEffect(() => {
    if (!canAccess) {
      router.replace(ROUTE_PATHS.forgotPassword);
      message.error("Session expired. Please start over from Forgot Password.");
    }
  }, [canAccess, router, message]);

  const onFinish = async (values: ResetPasswordFormValues) => {
    const email = sessionStorage.getItem(STORAGE_KEYS.resetEmail);
    const otp = sessionStorage.getItem(STORAGE_KEYS.resetOtp);

    if (!email || !otp) {
      message.error("Session expired. Please start over from Forgot Password.");
      router.replace(ROUTE_PATHS.forgotPassword);
      return;
    }

    setLoading(true);
    try {
      await api(API_ENDPOINTS.resetPassword, {
        method: "POST",
        body: JSON.stringify({ email, otp, newPassword: values.password }),
      });

      sessionStorage.removeItem(STORAGE_KEYS.resetEmail);
      sessionStorage.removeItem(STORAGE_KEYS.resetOtp);
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpAttempts);
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerifyAttempts);
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpWindowStart);
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpSentAt);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      Cookies.remove(AUTH_TOKEN_KEY);
      message.success("Password reset successful!");
      setTimeout(() => router.push(ROUTE_PATHS.login), 600);
    } catch (error: any) {
      message.error(error.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!canAccess) {
    return null;
  }

  return (
    <Flex justify="center" align="center" className="auth-page">
      <Card className="auth-card">
        <Title level={3} className="auth-card-title">
          Reset Password
        </Title>

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label={<Text strong>New Password</Text>}
            name="password"
            rules={passwordRules}
            extra={<PasswordStrength password={password || ""} />}
          >
            <Input.Password size="large" placeholder="Enter new password" onKeyDown={preventSpaces} />
          </Form.Item>

          <Form.Item
            label={<Text strong>Confirm Password</Text>}
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              {
                required: true,
                message: "Please confirm your password.",
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match."));
                },
              }),
            ]}
          >
            <Input.Password size="large" placeholder="Confirm password" onKeyDown={preventSpaces} />
          </Form.Item>

          <Form.Item className="reset-confirm-form-item">
            <Button type="primary" htmlType="submit" block size="large" loading={loading} disabled={loading}>
              Confirm
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Flex>
  );
}
