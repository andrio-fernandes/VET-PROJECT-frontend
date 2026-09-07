import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, Form, Input, Typography, App as AntApp } from "antd";
import { useRouter } from "next/router";

import { resetPassword } from "@/services/authService";
import { passwordRules } from "@/utils/validation";
import { clearSession } from "@/hooks/useAuth";
import { ROUTE_PATHS, STORAGE_KEYS, PASSWORD_VALIDATOR_RULES } from "@/constants";
import { clearResetFlow } from "@/utils/resetFlow";
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
  const [submitted, setSubmitted] = useState(false);

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

      // Wipe the flow (email, token, OTP flags) and any active login. After
      // this the reset token is single-use and consumed, and the fresh
      // password takes over.
      clearResetFlow();
      clearSession();
      message.success("Password reset successful!");
      setTimeout(() => router.push(ROUTE_PATHS.login), 600);
    } catch (error: any) {
      if (error?.code === "RATE_LIMITED") {
        message.error(error.message || "Too many requests. Please try again later.");
        clearResetFlow();
        setTimeout(() => router.replace(ROUTE_PATHS.login), 1000);
      } else {
        message.error(error.message || "Failed to reset password. Please try again.");
      }
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

        <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={() => setSubmitted(true)} validateTrigger={submitted ? 'onChange' : 'onSubmit'}>
          <Form.Item
            label={<Text strong>New Password</Text>}
            name="password"
            required
            rules={[...passwordRules, ...PASSWORD_VALIDATOR_RULES]}
            extra={<PasswordStrength password={password || ""} />}
          >
            <Input.Password size="large" placeholder="Enter new password" onKeyDown={preventSpaces} />
          </Form.Item>

          <Form.Item
            label={<Text strong>Confirm Password</Text>}
            name="confirmPassword"
            required
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
