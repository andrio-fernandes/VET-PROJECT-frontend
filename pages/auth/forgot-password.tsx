import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, Form, Input, Typography, App as AntApp } from "antd";
import { useRouter } from "next/router";

import { forgotPassword } from "@/services/authService";
import { emailRules } from "@/utils/validation";
import { MAX_OTP_ATTEMPTS, OTP_REQUEST_WINDOW_SECONDS, ROUTE_PATHS, STORAGE_KEYS } from "@/constants";
import AuthCard from "@/components/AuthCard";
import PageLoading from "@/components/common/PageLoading";
import { emptySubscribe } from "@/utils/input";
import { isResetFlowActive, markResetFlowActive, clearResetFlow } from "@/utils/resetFlow";

const { Title, Text } = Typography;

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
  const [submitted, setSubmitted] = useState(false);

  const otpAttempts = useSyncExternalStore(
    emptySubscribe,
    readSendAttempts,
    () => 0,
  );

// A brand-new visit to Forgot Password (e.g. typed URL, fresh tab, or after a
// flow completed) starts a clean slate, so state from a previous capture on
// this device never leaks into the new flow. But if the user pressed browser
// Back from the OTP page, an active flow is still in progress and its state
// must NOT be wiped - only clear on a genuinely new visit.
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

      // Session storage is the source of truth so the attempt counter survives
      // navigation between the forgot-password and OTP pages. A different
      // email, or a lapsed request window, starts a fresh count.
      const now = Date.now();
      // An in-progress reset flow now exists; the OTP and reset-password pages
      // rely on it, and a browser Back here must not wipe it.
      markResetFlowActive();
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
      // The single-use reset token is returned by the server (not emailed) and
      // lets the user go straight to the OTP page. A re-send mints a new token,
      // so any token cached from a previous flow is stale and is replaced below.
      if (typeof data?.token === "string" && data.token) {
        sessionStorage.setItem(STORAGE_KEYS.resetToken, data.token);
      }
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerified);
      // A re-send starts a fresh verification budget on the OTP page even if a
      // previous flow for another email left burn-down behind.
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerifyAttempts);
      sessionStorage.setItem(STORAGE_KEYS.resetOtpAttempts, String(nextAttempt));
      if (isNewResetFlow || !withinRequestWindow) {
        sessionStorage.setItem(STORAGE_KEYS.resetOtpWindowStart, String(now));
      }
      // Send time lets the OTP page restore the true remaining countdown
      // after a refresh instead of restarting it.
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
