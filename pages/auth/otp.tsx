import { App, Button, Flex, Typography } from "antd";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { forgotPassword, verifyOtp } from "@/services/authService";
import { MAX_OTP_ATTEMPTS, OTP_EXPIRY_SECONDS, OTP_LENGTH, OTP_REQUEST_WINDOW_SECONDS, ROUTE_PATHS, STORAGE_KEYS } from "@/constants";
import AuthCard from "@/components/AuthCard";
import PageLoading from "@/components/common/PageLoading";
import OtpInput, { type OtpInputHandle } from "@/components/OtpInput";
import { emptySubscribe } from "@/utils/input";
import { clearResetFlow } from "@/utils/resetFlow";

const { Text } = Typography;

export default function OtpVerificationPage() {
  const router = useRouter();
  const { message } = App.useApp();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timeLeft, setTimeLeft] = useState<number>(OTP_EXPIRY_SECONDS);
  // Hydrated from sessionStorage in an effect, NOT in the useState initializer:
  // a render-phase sessionStorage read would diverge from the server-rendered
  // markup and break hydration.
  const [attempts, setAttempts] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);

  // Only the email is required to enter. The reset token is returned ONLY for
  // registered accounts, so gating on it here would make account existence
  // observable through navigation (registered -> OTP form, unregistered ->
  // bounced back). Keeping the gate email-only means Entering the OTP page
  // looks identical for both cases; a missing token surfaces through the
  // generic verify/resend error, never through a redirect.
  const canAccess = useSyncExternalStore(
    emptySubscribe,
    () => Boolean(sessionStorage.getItem(STORAGE_KEYS.resetEmail)),
    () => false,
  );

  const otpInputRef = useRef<OtpInputHandle>(null);
  const lastSubmitTime = useRef<number>(0);

  const expired = timeLeft <= 0;
  const verificationBlocked = attempts >= MAX_OTP_ATTEMPTS;

  // Resend is only available once the OTP has fully expired. The server
  // supports resends at any time, but the UI blocks it until expiry to avoid
  // confusion from mid-session token rotation.
  const canResend = expired;

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

  // If the user already exhausted their attempts in a previous visit, they
  // stay here: the Resend button lets them request a fresh OTP (which also
  // resets the per-user attempt counter server-side), so there is nothing to
  // be gained by forcibly leaving the page.

  // Restore a previously-exhausted attempt count after a refresh so the UI is
  // still accurate. Deferred via a microtask so the setState is not called
  // synchronously within the effect body (avoids the React Compiler rule).
  useEffect(() => {
    const stored =
      Number(sessionStorage.getItem(STORAGE_KEYS.resetOtpVerifyAttempts)) || 0;
    if (stored > 0) {
      queueMicrotask(() => {
        setAttempts(stored);
      });
    }
  }, []);

  // The countdown targets an absolute deadline timestamp so a single
  // interval computes the remaining seconds instead of being torn down and
  // recreated every second. The deadline is aligned with the actual send time
  // so refreshing the page does not restart the timer while the server-side
  // OTP is already older; when no stored send time exists, fall back to now so
  // the timer still starts fresh. The interval is created once and always
  // cleaned up on unmount (resends just move deadlineRef, keeping the ticker).
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

    // A missing token happens for unregistered emails (the server never issued
    // one). Do NOT special-case a redirect here - that would make account
    // existence observable. Let the API respond and show the message through
    // the ordinary error path below, identically for everyone.
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

      // The flood backstop (RATE_LIMITED) is abuse-level traffic, not the
      // normal per-user exhaustion. There is nothing the user was doing that
      // should have hit it, so end the flow cleanly and start over from login.
      if (error?.code === "RATE_LIMITED") {
        message.error(error.message || "Too many requests. Please try again later.");
        clearResetFlow();
        setTimeout(() => {
          router.replace(ROUTE_PATHS.login);
        }, 1000);
        return;
      }

      if (currentAttempts >= MAX_OTP_ATTEMPTS) {
        // Normal exhaustion: keep the user on this page. Resend stays
        // reachable and the server resets the per-user attempt counter on a
        // fresh send, so guidance to request a new OTP is always actionable -
        // no "wait 5 minutes" dead end.
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

      // A re-send mints a brand new single-use reset token which the server
      // returns directly (no emailed link). Store it and reset the local
      // verification state so the user can keep verifying on this page.
      if (typeof data?.token === "string" && data.token) {
        sessionStorage.setItem(STORAGE_KEYS.resetToken, data.token);
      }
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerifyAttempts);
      sessionStorage.removeItem(STORAGE_KEYS.resetOtpVerified);
      setAttempts(0);

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
            style={{ marginTop: 18, color: "#54b226" }}
          >
            {isResending ? "Sending..." : "Resend OTP"}
          </Button>

          <Button
            type="link"
            block
            onClick={() => {
              // Leaving the flow for a non-auth page ends it, so the next
              // visit to Forgot Password starts clean.
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
