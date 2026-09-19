import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, Form, Input, Typography, App as AntApp } from "antd";
import { useRouter } from "next/router";

import { forgotPassword } from "@/services/auth-service";
import { emailRules } from "@/utils/validation";
import { MAX_OTP_ATTEMPTS, OTP_REQUEST_WINDOW_SECONDS, ROUTE_PATHS, STORAGE_KEYS } from "@/constants";
import AuthCard from "@/components/auth-card";
import PageLoading from "@/components/common/page-loading";
import { emptySubscribe } from "@/utils/input";
import { isResetFlowActive, markResetFlowActive, clearResetFlow } from "@/utils/reset-flow";

const { Title, Text } = Typography;

// Mirror server's rolling request window for quota reset.
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
  const [submitted, setSubmitted] = useState(false);

  const otpAttempts = useSyncExternalStore(
    emptySubscribe,
    readSendAttempts,
    () => 0,
  );

// Clear state on new visit, but preserve active flow on browser Back.
useEffect(() => {
  if (isResetFlowActive()) {
    return;
  }
  clearResetFlow();
}, []);

  const onFinish = async (values: { email: string }) => {
    setLoading(true);
    try {
      const email = values.email.toLowerCase().trim();
      setSubmitted(true);

      const data = await forgotPassword(email);

      // Session storage is source of truth for attempt counter across pages.
      const now = Date.now();
      // Mark reset flow active; OTP/reset pages rely on it.
      markResetFlowActive();
      const previousWindowStart = Number(sessionStorage.getItem(STORAGE_KEYS.resetOtpWindowStart));
      const withinRequestWindow =
        previousWindowStart > 0 && now - previousWindowStart < OTP_REQUEST_WINDOW_SECONDS * 1000;
      const isNewResetFlow = sessionStorage.getItem(STORAGE_KEYS.resetEmail) !== email;
      const previousAttempts = Number(sessionStorage.getItem(STORAGE_KEYS.resetOtpAttempts)) || 0;
      // Prefer server's authoritative count, fallback to +1 locally.
      const nextAttempt =
        typeof data?.otpRequestsRemaining === "number"
          ? Math.max(MAX_OTP_ATTEMPTS - data.otpRequestsRemaining, 0)
          : isNewResetFlow || !withinRequestWindow
            ? 1
            : previousAttempts + 1;

      sessionStorage.setItem(STORAGE_KEYS.resetEmail, email);
      // Store server-returned reset token (re-send mints new token).
      if (typeof data?.token === "string" && data.token) {
        sessionStorage.setItem(STORAGE_KEYS.resetToken, data.token);
      }
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerified);
      // Reset verification budget for new send.
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerifyAttempts);
      sessionStorage.setItem(STORAGE_KEYS.resetOtpAttempts, String(nextAttempt));
      if (isNewResetFlow || !withinRequestWindow) {
        sessionStorage.setItem(STORAGE_KEYS.resetOtpWindowStart, String(now));
      }
      // Store send time for OTP page countdown restoration.
      sessionStorage.setItem(STORAGE_KEYS.resetOtpSentAt, String(now));

      message.success(
        "If an account exists for this email, an OTP has been sent to your inbox.",
      );
      setTimeout(() => router.push(ROUTE_PATHS.otp), 600);
    } catch (error: any) {
      if (error?.code === "RATE_LIMITED") {
        message.error(error.message || "Too many requests. Please try again later.");
        clearResetFlow();
        setTimeout(() => router.replace(ROUTE_PATHS.login), 1000);
      } else {
        message.error(error.message || "Failed to send OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const attemptsRemaining = Math.max(MAX_OTP_ATTEMPTS - otpAttempts, 0);

  return (
    <AuthCard>
        {loading && <PageLoading />}
        <Title level={2} className="auth-card-title">
          Forgot Your Password?
        </Title>

        <Text type="secondary" className="auth-card-description">
          Enter your registered email address, and we&apos;ll send you an OTP to reset your password.
        </Text>

        <Form layout="vertical" onFinish={onFinish} validateTrigger="onSubmit">
          <Form.Item label="Email" name="email" required rules={emailRules}>
            <Input placeholder="Enter your email" allowClear size="large" />
          </Form.Item>

          <Text type="warning" style={{ display: "block", textAlign: "center", fontSize: 12, marginTop: -8, marginBottom: 16 }}>
            Note: Your email will be blocked for 15 minutes after 5 failed attempts.
          </Text>

          {submitted && otpAttempts > 0 && (
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
