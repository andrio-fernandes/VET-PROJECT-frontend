import { App, Button, Card, Flex, Input, Typography } from "antd";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

import { api } from "@/services/api";
import { API_ENDPOINTS, MAX_OTP_ATTEMPTS, OTP_EXPIRY_SECONDS, OTP_LENGTH, ROUTE_PATHS, STORAGE_KEYS } from "@/utils/constant";

const { Text } = Typography;

export default function OtpVerificationPage() {
  const router = useRouter();
  const { message } = App.useApp();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timeLeft, setTimeLeft] = useState<number>(OTP_EXPIRY_SECONDS);
  const [attempts, setAttempts] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const lastSubmitTime = useRef<number>(0);

  useEffect(() => {
    if (timeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();

    const pastedText = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pastedText) {
      return;
    }

    const newOtp = Array(OTP_LENGTH).fill("");
    pastedText.split("").forEach((digit, index) => {
      newOtp[index] = digit;
    });

    setOtp(newOtp);

    const nextIndex = Math.min(pastedText.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
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
      inputRefs.current[0]?.focus();
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

    if (!email) {
      message.error("Session expired. Please start over from Forgot Password.");
      router.push(ROUTE_PATHS.forgotPassword);
      return;
    }

    setIsVerifying(true);

    try {
      await api(API_ENDPOINTS.verifyOtp, {
        method: "POST",
        body: JSON.stringify({ email, otp: otpValue }),
      });

      sessionStorage.setItem(STORAGE_KEYS.resetOtp, otpValue);
      message.success("OTP verified successfully.");
      router.push(ROUTE_PATHS.resetPassword);
    } catch (error: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();

      if (newAttempts >= MAX_OTP_ATTEMPTS) {
        message.error("Maximum attempts reached. Verification is blocked.");
      } else {
        const remaining = MAX_OTP_ATTEMPTS - newAttempts;
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
      await api(API_ENDPOINTS.forgotPassword, {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      setOtp(Array(OTP_LENGTH).fill(""));
      setTimeLeft(OTP_EXPIRY_SECONDS);
      setAttempts(0);
      inputRefs.current[0]?.focus();
      message.success("A new OTP has been sent.");
    } catch (error: any) {
      message.error(error.message || "Failed to resend OTP. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const verificationBlocked = attempts >= MAX_OTP_ATTEMPTS;
  const expired = timeLeft <= 0;

  return (
    <Flex justify="center" align="center" className="auth-page">
      <Card className="auth-card">
        <Flex vertical align="center">
          <Text strong className="auth-card-title">
            Enter Your OTP
          </Text>

          <Text type="secondary" className="auth-card-description">
            Enter the 6-digit OTP sent to your registered email address.
          </Text>

          <Flex justify="center" gap={8} className="otp-inputs" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <Input
                key={index}
                id={`otp-${index}`}
                ref={(element) => {
                  inputRefs.current[index] = element?.input ?? null;
                }}
                maxLength={1}
                value={digit}
                inputMode="numeric"
                disabled={verificationBlocked || expired || isVerifying}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
              />
            ))}
          </Flex>

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
      </Card>
    </Flex>
  );
}
