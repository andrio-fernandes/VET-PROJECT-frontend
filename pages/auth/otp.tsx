import { App, Button, Flex, Typography } from "antd";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { forgotPassword, verifyOtp } from "@/services/auth-service";
import { MAX_OTP_ATTEMPTS, OTP_EXPIRY_SECONDS, OTP_LENGTH, OTP_REQUEST_WINDOW_SECONDS, ROUTE_PATHS, STORAGE_KEYS } from "@/constants";
import AuthCard from "@/components/auth-card";
import PageLoading from "@/components/common/page-loading";
import OtpInput, { type OtpInputHandle } from "@/components/otp-input";
import { emptySubscribe } from "@/utils/input";
import { clearResetFlow } from "@/utils/reset-flow";

const { Text } = Typography;

const readSendAttempts = () => {
  const storedAttempts = Number(sessionStorage.getItem(STORAGE_KEYS.resetOtpAttempts)) || 0;
  const windowStart = Number(sessionStorage.getItem(STORAGE_KEYS.resetOtpWindowStart)) || 0;
  const withinRequestWindow =
    windowStart > 0 && Date.now() - windowStart < OTP_REQUEST_WINDOW_SECONDS * 1000;

  return withinRequestWindow ? storedAttempts : 0;
};

export default function OtpVerificationPage() {
  const router = useRouter();
  const { message } = App.useApp();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timeLeft, setTimeLeft] = useState<number>(OTP_EXPIRY_SECONDS);
  // Hydrated from sessionStorage in an effect (not useState initializer)
  // to avoid hydration mismatch with server-rendered markup.
  const [attempts, setAttempts] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);

  // Only email is required — gating on the token would leak account existence
  // through navigation (registered → OTP, unregistered → bounced back).
  // A missing token surfaces through the generic verify/resend error instead.
  const canAccess = useSyncExternalStore(
    emptySubscribe,
    () => Boolean(sessionStorage.getItem(STORAGE_KEYS.resetEmail)),
    () => false,
  );

  const sendAttempts = useSyncExternalStore(
    emptySubscribe,
    readSendAttempts,
    () => 0,
  );

  const otpInputRef = useRef<OtpInputHandle>(null);
  const lastSubmitTime = useRef<number>(0);

  const expired = timeLeft <= 0;
  const verificationBlocked = attempts >= MAX_OTP_ATTEMPTS;

  // Resend only available after OTP expires (server supports it anytime, but
  // blocking until expiry avoids mid-session token rotation confusion).
  const canResend = expired && sendAttempts < MAX_OTP_ATTEMPTS;

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

  // If attempts are exhausted from a previous visit, the user stays here —
  // Resend lets them request a fresh OTP (resets server-side counter).

  // Restore exhausted attempt count after refresh. Deferred via microtask to
  // avoid calling setState synchronously in the effect body.
  useEffect(() => {
    const stored =
      Number(sessionStorage.getItem(STORAGE_KEYS.resetOtpVerifyAttempts)) || 0;
    if (stored > 0) {
      queueMicrotask(() => {
        setAttempts(stored);
      });
    }
  }, []);

  // Countdown targets an absolute deadline so a single interval computes
  // remaining seconds. Deadline aligns with actual send time so page refresh
  // doesn't restart the timer while server OTP is older.
  const deadlineRef = useRef<number>(0);

  useEffect(() => {
    const sentAt = Number(sessionStorage.getItem(STORAGE_KEYS.resetOtpSentAt));
    deadlineRef.current = (sentAt || Date.now()) + OTP_EXPIRY_SECONDS * 1000;
    setTimeLeft(
      Math.max(Math.ceil((deadlineRef.current - Date.now()) / 1000), 0)
    );

    const timer = setInterval(() => {
      setTimeLeft(
        Math.max(Math.ceil((deadlineRef.current - Date.now()) / 1000), 0)
      );
    }, 1000);

    return () => clearInterval(timer);
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

    // Missing token happens for unregistered emails (server never issued one).
    // Do NOT special-case a redirect — that would leak account existence.
    // Let the API respond through the ordinary error path instead.
    if (!email) {
      message.error("Session expired. Please start over from Forgot Password.");
      router.push(ROUTE_PATHS.forgotPassword);
      return;
    }

    setIsVerifying(true);

    try {
      await verifyOtp(email, otpValue, sessionStorage.getItem(STORAGE_KEYS.resetToken) || "");

      sessionStorage.setItem(STORAGE_KEYS.resetOtpVerified, "true");
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerifyAttempts);
      // The reset token is kept: it must be presented again at reset-password.
      message.success("OTP verified successfully.");
      router.replace(ROUTE_PATHS.resetPassword);
    } catch (error: any) {
      // Only the server knows the real attempt count — sync from its
      // "remaining" value; never guess locally when absent.
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

      // RATE_LIMITED is abuse-level traffic, not normal per-user exhaustion.
      // End the flow cleanly and redirect to login.
      if (error?.code === "RATE_LIMITED") {
        message.error(error.message || "Too many requests. Please try again later.");
        clearResetFlow();
        setTimeout(() => {
          router.replace(ROUTE_PATHS.login);
        }, 1000);
        return;
      }

      if (currentAttempts >= MAX_OTP_ATTEMPTS) {
        // Normal exhaustion: keep user here. Resend stays reachable and the
        // server resets the counter on a fresh send.
        message.error("Too many incorrect attempts. Please request a new OTP.");
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

      // Re-send mints a new single-use reset token (returned directly, no
      // emailed link). Store it and reset local verification state.
      if (typeof data?.token === "string" && data.token) {
        sessionStorage.setItem(STORAGE_KEYS.resetToken, data.token);
      }
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerifyAttempts);
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerified);
      setAttempts(0);

      // Server is source of truth for send request count; fall back to local
      // mirror only when it doesn't report.
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
      // Restart the countdown to match the fresh OTP that was just sent.
      deadlineRef.current = now + OTP_EXPIRY_SECONDS * 1000;
      setTimeLeft(OTP_EXPIRY_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(""));
      otpInputRef.current?.focusFirst();

      message.success("A new OTP has been sent to your email.");
    } catch (error: any) {
      if (error?.code === "RATE_LIMITED") {
        message.error(error.message || "Too many requests. Please try again later.");
        clearResetFlow();
        setTimeout(() => {
          router.replace(ROUTE_PATHS.login);
        }, 1000);
        return;
      }
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
        {isVerifying && <PageLoading />}
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
          ) : sendAttempts >= MAX_OTP_ATTEMPTS ? (
            <Text type="danger" className="otp-timer">
              Maximum OTP requests reached. Please try again later.
            </Text>
          ) : (
            <Text type="danger" className="otp-timer">
              OTP has expired.
            </Text>
          )}

          {attempts > 0 && !verificationBlocked && (
            <Text type="danger" className="otp-timer">
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
            disabled={isResending || isVerifying || !canResend}
            onClick={handleResend}
            style={{ marginTop: 18, color: (isResending || isVerifying || !canResend) ? "#b0b0b0" : "#54b226" }}
          >
            {isResending ? "Sending..." : "Resend OTP"}
          </Button>

          <Button
            type="link"
            block
            onClick={() => {
              // Leaving the flow for a non-auth page ends it.
              clearResetFlow();
              router.push(ROUTE_PATHS.home);
            }}
            style={{ color: "#54b226" }}
          >
            Back
          </Button>
        </Flex>
    </AuthCard>
  );
}
