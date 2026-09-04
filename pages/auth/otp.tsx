import { App, Button, Flex, Typography } from "antd";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { forgotPassword, verifyOtp } from "@/services/authService";
import { MAX_OTP_ATTEMPTS, OTP_EXPIRY_SECONDS, OTP_LENGTH, OTP_REQUEST_WINDOW_SECONDS, ROUTE_PATHS, STORAGE_KEYS } from "@/constants";
import AuthCard from "@/components/AuthCard";
import OtpInput, { type OtpInputHandle } from "@/components/OtpInput";
import { emptySubscribe } from "@/utils/input";

const { Text } = Typography;

export default function OtpVerificationPage() {
  const router = useRouter();
  const { message } = App.useApp();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timeLeft, setTimeLeft] = useState<number>(OTP_EXPIRY_SECONDS);
  const [attempts, setAttempts] = useState<number>(() => {
    if (typeof window === "undefined") {
      return 0;
    }
    return Number(sessionStorage.getItem(STORAGE_KEYS.resetOtpVerifyAttempts)) || 0;
  });
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);

  const queryEmail =
    typeof router.query.email === "string" ? router.query.email.trim().toLowerCase() : "";
  const queryToken =
    typeof router.query.token === "string" ? router.query.token.trim() : "";

  const canAccess = useSyncExternalStore(
    emptySubscribe,
    () =>
      (queryEmail !== "" && queryToken !== "") ||
      (Boolean(sessionStorage.getItem(STORAGE_KEYS.resetEmail)) &&
        Boolean(sessionStorage.getItem(STORAGE_KEYS.resetToken))),
    () => false,
  );

  const otpInputRef = useRef<OtpInputHandle>(null);
  const lastSubmitTime = useRef<number>(0);

  const expired = timeLeft <= 0;
  const verificationBlocked = attempts >= MAX_OTP_ATTEMPTS;

  // Origin from the emailed reset link: seed sessionStorage so the page works
  // like a normal in-flow visit without leaking the email/token into the URL.
  useEffect(() => {
    if (!router.isReady || queryEmail === "" || queryToken === "") {
      return;
    }

    sessionStorage.setItem(STORAGE_KEYS.resetEmail, queryEmail);
    sessionStorage.setItem(STORAGE_KEYS.resetToken, queryToken);
    router.replace(ROUTE_PATHS.otp, undefined, { shallow: true });
  }, [queryEmail, queryToken, router, router.isReady]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    if (canAccess) {
      return;
    }
    message.error("Session expired. Please start over from Forgot Password.");
    router.replace(ROUTE_PATHS.forgotPassword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  // The countdown targets an absolute deadline timestamp so a single
  // interval computes the remaining seconds instead of being torn down and
  // recreated every second. Initialized to 0 and set inside an effect (NOT
  // during render) so no impure Date.now() call happens while rendering.
  const deadlineRef = useRef<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(
        Math.max(Math.ceil((deadlineRef.current - Date.now()) / 1000), 0)
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Align the countdown with the actual send time so refreshing the page does
  // not restart the timer while the server-side OTP is already older. When no
  // stored send time exists, fall back to now so the timer still starts fresh.
  useEffect(() => {
    const sentAt = Number(sessionStorage.getItem(STORAGE_KEYS.resetOtpSentAt));
    deadlineRef.current = (sentAt || Date.now()) + OTP_EXPIRY_SECONDS * 1000;
    setTimeLeft(
      Math.max(Math.ceil((deadlineRef.current - Date.now()) / 1000), 0)
    );
  }, []);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const handleVerify = async () => {
    const now = Date.now();

    if (now - lastSubmitTime.current < 1000) {
      return;
    }

    lastSubmitTime.current = now;

    if (attempts >= MAX_OTP_ATTEMPTS) {
      message.error("Maximum verification attempts reached.");
      return;
    }

    if (expired || timeLeft <= 0) {
      message.error("Your OTP has expired. Please request a new OTP.");
      return;
    }
    const otpValue = otp.join("");

    if (!otpValue) {
      message.error("Please enter your OTP.");
      otpInputRef.current?.focusFirst();
      return;
    }

    if (otpValue.length !== OTP_LENGTH) {
      message.error("OTP must contain exactly 6 digits.");
      return;
    }

    if (!/^\d{6}$/.test(otpValue)) {
      message.error("OTP must contain numbers only.");
      return;
    }

    const email = sessionStorage.getItem(STORAGE_KEYS.resetEmail);
    const token = sessionStorage.getItem(STORAGE_KEYS.resetToken);

    if (!email || !token) {
      message.error("Session expired. Please start over from Forgot Password.");
      router.push(ROUTE_PATHS.forgotPassword);
      return;
    }

    setIsVerifying(true);

    try {
      await verifyOtp(email, otpValue, token);

      sessionStorage.setItem(STORAGE_KEYS.resetOtpVerified, "true");
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerifyAttempts);
      // The reset token is kept: it must be presented again at reset-password.
      message.success("OTP verified successfully.");
      router.push(ROUTE_PATHS.resetPassword);
    } catch (error: any) {
      // Only the server knows the real attempt count, so sync from its
      // "remaining" value and never guess locally when it is absent.
      let currentAttempts = attempts;
      if (typeof error?.remaining === "number") {
        currentAttempts = Math.max(MAX_OTP_ATTEMPTS - error.remaining, 0);
        setAttempts(currentAttempts);
        sessionStorage.setItem(
          STORAGE_KEYS.resetOtpVerifyAttempts,
          String(currentAttempts)
        );
      }
      setOtp(Array(OTP_LENGTH).fill(""));
      otpInputRef.current?.focusFirst();

      if (currentAttempts >= MAX_OTP_ATTEMPTS) {
        message.error("Maximum attempts reached. Verification is blocked.");
      } else {
        const remaining = MAX_OTP_ATTEMPTS - currentAttempts;
        message.error(error.message || `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (isResending) {
      return;
    }

    const email = sessionStorage.getItem(STORAGE_KEYS.resetEmail);

    if (!email) {
      message.error("Session expired. Please start over from Forgot Password.");
      router.push(ROUTE_PATHS.forgotPassword);
      return;
    }

    setIsResending(true);

    try {
      const data = await forgotPassword(email);

      // A re-send mints a brand new OTP and reset token that are only
      // delivered through the new email link, so the current link is
      // invalidated. Clear local state and send the user back so they use
      // the freshly emailed link.
      sessionStorage.removeItem(STORAGE_KEYS.resetToken);
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerifyAttempts);
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerified);

      // The server is the source of truth for how many send requests were
      // consumed. Fall back to the local mirror only when it does not report.
      const now = Date.now();
      const windowStart = Number(sessionStorage.getItem(STORAGE_KEYS.resetOtpWindowStart));
      const withinRequestWindow =
        windowStart > 0 && now - windowStart < OTP_REQUEST_WINDOW_SECONDS * 1000;
      const sendAttempts =
        typeof data?.otpRequestsRemaining === "number"
          ? Math.max(MAX_OTP_ATTEMPTS - data.otpRequestsRemaining, 0)
          : withinRequestWindow
            ? (Number(sessionStorage.getItem(STORAGE_KEYS.resetOtpAttempts)) || 0) + 1
            : 1;
      sessionStorage.setItem(STORAGE_KEYS.resetOtpAttempts, String(sendAttempts));
      if (!withinRequestWindow) {
        sessionStorage.setItem(STORAGE_KEYS.resetOtpWindowStart, String(now));
      }
      sessionStorage.setItem(STORAGE_KEYS.resetOtpSentAt, String(now));

      message.success(
        "A new OTP has been sent. Please use the new link from your email."
      );
      setTimeout(() => router.replace(ROUTE_PATHS.forgotPassword), 600);
    } catch (error: any) {
      message.error(error.message || "Failed to resend OTP. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  if (!canAccess) {
    return null;
  }

  return (
    <AuthCard>
        <Flex vertical align="center">
          <Text strong className="auth-card-title">
            Enter Your OTP
          </Text>

          <Text type="secondary" className="auth-card-description">
            Enter the 6-digit OTP sent to your registered email address.
          </Text>

          <OtpInput
            ref={otpInputRef}
            value={otp}
            disabled={verificationBlocked || expired || isVerifying}
            onChange={setOtp}
          />

          {!expired ? (
            <Text className="otp-timer">
              OTP expires in <Text strong type="success">{formatTime(timeLeft)}</Text>
            </Text>
          ) : (
            <Text type="danger" className="otp-timer">
              OTP has expired.
            </Text>
          )}

          {attempts > 0 && !verificationBlocked && (
            <Text type="warning" className="otp-timer">
              {MAX_OTP_ATTEMPTS - attempts} attempt{MAX_OTP_ATTEMPTS - attempts === 1 ? "" : "s"} remaining
            </Text>
          )}

          {verificationBlocked && (
            <Text type="danger" className="otp-timer">
              Maximum attempts reached. Verification has been blocked.
            </Text>
          )}

          <Button
            type="primary"
            block
            loading={isVerifying}
            disabled={verificationBlocked || expired || isResending}
            onClick={handleVerify}
            size="large"
          >
            {isVerifying ? "VERIFYING..." : "VERIFY"}
          </Button>

          <Button
            type="link"
            block
            disabled={isResending || isVerifying || !expired}
            onClick={handleResend}
            style={{ marginTop: 18 }}
          >
            {isResending ? "Sending..." : expired ? "Resend OTP" : `Resend OTP in ${formatTime(timeLeft)}`}
          </Button>

          <Button type="link" block onClick={() => router.push(ROUTE_PATHS.forgotPassword)}>
            ← Back
          </Button>
        </Flex>
    </AuthCard>
  );
}
