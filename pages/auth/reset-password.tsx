import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, Form, Input, Typography, App as AntApp } from "antd";
import { useRouter } from "next/router";

import { resetPassword } from "@/services/authService";
import { passwordRules } from "@/utils/validation";
import { clearSession } from "@/hooks/useAuth";
import { ROUTE_PATHS, STORAGE_KEYS } from "@/constants";
import PasswordStrength from "@/components/password-strength";
import AuthCard from "@/components/AuthCard";
import { preventSpaces, emptySubscribe } from "@/utils/input";
import type { ResetPasswordFormValues } from "@/types/auth";

const { Title, Text } = Typography;

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
      Boolean(sessionStorage.getItem(STORAGE_KEYS.resetToken)) &&
      sessionStorage.getItem(STORAGE_KEYS.resetOtpVerified) === "true",
    () => false,
  );

  // Guard the page on initial load only. After a successful reset we clear
  // sessionStorage which flips canAccess to false; must not treat that as a
  // "session expired" interruption in the middle of navigation.
  useEffect(() => {
    if (canAccess) {
      return;
    }
    message.error("Session expired. Please start over from Forgot Password.");
    router.replace(ROUTE_PATHS.forgotPassword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFinish = async (values: ResetPasswordFormValues) => {
    const email = sessionStorage.getItem(STORAGE_KEYS.resetEmail);
    const token = sessionStorage.getItem(STORAGE_KEYS.resetToken);

    if (!email || !token) {
      message.error("Session expired. Please start over from Forgot Password.");
      router.replace(ROUTE_PATHS.forgotPassword);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, token, values.password);

      sessionStorage.removeItem(STORAGE_KEYS.resetEmail);
      sessionStorage.removeItem(STORAGE_KEYS.resetToken);
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerified);
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpAttempts);
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerifyAttempts);
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpWindowStart);
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpSentAt);
      clearSession();
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
    <AuthCard>
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
    </AuthCard>
  );
}
