import { useState, useSyncExternalStore } from "react";
import { Button, Form, Input, Typography, App as AntApp } from "antd";
import { useRouter } from "next/router";

import { forgotPassword } from "@/services/authService";
import { emailRules } from "@/utils/validation";
import { MAX_OTP_ATTEMPTS, OTP_REQUEST_WINDOW_SECONDS, ROUTE_PATHS, STORAGE_KEYS } from "@/constants";
import AuthCard from "@/components/AuthCard";

const { Title, Text } = Typography;

const emptySubscribe = () => () => {};

// Mirror the server's rolling request window: once it lapses the quota is
// considered fresh again instead of staying exhausted forever.
const readSendAttempts = () => {
  const storedAttempts = Number(sessionStorage.getItem(STORAGE_KEYS.resetOtpAttempts)) || 0;
  const windowStart = Number(sessionStorage.getItem(STORAGE_KEYS.resetOtpWindowStart)) || 0;
  const withinRequestWindow =
    windowStart > 0 && Date.now() - windowStart < OTP_REQUEST_WINDOW_SECONDS * 1000;

  return withinRequestWindow ? storedAttempts : 0;
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);

  const otpAttempts = useSyncExternalStore(
    emptySubscribe,
    readSendAttempts,
    () => 0,
  );

  const onFinish = async (values: { email: string }) => {
    setLoading(true);
    try {
      const email = values.email.toLowerCase().trim();

      const data = await forgotPassword(email);

      // Session storage is the source of truth so the attempt counter survives
      // navigation between the forgot-password and OTP pages. A different
      // email, or a lapsed request window, starts a fresh count.
      const now = Date.now();
      const previousWindowStart = Number(sessionStorage.getItem(STORAGE_KEYS.resetOtpWindowStart));
      const withinRequestWindow =
        previousWindowStart > 0 && now - previousWindowStart < OTP_REQUEST_WINDOW_SECONDS * 1000;
      const isNewResetFlow = sessionStorage.getItem(STORAGE_KEYS.resetEmail) !== email;
      const previousAttempts = Number(sessionStorage.getItem(STORAGE_KEYS.resetOtpAttempts)) || 0;
      // Prefer the authoritative count returned by the server (it also counts
      // requests made from other devices/sessions); fall back to +1 locally.
      const nextAttempt =
        typeof data?.otpRequestsRemaining === "number"
          ? Math.max(MAX_OTP_ATTEMPTS - data.otpRequestsRemaining, 0)
          : isNewResetFlow || !withinRequestWindow
            ? 1
            : previousAttempts + 1;

      sessionStorage.setItem(STORAGE_KEYS.resetEmail, email);
      sessionStorage.setItem(STORAGE_KEYS.resetOtpAttempts, String(nextAttempt));
      if (isNewResetFlow || !withinRequestWindow) {
        sessionStorage.setItem(STORAGE_KEYS.resetOtpWindowStart, String(now));
      }
      // Send time lets the OTP page restore the true remaining countdown
      // after a refresh instead of restarting it.
      sessionStorage.setItem(STORAGE_KEYS.resetOtpSentAt, String(now));

      message.success("OTP sent to your email address.");
      setTimeout(() => router.push(ROUTE_PATHS.otp), 600);
    } catch (error: any) {
      message.error(error.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const attemptsRemaining = Math.max(MAX_OTP_ATTEMPTS - otpAttempts, 0);

  return (
    <AuthCard>
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

          {otpAttempts > 0 && (
            <Text type="danger" className="forgot-otp-attempts">
              {attemptsRemaining > 0
                ? `${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining`
                : "No attempts remaining. Please try again later."}
            </Text>
          )}

          <Button type="primary" htmlType="submit" block size="large" loading={loading} disabled={loading}>
            SEND OTP
          </Button>
        </Form>
    </AuthCard>
  );
}
